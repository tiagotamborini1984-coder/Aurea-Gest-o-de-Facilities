-- Papel Master: promoção do dono do sistema (Tiago).
--
-- Contexto (verificado em produção):
--   - profiles.client_id já é nullable e não há CHECK sobre role (role é text),
--     então nada de estrutura a alterar — apenas DML idempotente.
--   - O papel Master já é reconhecido em todo o sistema: policies RLS
--     (get_user_role() = 'Master'), trigger guard_profile_self_update (só
--     Master atribui Master), edge function create-user (role 'Master' exige
--     criador Master; client_id null) e telas (seletor de empresa no AppHeader,
--     use-crud, /usuarios).
--
-- Regra permanente: backup interno ANTES de qualquer mudança em dados de
-- produção; nada é apagado — apenas UPDATE na única linha do Tiago.

-- 1) Backup interno da linha antes da promoção
create table if not exists public.snapshot_master_promotion_20261112 as
  select * from public.profiles where email = 'lptamborini@hotmail.com';

alter table public.snapshot_master_promotion_20261112 enable row level security;

drop policy if exists snapshot_master_promotion_20261112_select on public.snapshot_master_promotion_20261112;
create policy snapshot_master_promotion_20261112_select
  on public.snapshot_master_promotion_20261112
  for select to authenticated
  using (get_user_role() in ('Master', 'Administrador'));

-- 2) Promoção idempotente: só toca a linha do Tiago e só quando ainda não
--    estiver no estado final (role Master, sem vínculo a empresa).
update public.profiles
   set role = 'Master',
       client_id = null
 where email = 'lptamborini@hotmail.com'
   and (role is distinct from 'Master' or client_id is not null);
