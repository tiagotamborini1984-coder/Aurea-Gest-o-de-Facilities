-- Clean up overlapping SELECT policies on audit_executions
-- and create a single, simple policy that ensures all authenticated users
-- can see audit executions for their client's audits

DROP POLICY IF EXISTS "auth_select_audit_executions" ON public.audit_executions;
DROP POLICY IF EXISTS "authenticated_select_audit_executions" ON public.audit_executions;
DROP POLICY IF EXISTS "ensure_select_audit_executions" ON public.audit_executions;
DROP POLICY IF EXISTS "plant_isolation_audit_executions_select" ON public.audit_executions;
DROP POLICY IF EXISTS "tenant_isolation_audit_executions_select" ON public.audit_executions;

-- Single SELECT policy: Master sees all; others see executions linked to their client's audits
CREATE POLICY "audit_executions_select_all" ON public.audit_executions
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'Master'
    OR EXISTS (
      SELECT 1 FROM public.audits a
      WHERE a.id = audit_executions.audit_id
      AND a.client_id = get_user_client_id()
    )
  );
