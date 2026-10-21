-- Backup das auditorias e execuções do lote artificial rebuild_20261020
CREATE TABLE IF NOT EXISTS public.backup_rebuild_audits_20261021 AS
SELECT * FROM public.audits WHERE reconstruction_batch = 'rebuild_20261020';

CREATE TABLE IF NOT EXISTS public.backup_rebuild_audit_executions_20261021 AS
SELECT * FROM public.audit_executions WHERE reconstruction_batch = 'rebuild_20261020';

-- RLS para as tabelas de backup (apenas administradores/sistema)
ALTER TABLE public.backup_rebuild_audits_20261021 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_rebuild_audit_executions_20261021 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_backup_audits_select" ON public.backup_rebuild_audits_20261021;
CREATE POLICY "admin_backup_audits_select" ON public.backup_rebuild_audits_20261021
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_backup_executions_select" ON public.backup_rebuild_audit_executions_20261021;
CREATE POLICY "admin_backup_executions_select" ON public.backup_rebuild_audit_executions_20261021
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
