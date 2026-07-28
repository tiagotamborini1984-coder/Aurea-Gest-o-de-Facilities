CREATE OR REPLACE FUNCTION public.handle_audit_assignment_inserted()
RETURNS trigger AS $$
DECLARE
  v_audit record;
  v_type_id uuid;
  v_status_id uuid;
  v_requester_id uuid;
  v_task_id uuid;
  v_task_number text;
  v_year text;
  v_latest_task text;
  v_seq int;
  v_open_status_ids uuid[];
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

      IF v_type_id IS NULL OR v_status_id IS NULL THEN
        INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
        VALUES (
          v_audit.client_id,
          COALESCE(v_requester_id, NEW.assignee_id),
          'task_creation_failed',
          'Missing prerequisites for audit "' || COALESCE(v_audit.title, NEW.audit_id::text) ||
          '": ' || CASE WHEN v_type_id IS NULL THEN 'task_type (Auditoria) ' ELSE '' END ||
          CASE WHEN v_status_id IS NULL THEN 'non-terminal task_status' ELSE '' END
        );
        RAISE NOTICE 'Missing prerequisites for audit "%", client %', v_audit.title, v_audit.client_id;
        RETURN NEW;
      END IF;

      SELECT array_agg(id) INTO v_open_status_ids
      FROM public.task_statuses
      WHERE client_id = v_audit.client_id AND is_terminal = false;

      IF NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.client_id = v_audit.client_id
        AND t.plant_id = NEW.plant_id
        AND t.type_id = v_type_id
        AND t.title = 'Auditoria: ' || v_audit.title
        AND t.status_id = ANY(COALESCE(v_open_status_ids, ARRAY[]::uuid[]))
      ) THEN
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

          INSERT INTO public.task_timeline (task_id, user_id, content, action_type)
          VALUES (v_task_id, v_requester_id, 'Tarefa gerada automaticamente para a auditoria "' || v_audit.title || '".', 'system');

        EXCEPTION WHEN OTHERS THEN
          INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
          VALUES (
            v_audit.client_id,
            COALESCE(v_requester_id, NEW.assignee_id),
            'task_creation_failed',
            'Error creating task for audit "' || COALESCE(v_audit.title, NEW.audit_id::text) ||
            '" assignment ' || NEW.id::text || ': ' || SQLERRM
          );
          RAISE NOTICE 'Task creation failed for audit "%": %', v_audit.title, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
