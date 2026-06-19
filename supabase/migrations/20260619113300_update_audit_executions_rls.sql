DO $$
BEGIN
  -- Create or replace a SELECT policy for audit_executions that explicitly allows
  -- authenticated users to read records matching their client_id and authorized plants.
  DROP POLICY IF EXISTS "tenant_isolation_audit_executions_select" ON public.audit_executions;
  
  CREATE POLICY "tenant_isolation_audit_executions_select" ON public.audit_executions
    FOR SELECT TO authenticated
    USING (
      is_plant_authorized(plant_id)
      OR
      EXISTS (
        SELECT 1 FROM public.plants p
        JOIN public.profiles pr ON pr.client_id = p.client_id
        WHERE p.id = audit_executions.plant_id
        AND pr.id = auth.uid()
        AND pr.role IN ('Master', 'Administrador')
      )
    );
END $$;
