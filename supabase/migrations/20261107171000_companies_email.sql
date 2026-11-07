-- Campo de e-mail no cadastro da Empresa Parceira (módulo Terceiros).
-- Mudança ADITIVA: apenas cria a coluna, não toca em dados existentes.
-- Este e-mail passa a ser o destinatário principal do e-mail de aprovação de HE.
alter table public.companies
  add column if not exists email text;

-- Comment: destinatário principal do e-mail de aprovação de Horas Extras
comment on column public.companies.email is
  'E-mail da empresa parceira — usado como destinatário do e-mail de aprovação de Horas Extras';
