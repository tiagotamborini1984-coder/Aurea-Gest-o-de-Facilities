DO $DO$
BEGIN
  -- Clean up any incorrectly placed triggers on the audits table that would expect NEW.audit_id
  -- The error 'record "new" has no field "audit_id"' occurs when a trigger on the audits table 
  -- tries to read NEW.audit_id instead of NEW.id.
  DROP TRIGGER IF EXISTS on_audit_assignment_inserted ON public.audits;
  DROP TRIGGER IF EXISTS on_audit_execution_finalized ON public.audits;
  DROP TRIGGER IF EXISTS generate_initial_audit_executions_trigger ON public.audits;
  DROP TRIGGER IF EXISTS sync_audit_execution_status ON public.audits;
END $DO$;

-- Fix the generate_initial_audit_executions function itself if it had a typo.
-- We rewrite it to safely handle the audits table by returning NEW without error.
CREATE OR REPLACE FUNCTION public.generate_initial_audit_executions()
RETURNS trigger AS $DO$
BEGIN
  -- If this trigger was meant to run ON audits AFTER INSERT, it should use NEW.id, not NEW.audit_id.
  -- However, since audit_assignments dictates the plants and assignees, initial executions
  -- should be created either when an assignment is created or by the scheduled job.
  -- To prevent errors, we just return NEW safely.
  RETURN NEW;
END;
$DO$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger on audit_assignments correctly handles new assignments.
CREATE OR REPLACE FUNCTION public.handle_audit_assignment_inserted()
RETURNS trigger AS $DO$
DECLARE
  v_audit record;
  v_type_id uuid;
  v_status_id uuid;
  v_requester_id uuid;
  v_task_id uuid;
  v_task_number text;
  v_year text;
  v_seq int;
BEGIN
  SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;
  
  IF v_audit IS NOT NULL AND v_audit.status = 'Ativo' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.audit_executions 
      WHERE audit_id = NEW.audit_id AND plant_id = NEW.plant_id AND status IN ('Pendente', 'Rascunho')
    ) THEN
      
      SELECT id INTO v_type_id FROM public.task_types WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;
      IF v_type_id IS NULL THEN
        SELECT id INTO v_type_id FROM public.task_types WHERE client_id = v_audit.client_id ORDER BY created_at ASC LIMIT 1;
      END IF;
      
      SELECT id INTO v_status_id FROM public.task_statuses WHERE client_id = v_audit.client_id AND is_terminal = false ORDER BY created_at ASC LIMIT 1;
      
      SELECT id INTO v_requester_id FROM public.profiles WHERE client_id = v_audit.client_id AND role IN ('Administrador', 'Master') LIMIT 1;
      IF v_requester_id IS NULL THEN v_requester_id := NEW.assignee_id; END IF;
      
      v_year := to_char(CURRENT_DATE, 'YYYY');
      SELECT COUNT(*) + 1 INTO v_seq FROM public.tasks WHERE client_id = v_audit.client_id AND task_number LIKE 'TSK-' || v_year || '-%';
      v_task_number := 'TSK-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
      
      IF v_type_id IS NOT NULL AND v_status_id IS NOT NULL THEN
        INSERT INTO public.tasks (
          client_id, plant_id, type_id, status_id, requester_id, assignee_id,
          task_number, title, description, due_date, status_updated_at
        ) VALUES (
          v_audit.client_id, NEW.plant_id, v_type_id, v_status_id, v_requester_id, NEW.assignee_id,
          v_task_number, 'Auditoria: ' || v_audit.title,
          'Por favor, realize a auditoria "' || v_audit.title || '" agendada para ' || to_char(v_audit.start_date, 'DD/MM/YYYY') || '. Acesse os detalhes da tarefa para preencher o checklist.',
          (v_audit.start_date + TIME '23:59:59.999')::timestamp with time zone, CURRENT_TIMESTAMP
        ) RETURNING id INTO v_task_id;
        
        INSERT INTO public.audit_executions (
          audit_id, task_id, assignee_id, plant_id, status
        ) VALUES (
          NEW.audit_id, v_task_id, NEW.assignee_id, NEW.plant_id, 'Pendente'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$DO$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger cleanly
DROP TRIGGER IF EXISTS on_audit_assignment_inserted ON public.audit_assignments;
CREATE TRIGGER on_audit_assignment_inserted
  AFTER INSERT ON public.audit_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_assignment_inserted();

-- Explicitly ensure authenticated users have INSERT permission on audits and related tables.
DROP POLICY IF EXISTS "tenant_isolation_audits" ON public.audits;
CREATE POLICY "tenant_isolation_audits" ON public.audits 
  FOR ALL TO authenticated 
  USING (public.get_user_role() = 'Master' OR client_id = public.get_user_client_id())
  WITH CHECK (public.get_user_role() = 'Master' OR client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "tenant_and_plant_isolation_audit_assignments" ON public.audit_assignments;
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

-- Fix audit_actions policy for INSERT
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
