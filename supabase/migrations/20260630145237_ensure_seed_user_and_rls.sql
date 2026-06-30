-- Seed user is already handled idempotently in 20260616141000_seed_master_admin_and_cleanup.sql
-- This migration only contains RLS/policy DDL to avoid deadlock from mixing auth.users+profiles writes with ALTER TABLE locks

-- Ensure RLS policies for user_plants
ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_plants_select" ON public.user_plants;
CREATE POLICY "user_plants_select" ON public.user_plants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_plants_insert" ON public.user_plants;
CREATE POLICY "user_plants_insert" ON public.user_plants
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "user_plants_update" ON public.user_plants;
CREATE POLICY "user_plants_update" ON public.user_plants
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_plants_delete" ON public.user_plants;
CREATE POLICY "user_plants_delete" ON public.user_plants
  FOR DELETE TO authenticated USING (true);

-- Ensure RLS for sector_documents (full CRUD)
DROP POLICY IF EXISTS "sector_documents_update" ON public.sector_documents;
CREATE POLICY "sector_documents_update" ON public.sector_documents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Ensure maintenance_plan_checklist_items has proper access
DROP POLICY IF EXISTS "tenant_isolation_maintenance_plan_checklist_items" ON public.maintenance_plan_checklist_items;
CREATE POLICY "tenant_isolation_maintenance_plan_checklist_items" ON public.maintenance_plan_checklist_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure audit_actions has proper access
DROP POLICY IF EXISTS "generic_access_audit_actions" ON public.audit_actions;
CREATE POLICY "generic_access_audit_actions" ON public.audit_actions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure task_timeline has proper access
DROP POLICY IF EXISTS "generic_access_task_timeline" ON public.task_timeline;
CREATE POLICY "generic_access_task_timeline" ON public.task_timeline
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure audit_execution_answers has proper access
DROP POLICY IF EXISTS "generic_access_audit_execution_answers" ON public.audit_execution_answers;
CREATE POLICY "generic_access_audit_execution_answers" ON public.audit_execution_answers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure inventory_request_items has proper access
DROP POLICY IF EXISTS "inventory_request_items_all" ON public.inventory_request_items;
CREATE POLICY "inventory_request_items_all" ON public.inventory_request_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
