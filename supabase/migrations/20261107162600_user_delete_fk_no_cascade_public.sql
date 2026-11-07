-- Objetivo: garantir que a exclusão de usuários NUNCA apague registros históricos
-- nem seja bloqueada por FKs restritivas, independentemente de ordem de migração.
--
-- Regras do usuário (permanentes): ao excluir um usuário, os registros vinculados
-- PERMANECEM no sistema; apenas deixam de apontar para ele (SET NULL). Nada é apagado.
--
-- 1) Converte TODAS as FKs do schema public com ON DELETE CASCADE (que apagariam
--    registros em cadeia) para ON DELETE SET NULL. Tabelas de infraestrutura do Supabase
--    (auth.*) e a própria public.profiles permanecem com CASCADE (comportamento interno
--    do GoTrue — a credencial é removida junto com o usuário).
-- 2) Torna as colunas de referência nullable onde ainda são NOT NULL, para que o SET NULL
--    seja possível sem apagar o registro (ex.: tasks.requester_id, tasks.assignee_id,
--    task_timeline.user_id).

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid IN ('auth.users'::regclass, 'public.profiles'::regclass)
      AND conrelid::regclass::text LIKE 'public.%'
      AND pg_constraint.confdeltype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I %s',
      r.tbl, r.conname, replace(r.def, 'ON DELETE CASCADE', 'ON DELETE SET NULL')
    );
  END LOOP;
END $$;

-- Colunas NOT NULL que referenciam o usuário precisam permitir NULL para o SET NULL funcionar
ALTER TABLE public.tasks ALTER COLUMN requester_id DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN assignee_id DROP NOT NULL;
ALTER TABLE public.task_timeline ALTER COLUMN user_id DROP NOT NULL;
