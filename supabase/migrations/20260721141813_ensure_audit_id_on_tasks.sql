-- Backfill audit_id in tasks from audit_executions where missing
UPDATE public.tasks t
SET audit_id = ae.audit_id
FROM public.audit_executions ae
WHERE t.id = ae.task_id
  AND t.audit_id IS NULL;

-- Create index on tasks(audit_id) for query performance
CREATE INDEX IF NOT EXISTS idx_tasks_audit_id ON public.tasks(audit_id);

-- Function to propagate audit_id from audit_executions to linked tasks
CREATE OR REPLACE FUNCTION public.ensure_task_audit_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.task_id IS NOT NULL AND NEW.audit_id IS NOT NULL THEN
    UPDATE public.tasks
    SET audit_id = NEW.audit_id
    WHERE id = NEW.task_id
      AND audit_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_task_audit_id_trigger ON public.audit_executions;
CREATE TRIGGER ensure_task_audit_id_trigger
  AFTER INSERT OR UPDATE OF task_id ON public.audit_executions
  FOR EACH ROW EXECUTE FUNCTION public.ensure_task_audit_id();

-- Safety net: set audit_id on task insert if it can be inferred
CREATE OR REPLACE FUNCTION public.set_task_audit_id_if_missing()
RETURNS trigger AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  IF NEW.audit_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT ae.audit_id INTO v_audit_id
  FROM public.audit_executions ae
  WHERE ae.task_id = NEW.id
  LIMIT 1;

  IF v_audit_id IS NOT NULL THEN
    NEW.audit_id := v_audit_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_task_audit_id_if_missing_trigger ON public.tasks;
CREATE TRIGGER set_task_audit_id_if_missing_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_task_audit_id_if_missing();

-- RLS: Ensure authenticated users can select tasks filtered by audit_id and client_id
DROP POLICY IF EXISTS "tasks_select_for_audit" ON public.tasks;
CREATE POLICY "tasks_select_for_audit" ON public.tasks
  FOR SELECT TO authenticated USING (
    get_user_role() = 'Master' OR client_id = get_user_client_id()
  );

DROP POLICY IF EXISTS "tasks_insert_for_audit" ON public.tasks;
CREATE POLICY "tasks_insert_for_audit" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (
    get_user_role() = 'Master' OR client_id = get_user_client_id()
  );

DROP POLICY IF EXISTS "tasks_update_for_audit" ON public.tasks;
CREATE POLICY "tasks_update_for_audit" ON public.tasks
  FOR UPDATE TO authenticated USING (
    get_user_role() = 'Master' OR client_id = get_user_client_id()
  ) WITH CHECK (
    get_user_role() = 'Master' OR client_id = get_user_client_id()
  );

DROP POLICY IF EXISTS "tasks_delete_for_audit" ON public.tasks;
CREATE POLICY "tasks_delete_for_audit" ON public.tasks
  FOR DELETE TO authenticated USING (
    get_user_role() = 'Master' OR client_id = get_user_client_id()
  );
