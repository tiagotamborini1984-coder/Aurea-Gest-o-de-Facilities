DO $$
BEGIN
  -- We drop the existing policy and recreate it to safely ensure total isolation boundaries
  DROP POLICY IF EXISTS "plant_isolation_audit_assignments" ON public.audit_assignments;
  DROP POLICY IF EXISTS "tenant_and_plant_isolation_audit_assignments" ON public.audit_assignments;
  
  -- Create a comprehensive policy covering client_id isolation (via audits) and plant authorization
  CREATE POLICY "tenant_and_plant_isolation_audit_assignments" ON public.audit_assignments
    FOR ALL TO authenticated
    USING (
      is_plant_authorized(plant_id) AND 
      (
        (get_user_role() = 'Master') OR
        EXISTS (
          SELECT 1 FROM public.audits 
          WHERE audits.id = audit_assignments.audit_id 
          AND audits.client_id = get_user_client_id()
        )
      )
    )
    WITH CHECK (
      is_plant_authorized(plant_id) AND 
      (
        (get_user_role() = 'Master') OR
        EXISTS (
          SELECT 1 FROM public.audits 
          WHERE audits.id = audit_assignments.audit_id 
          AND audits.client_id = get_user_client_id()
        )
      )
    );
END $$;
