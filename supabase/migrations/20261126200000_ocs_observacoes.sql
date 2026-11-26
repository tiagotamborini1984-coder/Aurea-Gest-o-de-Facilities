-- ============================================================================
-- Módulo OCS — Observação Comportamental de Segurança (Gestão de Segurança)
-- Tabelas: ocs_observacoes (cartão COC) e ocs_acoes (ações geradas)
-- Número sequencial POR CLIENTE (NNNN) + ano, no padrão task_number/maintenance_tickets.
-- FKs para profiles são nullable + ON DELETE SET NULL (regra de exclusão de usuário).
-- ============================================================================
create table if not exists public.ocs_observacoes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  number integer not null,
  number_label text,
  observador uuid references public.profiles(id) on delete set null,
  data_observacao date not null default current_date,
  turno text,
  local text,
  atividade text,
  observado_name text,
  respostas jsonb not null default '[]'::jsonb,
  status text not null default 'Em elaboração',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, number)
);

create table if not exists public.ocs_acoes (
  id uuid primary key default gen_random_uuid(),
  ocs_id uuid not null references public.ocs_observacoes(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  descricao text not null,
  responsavel_id uuid references public.profiles(id) on delete set null,
  prazo date,
  status text not null default 'Pendente',
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ocs_observacoes_client on public.ocs_observacoes (client_id);
create index if not exists idx_ocs_observacoes_plant on public.ocs_observacoes (plant_id);
create index if not exists idx_ocs_acoes_ocs on public.ocs_acoes (ocs_id);

-- ---------------------------------------------------------------------------
-- Numeração sequencial por cliente: ocs_observacoes.number = 1, 2, 3… por
-- client_id (mesmo padrão de tasks_client_id_task_number_key). Rótulo exibido
-- OCS <number>/<ano>.
-- ---------------------------------------------------------------------------
create or replace function public.next_ocs_number(p_client_id uuid)
returns integer
language plpgsql
as $$
declare
  v_max integer;
begin
  select coalesce(max(number), 0) + 1
    into v_max
    from public.ocs_observacoes
   where client_id = p_client_id;
  return v_max;
end;
$$;

create or replace function public.set_ocs_number()
returns trigger
language plpgsql
as $$
declare
  v_client uuid;
begin
  if new.number is null or new.number <= 0 then
    v_client := new.client_id;
    if v_client is null then
      raise exception 'OCS exige client_id';
    end if;
    select coalesce(max(o.number), 0) + 1 into new.number
      from public.ocs_observacoes o
     where o.client_id = v_client;
  end if;
  if new.number_label is null or new.number_label = '' then
    new.number_label := 'OCS ' || new.number::text || '/' || to_char(coalesce(new.data_observacao, current_date), 'YYYY');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_ocs_number on public.ocs_observacoes;
create trigger trg_set_ocs_number
  before insert on public.ocs_observacoes
  for each row execute function public.set_ocs_number();

create or replace function public.set_ocs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ocs_observacoes_updated_at on public.ocs_observacoes;
create trigger trg_ocs_observacoes_updated_at
  before update on public.ocs_observacoes
  for each row execute function public.set_ocs_updated_at();

-- Guard de deleção em massa (padrão das 44 tabelas críticas)
drop trigger if exists trg_guard_mass_delete_ocs_observacoes on public.ocs_observacoes;
create trigger trg_guard_mass_delete_ocs_observacoes
  before delete on public.ocs_observacoes
  for each statement execute function public.guard_prevent_mass_delete();

-- ---------------------------------------------------------------------------
-- RLS por tenant (get_user_client_id(); Master/Admin veem tudo)
-- ---------------------------------------------------------------------------
alter table public.ocs_observacoes enable row level security;
alter table public.ocs_acoes enable row level security;

create policy tenant_isolation_ocs_observacoes_select
  on public.ocs_observacoes for select
  to authenticated
  using (
    client_id = public.get_user_client_id()
    or public.get_user_role() in ('Master', 'Administrador')
  );

create policy tenant_isolation_ocs_observacoes_insert
  on public.ocs_observacoes for insert
  to authenticated
  with check (
    client_id = public.get_user_client_id()
    or public.get_user_role() in ('Master', 'Administrador')
  );

create policy tenant_isolation_ocs_observacoes_update
  on public.ocs_observacoes for update
  to authenticated
  using (
    client_id = public.get_user_client_id()
    or public.get_user_role() in ('Master', 'Administrador')
  )
  with check (
    client_id = public.get_user_client_id()
    or public.get_user_role() in ('Master', 'Administrador')
  );

create policy tenant_isolation_ocs_observacoes_delete
  on public.ocs_observacoes for delete
  to authenticated
  using (
    client_id = public.get_user_client_id()
    or public.get_user_role() in ('Master', 'Administrador')
  );

create policy tenant_isolation_ocs_acoes_select
  on public.ocs_acoes for select
  to authenticated
  using (
    client_id = public.get_user_client_id()
    or public.get_user_role() in ('Master', 'Administrador')
    or exists (
      select 1 from public.ocs_observacoes o
       where o.id = ocs_id
         and (o.client_id = public.get_user_client_id()
              or public.get_user_role() in ('Master', 'Administrador'))
    )
  );

create policy tenant_isolation_ocs_acoes_insert
  on public.ocs_acoes for insert
  to authenticated
  with check (
    client_id = public.get_user_client_id()
    or public.get_user_role() in ('Master', 'Administrador')
    or exists (
      select 1 from public.ocs_observacoes o
       where o.id = ocs_id
         and (o.client_id = public.get_user_client_id()
              or public.get_user_role() in ('Master', 'Administrador'))
    )
  );

create policy tenant_isolation_ocs_acoes_update
  on public.ocs_acoes for update
  to authenticated
  using (
    client_id = public.get_user_client_id()
    or public.get_user_role() in ('Master', 'Administrador')
    or exists (
      select 1 from public.ocs_observacoes o
       where o.id = ocs_id
         and (o.client_id = public.get_user_client_id()
              or public.get_user_role() in ('Master', 'Administrador'))
    )
  )
  with check (
    client_id = public.get_user_client_id()
    or public.get_user_role() in ('Master', 'Administrador')
  );

create policy tenant_isolation_ocs_acoes_delete
  on public.ocs_acoes for delete
  to authenticated
  using (
    client_id = public.get_user_client_id()
    or public.get_user_role() in ('Master', 'Administrador')
    or exists (
      select 1 from public.ocs_observacoes o
       where o.id = ocs_id
         and (o.client_id = public.get_user_client_id()
              or public.get_user_role() in ('Master', 'Administrador'))
    )
  );
