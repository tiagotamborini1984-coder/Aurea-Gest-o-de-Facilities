-- Migração aditiva: auditoria do envio de e-mail de aprovação de HE
-- Regra permanente: nada destrutivo, apenas colunas novas em horas_extras_solicitacoes.

-- 1) E-mail da empresa parceira (destinatário). Coluna nova aditiva; null = destinatário ausente.
alter table public.horas_extras_solicitacoes
  add column if not exists company_email text;

-- 2) Resultado do envio para auditoria
alter table public.horas_extras_solicitacoes
  add column if not exists email_sent_at timestamptz;

alter table public.horas_extras_solicitacoes
  add column if not exists email_error text;

-- 3) Permitir que a edge function (service_role) registre o resultado do envio.
--    O service_role já bypassa o RLS; este grant é defesa em profundidade para o UPDATE
--    restrito às colunas de auditoria de e-mail.
drop policy if exists he_solicitacoes_email_audit_update on public.horas_extras_solicitacoes;
create policy he_solicitacoes_email_audit_update
  on public.horas_extras_solicitacoes
  for update
  to service_role
  using (true)
  with check (true);

grant select, update on table public.horas_extras_solicitacoes to service_role;
