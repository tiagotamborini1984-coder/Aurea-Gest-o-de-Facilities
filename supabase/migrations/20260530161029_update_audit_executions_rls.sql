-- Drop the existing ALL policy to split it into specific operations
DROP POLICY IF EXISTS "plant_isolation_audit_executions" ON public.audit_executions;

-- 1. SELECT policy
CREATE POLICY "plant_isolation_audit_executions_select" ON public.audit_executions
  FOR SELECT TO authenticated
  USING (is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1 FROM audits WHERE ((audits.id = audit_executions.audit_id) AND (audits.client_id = get_user_client_id()))))));

-- 2. INSERT policy
CREATE POLICY "plant_isolation_audit_executions_insert" ON public.audit_executions
  FOR INSERT TO authenticated
  WITH CHECK (is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1 FROM audits WHERE ((audits.id = audit_executions.audit_id) AND (audits.client_id = get_user_client_id()))))));

-- 3. UPDATE policy
CREATE POLICY "plant_isolation_audit_executions_update" ON public.audit_executions
  FOR UPDATE TO authenticated
  USING (is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1 FROM audits WHERE ((audits.id = audit_executions.audit_id) AND (audits.client_id = get_user_client_id()))))))
  WITH CHECK (is_plant_authorized(plant_id) AND ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1 FROM audits WHERE ((audits.id = audit_executions.audit_id) AND (audits.client_id = get_user_client_id()))))));

-- 4. DELETE policy (restricted to Administrador and Master roles)
CREATE POLICY "plant_isolation_audit_executions_delete" ON public.audit_executions
  FOR DELETE TO authenticated
  USING (
    get_user_role() IN ('Master', 'Administrador') AND
    is_plant_authorized(plant_id) AND 
    ((get_user_role() = 'Master'::text) OR (EXISTS ( SELECT 1 FROM audits WHERE ((audits.id = audit_executions.audit_id) AND (audits.client_id = get_user_client_id())))))
  );
