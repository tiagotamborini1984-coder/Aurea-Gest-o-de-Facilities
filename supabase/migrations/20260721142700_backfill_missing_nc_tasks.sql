DO $$
DECLARE
  v_exec RECORD;
  v_action RECORD;
  v_audit_id uuid;
  v_client_id uuid;
  v_plant_id uuid;
  v_assignee_id uuid;
  v_audit_title text;
  v_freq text;
  v_scoring_settings jsonb;
  v_nc_threshold int := 3;
  v_setting jsonb;
  v_type_id uuid;
  v_status_id uuid;
  v_due_date timestamptz;
  v_year text;
  v_seq int;
  v_task_number text;
  v_existing_task uuid;
  v_nc_title text;
  v_created_count int := 0;
BEGIN
  FOR v_exec IN (
    SELECT DISTINCT ae.id, ae.audit_id, ae.plant_id, ae.assignee_id
    FROM public.audit_executions ae
    JOIN public.audit_execution_answers ans ON ans.execution_id = ae.id
    WHERE ae.status = 'Finalizado'
      AND ans.score IS NOT NULL
      AND ans.score <= 3
  ) LOOP
    SELECT client_id, title, frequency, scoring_settings
    INTO v_client_id, v_audit_title, v_freq, v_scoring_settings
    FROM public.audits WHERE id = v_exec.audit_id;

    IF v_client_id IS NULL THEN
      CONTINUE;
    END IF;

    v_audit_id := v_exec.audit_id;
    v_plant_id := v_exec.plant_id;
    v_assignee_id := v_exec.assignee_id;

    v_nc_threshold := 3;
    IF v_scoring_settings IS NOT NULL THEN
      IF jsonb_typeof(v_scoring_settings) = 'array' THEN
        FOR v_setting IN SELECT * FROM jsonb_array_elements(v_scoring_settings) LOOP
          IF v_setting ? 'nc_threshold' THEN
            v_nc_threshold := (v_setting->>'nc_threshold')::int;
            EXIT;
          END IF;
        END LOOP;
      ELSIF jsonb_typeof(v_scoring_settings) = 'object' THEN
        IF v_scoring_settings ? 'nc_threshold' THEN
          v_nc_threshold := (v_scoring_settings->>'nc_threshold')::int;
        END IF;
      END IF;
    END IF;

    SELECT id INTO v_type_id FROM public.task_types
    WHERE client_id = v_client_id AND (name ILIKE '%Não Conformidade%' OR name ILIKE '%NC%') LIMIT 1;
    IF v_type_id IS NULL THEN
      SELECT id INTO v_type_id FROM public.task_types WHERE client_id = v_client_id ORDER BY created_at ASC LIMIT 1;
    END IF;

    SELECT id INTO v_status_id FROM public.task_statuses
    WHERE client_id = v_client_id AND is_terminal = false ORDER BY created_at ASC LIMIT 1;

    IF v_type_id IS NULL OR v_status_id IS NULL THEN
      RAISE NOTICE 'Missing type or status for audit "%", client %', v_audit_title, v_client_id;
      CONTINUE;
    END IF;

    v_due_date := NOW();
    IF v_freq = 'Diária' THEN v_due_date := v_due_date + INTERVAL '1 day';
    ELSIF v_freq = 'Semanal' THEN v_due_date := v_due_date + INTERVAL '7 days';
    ELSIF v_freq = 'Quinzenal' THEN v_due_date := v_due_date + INTERVAL '15 days';
    ELSIF v_freq = 'Mensal' THEN v_due_date := v_due_date + INTERVAL '1 month';
    ELSIF v_freq = 'Bimestral' THEN v_due_date := v_due_date + INTERVAL '2 months';
    ELSIF v_freq = 'Trimestral' THEN v_due_date := v_due_date + INTERVAL '3 months';
    ELSIF v_freq = 'Semestral' THEN v_due_date := v_due_date + INTERVAL '6 months';
    ELSIF v_freq = 'Anual' THEN v_due_date := v_due_date + INTERVAL '1 year';
    ELSE v_due_date := v_due_date + INTERVAL '7 days';
    END IF;

    v_due_date := (v_due_date - INTERVAL '1 day')::date + INTERVAL '23:59:59';
    IF v_due_date < NOW() THEN v_due_date := (NOW()::date) + INTERVAL '23:59:59'; END IF;

    FOR v_action IN (
      SELECT a.id, a.title, e.score, e.observations
      FROM public.audit_actions a
      JOIN public.audit_execution_answers e ON e.action_id = a.id
      WHERE e.execution_id = v_exec.id AND e.score IS NOT NULL AND e.score <= v_nc_threshold
    ) LOOP
      v_nc_title := 'Não Conformidade: ' || substring(v_action.title from 1 for 50);

      SELECT t.id INTO v_existing_task
      FROM public.tasks t
      LEFT JOIN public.task_statuses ts ON t.status_id = ts.id
      WHERE t.client_id = v_client_id
        AND t.plant_id = v_plant_id
        AND t.audit_id = v_audit_id
        AND t.title LIKE v_nc_title || '%'
        AND (ts.is_terminal = false OR ts.is_terminal IS NULL)
      LIMIT 1;

      IF v_existing_task IS NULL THEN
        v_year := to_char(NOW(), 'YYYY');
        SELECT COUNT(*) + 1 INTO v_seq FROM public.tasks
        WHERE client_id = v_client_id AND task_number LIKE 'TSK-' || v_year || '-%';
        v_task_number := 'TSK-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

        INSERT INTO public.tasks (
          client_id, plant_id, type_id, status_id, requester_id, assignee_id,
          task_number, title, description, due_date, audit_id, status_updated_at
        ) VALUES (
          v_client_id, v_plant_id, v_type_id, v_status_id, v_assignee_id, v_assignee_id,
          v_task_number,
          v_nc_title,
          'Foi identificada uma Não Conformidade durante a auditoria "' || v_audit_title || '".' || E'\n\n' ||
          'Ação Avaliada: ' || v_action.title || E'\n' ||
          'Nota: ' || v_action.score || E'\n' ||
          'Observações: ' || COALESCE(v_action.observations, 'Nenhuma') || E'\n\n' ||
          'Favor providenciar correção até a data limite.',
          v_due_date,
          v_audit_id,
          NOW()
        );

        v_created_count := v_created_count + 1;
        RAISE NOTICE 'Created NC task % for audit "%"', v_task_number, v_audit_title;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Backfill complete. Total NC tasks created: %', v_created_count;
END $$;
