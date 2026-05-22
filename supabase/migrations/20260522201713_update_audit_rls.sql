-- Fix RLS for audit_executions to include client_id check
DROP POLICY IF EXISTS "plant_isolation_audit_executions" ON public.audit_executions;

CREATE POLICY "plant_isolation_audit_executions" ON public.audit_executions
  FOR ALL TO authenticated
  USING (
    is_plant_authorized(plant_id) 
    AND (
      (get_user_role() = 'Master') OR 
      (EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_executions.audit_id AND audits.client_id = get_user_client_id()))
    )
  )
  WITH CHECK (
    is_plant_authorized(plant_id) 
    AND (
      (get_user_role() = 'Master') OR 
      (EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_executions.audit_id AND audits.client_id = get_user_client_id()))
    )
  );

-- Fix RLS for audit_actions (currently generic true)
DROP POLICY IF EXISTS "generic_access_audit_actions" ON public.audit_actions;
CREATE POLICY "generic_access_audit_actions" ON public.audit_actions
  FOR ALL TO authenticated
  USING (
    (get_user_role() = 'Master') OR 
    (EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_actions.audit_id AND audits.client_id = get_user_client_id()))
  )
  WITH CHECK (
    (get_user_role() = 'Master') OR 
    (EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_actions.audit_id AND audits.client_id = get_user_client_id()))
  );

-- Fix RLS for audit_execution_answers
DROP POLICY IF EXISTS "generic_access_audit_execution_answers" ON public.audit_execution_answers;
CREATE POLICY "generic_access_audit_execution_answers" ON public.audit_execution_answers
  FOR ALL TO authenticated
  USING (
    (get_user_role() = 'Master') OR 
    (EXISTS (
      SELECT 1 FROM public.audit_executions e
      JOIN public.audits a ON a.id = e.audit_id
      WHERE e.id = audit_execution_answers.execution_id AND a.client_id = get_user_client_id()
    ))
  )
  WITH CHECK (
    (get_user_role() = 'Master') OR 
    (EXISTS (
      SELECT 1 FROM public.audit_executions e
      JOIN public.audits a ON a.id = e.audit_id
      WHERE e.id = audit_execution_answers.execution_id AND a.client_id = get_user_client_id()
    ))
  );
