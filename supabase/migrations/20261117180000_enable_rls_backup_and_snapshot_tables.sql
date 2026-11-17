-- v-correção do alerta Supabase "Table publicly accessible — RLS is not enabled"
-- Tabelas de backup/snapshot criadas por migrações anteriores ficaram sem RLS:
--   backup_delete_user_gleiccy_20261107, backup_profiles_menus_dedupe,
--   backup_tasks_due_date_20261028 (v1/v2/v3), snapshot_email_swap_20261112
-- Padrão idêntico ao das tabelas snapshot_* (v0.0.1857): policy snapshot_read_auth
-- FOR SELECT TO authenticated, USING get_user_role() IN ('Master','Administrador').
-- Nenhum dado é apagado ou alterado — só RLS + policy.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND (c.relname LIKE 'backup_%' OR c.relname LIKE 'snapshot_%')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.table_name);

    EXECUTE format('DROP POLICY IF EXISTS snapshot_read_auth ON public.%I', t.table_name);
    EXECUTE format(
      'CREATE POLICY snapshot_read_auth ON public.%I FOR SELECT TO authenticated USING (get_user_role() = ANY (ARRAY[''Master''::text, ''Administrador''::text]))',
      t.table_name
    );

    RAISE NOTICE 'RLS habilitado em %', t.table_name;
  END LOOP;
END $$;
