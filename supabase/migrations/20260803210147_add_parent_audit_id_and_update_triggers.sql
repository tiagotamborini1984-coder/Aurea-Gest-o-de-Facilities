-- Add parent_audit_id column to audits for recurring audit tracking
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS parent_audit_id UUID REFERENCES public.audits(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_audits_parent_audit_id ON public.audits(parent_audit_id);

-- Update handle_audit_execution_finalized: recurrence is now handled by the edge function
-- This trigger becomes a no-op for recurrence creation
CREATE OR REPLACE FUNCTION public.handle_audit_execution_finalized()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'Finalizado' AND OLD.status != 'Finalizado' THEN
    -- Recurrence is handled by the process-recurring-audits edge function
    -- which creates new child audit records with parent_audit_id
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_audit_assignment_inserted to use sla_days for due_date and include audit_id
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
  v_due_date timestamptz;
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
        v_due_date := (v_audit.start_date::date + (v_audit.sla_days || ' days')::interval)::timestamptz;
      ELSE
        v_due_date := (v_audit.start_date::date + TIME '23:59:59.999')::timestamptz;
      END IF;

      IF v_type_id IS NOT NULL AND v_status_id IS NOT NULL THEN
        INSERT INTO public.tasks (
          client_id, plant_id, type_id, status_id, requester_id, assignee_id,
          task_number, title, description, due_date, status_updated_at, audit_id
        ) VALUES (
          v_audit.client_id, NEW.plant_id, v_type_id, v_status_id, v_requester_id, NEW.assignee_id,
          v_task_number, 'Auditoria: ' || v_audit.title,
          'Por favor, realize a auditoria "' || v_audit.title || '" agendada para ' || to_char(v_audit.start_date::date, 'DD/MM/YYYY') || '. Acesse os detalhes da tarefa para preencher o checklist.',
          v_due_date, CURRENT_TIMESTAMP, v_audit.id
        ) RETURNING id INTO v_task_id;

        INSERT INTO public.audit_executions (
          audit_id, task_id, assignee_id, plant_id, status
        ) VALUES (
          NEW.audit_id, v_task_id, NEW.assignee_id, NEW.plant_id, 'Pendente'
        );

        INSERT INTO public.task_timeline (task_id, user_id, content, action_type)
        VALUES (v_task_id, v_requester_id, 'Tarefa gerada automaticamente para a auditoria "' || v_audit.title || '".', 'system');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_audit_assignment_inserted ON public.audit_assignments;
CREATE TRIGGER on_audit_assignment_inserted
  AFTER INSERT ON public.audit_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_assignment_inserted();
