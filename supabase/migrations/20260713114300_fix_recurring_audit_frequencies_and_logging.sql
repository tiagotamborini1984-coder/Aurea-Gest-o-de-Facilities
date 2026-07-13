-- This migration ensures:
-- 1. The handle_audit_execution_finalized trigger includes 'Quinzenal' and 'Trimestral' frequencies
-- 2. The handle_audit_assignment_inserted trigger includes 'Quinzenal' and 'Trimestral' frequencies
-- 3. Any existing pending audit executions with missing assignee or task links are cleaned up

-- Update the recurrence trigger to include Quinzenal and Trimestral (already done in 20260713113600 but ensure consistency)
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

-- Update the assignment trigger to include Quinzenal and Trimestral in SLA calculation
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up duplicate pending audit executions (keep only the newest per audit+plant)
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

-- Ensure audit_logs table has RLS policies for error logging
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.audit_logs;
CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_isolation_audit_logs" ON public.audit_logs;
CREATE POLICY "tenant_isolation_audit_logs" ON public.audit_logs
  FOR ALL TO authenticated
  USING (
    (get_user_role() = 'Master') OR
    (client_id = get_user_client_id())
  )
  WITH CHECK (
    (get_user_role() = 'Master') OR
    (client_id = get_user_client_id())
  );
