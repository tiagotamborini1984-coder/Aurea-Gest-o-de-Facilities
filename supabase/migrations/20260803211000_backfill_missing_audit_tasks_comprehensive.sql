DO $$
DECLARE
  v_assignment RECORD;
  v_audit RECORD;
  v_type_id UUID;
  v_status_id UUID;
  v_requester_id UUID;
  v_task_id UUID;
  v_task_number TEXT;
  v_year TEXT;
  v_latest_task TEXT;
  v_seq INT;
  v_due_date TIMESTAMPTZ;
  v_existing_task_id UUID;
  v_exec_id UUID;
  v_count INT := 0;
  v_skipped INT := 0;
  v_errors INT := 0;
BEGIN
  FOR v_assignment IN
    SELECT aa.audit_id, aa.plant_id, aa.assignee_id
    FROM public.audit_assignments aa
    JOIN public.audits a ON aa.audit_id = a.id
    WHERE a.status = 'Ativo'
      AND aa.assignee_id IS NOT NULL
    ORDER BY aa.audit_id, aa.plant_id
  LOOP
    SELECT id INTO v_existing_task_id
    FROM public.tasks
    WHERE audit_id = v_assignment.audit_id
      AND plant_id = v_assignment.plant_id
    LIMIT 1;

    IF v_existing_task_id IS NOT NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT * INTO v_audit FROM public.audits WHERE id = v_assignment.audit_id;

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
      INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
      VALUES (
        v_audit.client_id,
        COALESCE(v_requester_id, v_assignment.assignee_id),
        'backfill_task_creation',
        'Skipped audit "' || COALESCE(v_audit.title, v_audit.id::text) ||
        '": missing ' || CASE WHEN v_type_id IS NULL THEN 'task_type ' ELSE '' END ||
        CASE WHEN v_status_id IS NULL THEN 'non-terminal task_status' ELSE '' END
      );
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    BEGIN
      v_year := to_char(CURRENT_DATE, 'YYYY');
      SELECT task_number INTO v_latest_task
      FROM public.tasks
      WHERE client_id = v_audit.client_id AND task_number LIKE 'TSK-' || v_year || '-%'
      ORDER BY task_number DESC LIMIT 1;

      IF v_latest_task IS NOT NULL THEN
        v_seq := CAST(substring(v_latest_task FROM 'TSK-\d{4}-(\d+)') AS integer) + 1;
      ELSE
        v_seq := 1;
      END IF;

      v_task_number := 'TSK-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

      IF v_audit.sla_days IS NOT NULL AND v_audit.sla_days > 0 THEN
        v_due_date := (CURRENT_DATE + (v_audit.sla_days || ' days')::interval)::timestamptz;
      ELSE
        v_due_date := (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 millisecond')::timestamptz;
      END IF;

      INSERT INTO public.tasks (
        client_id, plant_id, type_id, status_id, requester_id, assignee_id,
        task_number, title, description, due_date, status_updated_at, audit_id
      ) VALUES (
        v_audit.client_id, v_assignment.plant_id, v_type_id, v_status_id,
        v_requester_id, v_assignment.assignee_id,
        v_task_number, 'Auditoria: ' || v_audit.title,
        'Por favor, realize a auditoria "' || v_audit.title || '" agendada. Acesse os detalhes da tarefa para preencher o checklist.',
        v_due_date, CURRENT_TIMESTAMP, v_audit.id
      ) RETURNING id INTO v_task_id;

      SELECT id INTO v_exec_id FROM public.audit_executions
      WHERE audit_id = v_audit.id AND plant_id = v_assignment.plant_id
        AND status IN ('Pendente', 'Rascunho')
      LIMIT 1;

      IF v_exec_id IS NOT NULL THEN
        UPDATE public.audit_executions SET task_id = v_task_id WHERE id = v_exec_id;
      ELSE
        INSERT INTO public.audit_executions (audit_id, task_id, assignee_id, plant_id, status)
        VALUES (v_audit.id, v_task_id, v_assignment.assignee_id, v_assignment.plant_id, 'Pendente');
      END IF;

      INSERT INTO public.task_timeline (task_id, user_id, content, action_type)
      VALUES (v_task_id, v_requester_id, 'Tarefa gerada via backfill para a auditoria "' || v_audit.title || '".', 'system');

      INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
      VALUES (
        v_audit.client_id,
        COALESCE(v_requester_id, v_assignment.assignee_id),
        'backfill_task_creation',
        'Created task ' || v_task_number || ' for audit "' || v_audit.title || '" (plant: ' || v_assignment.plant_id::text || ')'
      );

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
      VALUES (
        v_audit.client_id,
        COALESCE(v_requester_id, v_assignment.assignee_id),
        'backfill_task_creation',
        'FAILED to create task for audit "' || COALESCE(v_audit.title, v_audit.id::text) || '": ' || SQLERRM
      );
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % tasks created, % skipped, % errors', v_count, v_skipped, v_errors;
END $$;
