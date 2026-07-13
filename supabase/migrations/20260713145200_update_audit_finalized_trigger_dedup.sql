-- Update handle_audit_execution_finalized trigger to include idempotency checks
-- Prevents creation of duplicate tasks for the same audit cycle

CREATE OR REPLACE FUNCTION public.handle_audit_execution_finalized()
RETURNS trigger AS $$
DECLARE
  v_audit RECORD;
  v_type_id UUID;
  v_status_id UUID;
  v_requester_id UUID;
  v_next_date DATE;
  v_target_date TIMESTAMPTZ;
  v_existing_task_id UUID;
  v_open_status_ids UUID[];
BEGIN
  IF NEW.status = 'Finalizado' AND OLD.status != 'Finalizado' THEN
    SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;

    IF v_audit.frequency != 'Única' THEN
      v_next_date := COALESCE(NEW.realization_date, NEW.created_at::date);

      CASE v_audit.frequency
        WHEN 'Diária' THEN v_next_date := v_next_date + INTERVAL '1 day';
        WHEN 'Semanal' THEN v_next_date := v_next_date + INTERVAL '1 week';
        WHEN 'Quinzenal' THEN v_next_date := v_next_date + INTERVAL '15 days';
        WHEN 'Mensal' THEN v_next_date := v_next_date + INTERVAL '1 month';
        WHEN 'Trimestral' THEN v_next_date := v_next_date + INTERVAL '3 months';
        WHEN 'Semestral' THEN v_next_date := v_next_date + INTERVAL '6 months';
        WHEN 'Anual' THEN v_next_date := v_next_date + INTERVAL '1 year';
        ELSE v_next_date := v_next_date;
      END CASE;

      WHILE v_next_date < CURRENT_DATE LOOP
        CASE v_audit.frequency
          WHEN 'Diária' THEN v_next_date := v_next_date + INTERVAL '1 day';
          WHEN 'Semanal' THEN v_next_date := v_next_date + INTERVAL '1 week';
          WHEN 'Quinzenal' THEN v_next_date := v_next_date + INTERVAL '15 days';
          WHEN 'Mensal' THEN v_next_date := v_next_date + INTERVAL '1 month';
          WHEN 'Trimestral' THEN v_next_date := v_next_date + INTERVAL '3 months';
          WHEN 'Semestral' THEN v_next_date := v_next_date + INTERVAL '6 months';
          WHEN 'Anual' THEN v_next_date := v_next_date + INTERVAL '1 year';
          ELSE EXIT;
        END CASE;
      END LOOP;

      v_target_date := v_next_date;

      IF NOT EXISTS (
        SELECT 1 FROM public.audit_executions
        WHERE audit_id = NEW.audit_id
          AND plant_id = NEW.plant_id
          AND status = 'Pendente'
      ) THEN
        SELECT id INTO v_type_id FROM public.task_types
        WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;

        IF v_type_id IS NULL THEN
          SELECT id INTO v_type_id FROM public.task_types
          WHERE client_id = v_audit.client_id ORDER BY created_at ASC LIMIT 1;
        END IF;

        SELECT id INTO v_status_id FROM public.task_statuses
        WHERE client_id = v_audit.client_id AND is_terminal = false ORDER BY created_at ASC LIMIT 1;

        SELECT array_agg(id) INTO v_open_status_ids
        FROM public.task_statuses
        WHERE client_id = v_audit.client_id AND is_terminal = false;

        IF v_type_id IS NOT NULL AND v_status_id IS NOT NULL THEN
          v_requester_id := NEW.assignee_id;

          -- Idempotency: check for existing open task with same title and plant_id
          SELECT id INTO v_existing_task_id FROM public.tasks
          WHERE client_id = v_audit.client_id
            AND plant_id = NEW.plant_id
            AND type_id = v_type_id
            AND title = 'Auditoria: ' || v_audit.title
            AND status_id = ANY(COALESCE(v_open_status_ids, ARRAY[]::uuid[]))
          ORDER BY created_at DESC
          LIMIT 1;

          IF v_existing_task_id IS NOT NULL THEN
            INSERT INTO public.audit_executions (
              audit_id, task_id, assignee_id, plant_id, status
            )
            SELECT NEW.audit_id, v_existing_task_id, NEW.assignee_id, NEW.plant_id, 'Pendente'
            WHERE NOT EXISTS (
              SELECT 1 FROM public.audit_executions
              WHERE audit_id = NEW.audit_id AND plant_id = NEW.plant_id AND status = 'Pendente'
            );
          ELSE
            WITH inserted_task AS (
              INSERT INTO public.tasks (
                client_id, plant_id, type_id, status_id, requester_id, assignee_id,
                task_number, title, description, due_date, status_updated_at
              ) VALUES (
                v_audit.client_id, NEW.plant_id, v_type_id, v_status_id, v_requester_id, NEW.assignee_id,
                'GERANDO...', 'Auditoria: ' || v_audit.title,
                'Por favor, realize a auditoria "' || v_audit.title || '" agendada para ' || to_char(v_next_date, 'DD/MM/YYYY') || '. Acesse os detalhes da tarefa para preencher o checklist.',
                v_target_date, CURRENT_TIMESTAMP
              ) RETURNING id
            )
            INSERT INTO public.audit_executions (
              audit_id, task_id, assignee_id, plant_id, status
            )
            SELECT NEW.audit_id, id, NEW.assignee_id, NEW.plant_id, 'Pendente'
            FROM inserted_task;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
