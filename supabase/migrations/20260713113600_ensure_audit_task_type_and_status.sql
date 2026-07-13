-- Ensure a 'Auditoria' task type and an initial non-terminal task status exist for every client

DO $$
DECLARE
  v_client RECORD;
  v_type_id UUID;
  v_status_id UUID;
BEGIN
  FOR v_client IN SELECT id FROM public.clients LOOP
    -- Ensure 'Auditoria' task type exists
    SELECT id INTO v_type_id 
    FROM public.task_types 
    WHERE client_id = v_client.id AND name ILIKE '%Auditoria%'
    LIMIT 1;

    IF v_type_id IS NULL THEN
      INSERT INTO public.task_types (client_id, name, sla_hours)
      VALUES (v_client.id, 'Auditoria', 24)
      ON CONFLICT DO NOTHING;
      RAISE NOTICE 'Created Auditoria task type for client %', v_client.id;
    END IF;

    -- Ensure at least one non-terminal task status exists
    SELECT id INTO v_status_id
    FROM public.task_statuses
    WHERE client_id = v_client.id AND is_terminal = false
    LIMIT 1;

    IF v_status_id IS NULL THEN
      INSERT INTO public.task_statuses (client_id, name, color, is_terminal)
      VALUES (v_client.id, 'Pendente', '#64748b', false)
      ON CONFLICT DO NOTHING;
      RAISE NOTICE 'Created initial task status for client %', v_client.id;
    END IF;
  END LOOP;
END $$;

-- Update the recurrence trigger function to include 'Trimestral' frequency
CREATE OR REPLACE FUNCTION public.handle_audit_execution_finalized()
RETURNS trigger AS $$
DECLARE
  v_audit RECORD;
  v_type_id UUID;
  v_status_id UUID;
  v_requester_id UUID;
  v_year TEXT;
  v_seq INT;
  v_task_number TEXT;
  v_next_date DATE;
  v_target_date TIMESTAMP WITH TIME ZONE;
BEGIN
  IF NEW.status = 'Finalizado' AND OLD.status != 'Finalizado' THEN
    SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;

    IF v_audit.frequency != 'Única' THEN
      v_next_date := COALESCE(NEW.realization_date, (NEW.created_at AT TIME ZONE 'UTC')::DATE, CURRENT_DATE);

      IF v_audit.frequency = 'Diária' THEN
        v_next_date := v_next_date + INTERVAL '1 day';
      ELSIF v_audit.frequency = 'Semanal' THEN
        v_next_date := v_next_date + INTERVAL '1 week';
      ELSIF v_audit.frequency = 'Quinzenal' THEN
        v_next_date := v_next_date + INTERVAL '15 days';
      ELSIF v_audit.frequency = 'Mensal' THEN
        v_next_date := v_next_date + INTERVAL '1 month';
      ELSIF v_audit.frequency = 'Trimestral' THEN
        v_next_date := v_next_date + INTERVAL '3 months';
      ELSIF v_audit.frequency = 'Semestral' THEN
        v_next_date := v_next_date + INTERVAL '6 months';
      ELSIF v_audit.frequency = 'Anual' THEN
        v_next_date := v_next_date + INTERVAL '1 year';
      END IF;

      WHILE v_next_date < CURRENT_DATE LOOP
        IF v_audit.frequency = 'Diária' THEN
          v_next_date := v_next_date + INTERVAL '1 day';
        ELSIF v_audit.frequency = 'Semanal' THEN
          v_next_date := v_next_date + INTERVAL '1 week';
        ELSIF v_audit.frequency = 'Quinzenal' THEN
          v_next_date := v_next_date + INTERVAL '15 days';
        ELSIF v_audit.frequency = 'Mensal' THEN
          v_next_date := v_next_date + INTERVAL '1 month';
        ELSIF v_audit.frequency = 'Trimestral' THEN
          v_next_date := v_next_date + INTERVAL '3 months';
        ELSIF v_audit.frequency = 'Semestral' THEN
          v_next_date := v_next_date + INTERVAL '6 months';
        ELSIF v_audit.frequency = 'Anual' THEN
          v_next_date := v_next_date + INTERVAL '1 year';
        ELSE
          EXIT;
        END IF;
      END LOOP;

      IF NOT EXISTS (
        SELECT 1 FROM public.audit_executions
        WHERE audit_id = NEW.audit_id AND plant_id = NEW.plant_id AND status = 'Pendente'
      ) THEN

        SELECT id INTO v_type_id FROM public.task_types WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;
        IF v_type_id IS NULL THEN
          SELECT id INTO v_type_id FROM public.task_types WHERE client_id = v_audit.client_id ORDER BY created_at ASC LIMIT 1;
        END IF;

        SELECT id INTO v_status_id FROM public.task_statuses WHERE client_id = v_audit.client_id AND is_terminal = false ORDER BY created_at ASC LIMIT 1;

        SELECT id INTO v_requester_id FROM public.profiles WHERE client_id = v_audit.client_id AND role IN ('Administrador', 'Master') LIMIT 1;
        IF v_requester_id IS NULL THEN
          v_requester_id := NEW.assignee_id;
        END IF;

        v_year := to_char(CURRENT_DATE, 'YYYY');
        SELECT COUNT(*) + 1 INTO v_seq FROM public.tasks WHERE client_id = v_audit.client_id AND task_number LIKE 'TSK-' || v_year || '-%';
        v_task_number := 'TSK-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

        v_target_date := v_next_date + TIME '23:59:59.999';

        WITH inserted_task AS (
          INSERT INTO public.tasks (
            client_id, plant_id, type_id, status_id, requester_id, assignee_id,
            task_number, title, description, due_date, status_updated_at
          ) VALUES (
            v_audit.client_id, NEW.plant_id, v_type_id, v_status_id, v_requester_id, NEW.assignee_id,
            v_task_number, 'Auditoria: ' || v_audit.title,
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
