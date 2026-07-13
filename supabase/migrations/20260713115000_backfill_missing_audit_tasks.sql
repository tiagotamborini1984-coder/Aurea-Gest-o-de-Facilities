-- Backfill missing audit tasks and executions for active audits
-- This ensures audits like "Check List Imóveis - CNP Cpnd Parecis" get their tasks created immediately

-- 1. Clean up duplicate pending audit executions (keep newest per audit+plant)
DO $$
DECLARE
  dup_record RECORD;
  exec_to_delete RECORD;
BEGIN
  FOR dup_record IN (
    SELECT audit_id, plant_id, COUNT(*)
    FROM public.audit_executions
    WHERE status = 'Pendente'
    GROUP BY audit_id, plant_id
    HAVING COUNT(*) > 1
  ) LOOP
    FOR exec_to_delete IN (
      SELECT id, task_id
      FROM public.audit_executions
      WHERE audit_id = dup_record.audit_id
        AND plant_id = dup_record.plant_id
        AND status = 'Pendente'
      ORDER BY created_at DESC
      OFFSET 1
    ) LOOP
      DELETE FROM public.audit_executions WHERE id = exec_to_delete.id;
      IF exec_to_delete.task_id IS NOT NULL THEN
        DELETE FROM public.tasks WHERE id = exec_to_delete.task_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 2. Backfill missing tasks+executions for active audits with no pending execution
DO $$
DECLARE
  v_audit RECORD;
  v_assignment RECORD;
  v_type_id UUID;
  v_status_id UUID;
  v_requester_id UUID;
  v_task_id UUID;
  v_task_number TEXT;
  v_year TEXT;
  v_seq INT;
  v_due_date TIMESTAMPTZ;
  v_open_status_ids UUID[];
BEGIN
  FOR v_audit IN
    SELECT * FROM public.audits WHERE status = 'Ativo'
  LOOP
    FOR v_assignment IN
      SELECT * FROM public.audit_assignments WHERE audit_id = v_audit.id
    LOOP
      IF v_assignment.assignee_id IS NULL THEN
        RAISE NOTICE 'Skipping assignment with no assignee for audit "%"', v_audit.title;
        CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.audit_executions
        WHERE audit_id = v_audit.id AND plant_id = v_assignment.plant_id
        AND status IN ('Pendente', 'Rascunho')
      ) THEN
        CONTINUE;
      END IF;

      SELECT id INTO v_type_id FROM public.task_types
      WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;
      IF v_type_id IS NULL THEN
        SELECT id INTO v_type_id FROM public.task_types
        WHERE client_id = v_audit.client_id ORDER BY created_at ASC LIMIT 1;
      END IF;

      SELECT id INTO v_status_id FROM public.task_statuses
      WHERE client_id = v_audit.client_id AND is_terminal = false ORDER BY created_at ASC LIMIT 1;

      SELECT id INTO v_requester_id FROM public.profiles
      WHERE client_id = v_audit.client_id AND role IN ('Administrador', 'Master') LIMIT 1;
      IF v_requester_id IS NULL THEN
        v_requester_id := v_assignment.assignee_id;
      END IF;

      IF v_type_id IS NULL OR v_status_id IS NULL THEN
        RAISE NOTICE 'Missing type or status for audit "%", client %', v_audit.title, v_audit.client_id;
        CONTINUE;
      END IF;

      SELECT array_agg(id) INTO v_open_status_ids
      FROM public.task_statuses
      WHERE client_id = v_audit.client_id AND is_terminal = false;

      IF NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.client_id = v_audit.client_id
        AND t.plant_id = v_assignment.plant_id
        AND t.type_id = v_type_id
        AND t.title = 'Auditoria: ' || v_audit.title
        AND t.status_id = ANY(COALESCE(v_open_status_ids, ARRAY[]::uuid[]))
      ) THEN
        v_year := to_char(CURRENT_DATE, 'YYYY');
        SELECT COUNT(*) + 1 INTO v_seq FROM public.tasks
        WHERE client_id = v_audit.client_id AND task_number LIKE 'TSK-' || v_year || '-%';
        v_task_number := 'TSK-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

        v_due_date := (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 millisecond')::timestamptz;

        INSERT INTO public.tasks (
          client_id, plant_id, type_id, status_id, requester_id, assignee_id,
          task_number, title, description, due_date, status_updated_at
        ) VALUES (
          v_audit.client_id, v_assignment.plant_id, v_type_id, v_status_id, v_requester_id, v_assignment.assignee_id,
          v_task_number, 'Auditoria: ' || v_audit.title,
          'Por favor, realize a auditoria "' || v_audit.title || '". Acesse os detalhes da tarefa para preencher o checklist.',
          v_due_date, CURRENT_TIMESTAMP
        ) RETURNING id INTO v_task_id;

        INSERT INTO public.audit_executions (
          audit_id, task_id, assignee_id, plant_id, status
        ) VALUES (
          v_audit.id, v_task_id, v_assignment.assignee_id, v_assignment.plant_id, 'Pendente'
        );

        RAISE NOTICE 'Created task % for audit "%" plant %', v_task_number, v_audit.title, v_assignment.plant_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;
