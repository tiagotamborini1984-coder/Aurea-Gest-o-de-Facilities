DO $$
DECLARE
  v_exec RECORD;
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
  v_open_status_ids UUID[];
  v_count INT := 0;
  v_skipped INT := 0;
  v_errors INT := 0;
BEGIN
  FOR v_exec IN
    SELECT ae.* FROM public.audit_executions ae
    JOIN public.audits a ON ae.audit_id = a.id
    WHERE ae.task_id IS NULL
      AND a.status = 'Ativo'
      AND ae.status IN ('Pendente', 'Rascunho')
  LOOP
    SELECT * INTO v_audit FROM public.audits WHERE id = v_exec.audit_id;

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
      v_requester_id := v_exec.assignee_id;
    END IF;

    IF v_type_id IS NULL OR v_status_id IS NULL THEN
      INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
      VALUES (
        v_audit.client_id,
        COALESCE(v_requester_id, v_exec.assignee_id),
        'backfill_task_creation',
        'Skipped execution ' || v_exec.id::text || ' for audit "' || COALESCE(v_audit.title, v_exec.audit_id::text) ||
        '": missing ' || CASE WHEN v_type_id IS NULL THEN 'task_type ' ELSE '' END ||
        CASE WHEN v_status_id IS NULL THEN 'non-terminal task_status' ELSE '' END
      );
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT array_agg(id) INTO v_open_status_ids
    FROM public.task_statuses
    WHERE client_id = v_audit.client_id AND is_terminal = false;

    IF EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.client_id = v_audit.client_id
      AND t.plant_id = v_exec.plant_id
      AND t.type_id = v_type_id
      AND t.title = 'Auditoria: ' || v_audit.title
      AND t.status_id = ANY(COALESCE(v_open_status_ids, ARRAY[]::uuid[]))
    ) THEN
      SELECT t.id INTO v_task_id FROM public.tasks t
      WHERE t.client_id = v_audit.client_id
      AND t.plant_id = v_exec.plant_id
      AND t.type_id = v_type_id
      AND t.title = 'Auditoria: ' || v_audit.title
      AND t.status_id = ANY(COALESCE(v_open_status_ids, ARRAY[]::uuid[]))
      LIMIT 1;

      UPDATE public.audit_executions SET task_id = v_task_id WHERE id = v_exec.id;

      INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
      VALUES (
        v_audit.client_id,
        COALESCE(v_requester_id, v_exec.assignee_id),
        'backfill_task_creation',
        'Linked existing task ' || v_task_id::text || ' to execution ' || v_exec.id::text || ' for audit "' || v_audit.title || '"'
      );
      v_count := v_count + 1;
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

      IF v_audit.sla_days IS NOT NULL THEN
        v_due_date := (CURRENT_DATE + (v_audit.sla_days || ' days')::interval)::timestamptz;
      ELSE
        v_due_date := (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 millisecond')::timestamptz;
      END IF;

      INSERT INTO public.tasks (
        client_id, plant_id, type_id, status_id, requester_id, assignee_id,
        task_number, title, description, due_date, status_updated_at, audit_id
      ) VALUES (
        v_audit.client_id, v_exec.plant_id, v_type_id, v_status_id, v_requester_id, v_exec.assignee_id,
        v_task_number, 'Auditoria: ' || v_audit.title,
        'Por favor, realize a auditoria "' || v_audit.title || '". Acesse os detalhes da tarefa para preencher o checklist.',
        v_due_date, CURRENT_TIMESTAMP, v_audit.id
      ) RETURNING id INTO v_task_id;

      UPDATE public.audit_executions SET task_id = v_task_id WHERE id = v_exec.id;

      INSERT INTO public.task_timeline (task_id, user_id, content, action_type)
      VALUES (v_task_id, v_requester_id, 'Tarefa gerada via backfill para a auditoria "' || v_audit.title || '".', 'system');

      INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
      VALUES (
        v_audit.client_id,
        COALESCE(v_requester_id, v_exec.assignee_id),
        'backfill_task_creation',
        'Created task ' || v_task_number || ' (ID: ' || v_task_id::text || ') for execution ' || v_exec.id::text || ' of audit "' || v_audit.title || '"'
      );
      v_count := v_count + 1;

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
      VALUES (
        v_audit.client_id,
        COALESCE(v_requester_id, v_exec.assignee_id),
        'backfill_task_creation',
        'FAILED to create task for execution ' || v_exec.id::text || ' of audit "' || COALESCE(v_audit.title, v_exec.audit_id::text) || '": ' || SQLERRM
      );
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % tasks created/linked, % skipped, % errors', v_count, v_skipped, v_errors;
END $$;
