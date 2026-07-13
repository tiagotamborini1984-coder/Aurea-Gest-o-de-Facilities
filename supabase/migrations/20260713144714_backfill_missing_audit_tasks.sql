DO $$
DECLARE
  v_exec RECORD;
  v_audit RECORD;
  v_assign RECORD;
  v_type_id UUID;
  v_status_id UUID;
  v_requester_id UUID;
  v_task_id UUID;
  v_year TEXT;
  v_seq INT;
  v_latest_task TEXT;
  v_task_number TEXT;
  v_due_date TIMESTAMPTZ;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Find all pending/draft audit executions that have NO linked task
  FOR v_exec IN
    SELECT ae.id, ae.audit_id, ae.plant_id, ae.assignee_id, ae.status, ae.created_at
    FROM public.audit_executions ae
    WHERE ae.task_id IS NULL
      AND ae.status IN ('Pendente', 'Rascunho', 'Em Andamento')
  LOOP
    -- Get audit details
    SELECT * INTO v_audit FROM public.audits WHERE id = v_exec.audit_id;
    IF v_audit IS NULL THEN
      RAISE NOTICE 'Audit not found for execution %, skipping', v_exec.id;
      CONTINUE;
    END IF;

    -- Get the assignment for this plant
    SELECT * INTO v_assign FROM public.audit_assignments
    WHERE audit_id = v_exec.audit_id AND plant_id = v_exec.plant_id
    LIMIT 1;

    -- If no assignment found, use the execution's assignee
    IF v_assign IS NULL THEN
      v_assign := row(null, null, v_exec.audit_id, v_exec.plant_id, v_exec.assignee_id, null)::public.audit_assignments;
    END IF;

    -- Get task type (Auditoria or fallback)
    SELECT id INTO v_type_id FROM public.task_types
    WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;
    IF v_type_id IS NULL THEN
      SELECT id INTO v_type_id FROM public.task_types
      WHERE client_id = v_audit.client_id ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- Get non-terminal status
    SELECT id INTO v_status_id FROM public.task_statuses
    WHERE client_id = v_audit.client_id AND is_terminal = false
    ORDER BY created_at ASC LIMIT 1;

    IF v_type_id IS NULL OR v_status_id IS NULL THEN
      RAISE NOTICE 'Missing type/status config for client % on audit "%", skipping', v_audit.client_id, v_audit.title;
      CONTINUE;
    END IF;

    -- Get requester (admin or fallback to assignee)
    SELECT id INTO v_requester_id FROM public.profiles
    WHERE client_id = v_audit.client_id AND role IN ('Administrador', 'Master')
    LIMIT 1;
    IF v_requester_id IS NULL THEN
      v_requester_id := v_exec.assignee_id;
    END IF;

    -- Calculate due date
    IF v_audit.sla_days IS NOT NULL THEN
      v_due_date := v_today + (v_audit.sla_days || ' days')::interval;
    ELSE
      v_due_date := NOW() + INTERVAL '23 hours 59 minutes 59 seconds';
    END IF;

    -- Generate task number
    v_year := to_char(CURRENT_DATE, 'YYYY');
    SELECT task_number INTO v_latest_task
    FROM public.tasks
    WHERE client_id = v_audit.client_id
      AND task_number LIKE 'TSK-' || v_year || '-%'
    ORDER BY task_number DESC
    LIMIT 1;

    IF v_latest_task IS NOT NULL THEN
      v_seq := CAST(substring(v_latest_task FROM 'TSK-\d{4}-(\d+)') AS integer) + 1;
    ELSE
      v_seq := 1;
    END IF;

    v_task_number := 'TSK-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

    -- Create the task
    INSERT INTO public.tasks (
      client_id, plant_id, type_id, status_id, requester_id, assignee_id,
      task_number, title, description, due_date, status_updated_at
    ) VALUES (
      v_audit.client_id, v_exec.plant_id, v_type_id, v_status_id, v_requester_id, v_exec.assignee_id,
      v_task_number, 'Auditoria: ' || v_audit.title,
      'Por favor, realize a auditoria "' || v_audit.title || '" agendada. Acesse os detalhes da tarefa para preencher o checklist.',
      v_due_date, CURRENT_TIMESTAMP
    ) RETURNING id INTO v_task_id;

    -- Link the task to the audit execution
    UPDATE public.audit_executions
    SET task_id = v_task_id
    WHERE id = v_exec.id;

    -- Add timeline entry for traceability
    INSERT INTO public.task_timeline (task_id, user_id, content, action_type)
    VALUES (v_task_id, v_requester_id, 'Tarefa gerada automaticamente (backfill) para a auditoria "' || v_audit.title || '".', 'system');

    -- Log to audit_logs
    INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
    VALUES (v_audit.client_id, v_requester_id, 'AUDIT_TASK_BACKFILL',
      'Backfill: tarefa ' || v_task_number || ' criada para auditoria "' || v_audit.title || '" (execução ' || v_exec.id || ').');

    RAISE NOTICE 'Backfilled task % for audit "%" execution %', v_task_number, v_audit.title, v_exec.id;
  END LOOP;
END $$;
