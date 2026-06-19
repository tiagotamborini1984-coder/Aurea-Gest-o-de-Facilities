DO $$
BEGIN
  DROP POLICY IF EXISTS "plant_isolation_audit_executions_select" ON public.audit_executions;
  
  CREATE POLICY "plant_isolation_audit_executions_select" ON public.audit_executions
    FOR SELECT TO authenticated USING (
      public.is_plant_authorized(plant_id)
    );
END $$;
