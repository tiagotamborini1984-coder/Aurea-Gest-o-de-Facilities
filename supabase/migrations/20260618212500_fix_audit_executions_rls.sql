-- Normalize status for completed audits to ensure they appear in the UI
DO $$
BEGIN
  UPDATE public.audit_executions 
  SET status = 'Finalizado' 
  WHERE status IN ('Finalizada', 'Concluído', 'Concluida', 'concluded', 'finalized', 'submitted');
END $$;

-- Refresh tasks select policy to ensure it properly filters by client and plant
DROP POLICY IF EXISTS "tenant_isolation_tasks_select" ON public.tasks;
CREATE POLICY "tenant_isolation_tasks_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    client_id = public.get_user_client_id() AND
    plant_id IN (
      SELECT jsonb_array_elements_text(public.get_user_authorized_plants())::uuid
    )
  );

-- Refresh audit_executions select policy to ensure it properly filters by plant
DROP POLICY IF EXISTS "plant_isolation_audit_executions_select" ON public.audit_executions;
CREATE POLICY "plant_isolation_audit_executions_select" ON public.audit_executions
  FOR SELECT TO authenticated
  USING (
    plant_id IN (
      SELECT jsonb_array_elements_text(public.get_user_authorized_plants())::uuid
    )
  );
