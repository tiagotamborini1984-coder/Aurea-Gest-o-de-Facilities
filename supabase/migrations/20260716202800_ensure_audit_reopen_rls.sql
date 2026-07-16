-- Ensure RLS policies allow authenticated users to update audit_executions and tasks in pending state
-- This supports reopening audits and editing them while pending

-- Ensure audit_executions can be updated by authenticated users (plant-isolated)
DROP POLICY IF EXISTS "auth_update_audit_executions_pending" ON public.audit_executions;
CREATE POLICY "auth_update_audit_executions_pending" ON public.audit_executions
  FOR UPDATE TO authenticated
  USING (
    is_plant_authorized(plant_id)
    AND (
      (get_user_role() = 'Master')
      OR (
        EXISTS (
          SELECT 1 FROM public.audits
          WHERE audits.id = audit_executions.audit_id
            AND audits.client_id = get_user_client_id()
        )
      )
    )
  )
  WITH CHECK (
    is_plant_authorized(plant_id)
    AND (
      (get_user_role() = 'Master')
      OR (
        EXISTS (
          SELECT 1 FROM public.audits
          WHERE audits.id = audit_executions.audit_id
            AND audits.client_id = get_user_client_id()
        )
      )
    )
  );

-- Ensure audit_execution_answers can be inserted/updated/deleted by authenticated users
DROP POLICY IF EXISTS "auth_insert_audit_execution_answers_pending" ON public.audit_execution_answers;
CREATE POLICY "auth_insert_audit_execution_answers_pending" ON public.audit_execution_answers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audit_executions e
      JOIN public.audits a ON a.id = e.audit_id
      WHERE e.id = audit_execution_answers.execution_id
        AND a.client_id = get_user_client_id()
    )
    OR get_user_role() = 'Master'
  );

DROP POLICY IF EXISTS "auth_update_audit_execution_answers_pending" ON public.audit_execution_answers;
CREATE POLICY "auth_update_audit_execution_answers_pending" ON public.audit_execution_answers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_executions e
      JOIN public.audits a ON a.id = e.audit_id
      WHERE e.id = audit_execution_answers.execution_id
        AND a.client_id = get_user_client_id()
    )
    OR get_user_role() = 'Master'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audit_executions e
      JOIN public.audits a ON a.id = e.audit_id
      WHERE e.id = audit_execution_answers.execution_id
        AND a.client_id = get_user_client_id()
    )
    OR get_user_role() = 'Master'
  );

DROP POLICY IF EXISTS "auth_delete_audit_execution_answers_pending" ON public.audit_execution_answers;
CREATE POLICY "auth_delete_audit_execution_answers_pending" ON public.audit_execution_answers
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.audit_executions e
      JOIN public.audits a ON a.id = e.audit_id
      WHERE e.id = audit_execution_answers.execution_id
        AND a.client_id = get_user_client_id()
    )
    OR get_user_role() = 'Master'
  );

-- Ensure tasks can be updated by authenticated users when in non-terminal state
DROP POLICY IF EXISTS "auth_update_tasks_pending" ON public.tasks;
CREATE POLICY "auth_update_tasks_pending" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    (get_user_role() = 'Master')
    OR (
      client_id = get_user_client_id()
      AND (
        requester_id = auth.uid()
        OR assignee_id = auth.uid()
        OR participants_ids @> ARRAY[auth.uid()]
      )
    )
  )
  WITH CHECK (
    (get_user_role() = 'Master')
    OR (
      client_id = get_user_client_id()
      AND (
        requester_id = auth.uid()
        OR assignee_id = auth.uid()
        OR participants_ids @> ARRAY[auth.uid()]
      )
    )
  );
