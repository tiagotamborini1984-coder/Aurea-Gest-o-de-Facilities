-- 1. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_audit_execution_finalized()
RETURNS trigger AS $$
DECLARE
  v_audit record;
  v_base_date timestamp;
  v_next_date timestamp;
  v_next_due_date timestamp;
  v_task_type_id uuid;
  v_task_status_id uuid;
  v_new_task_id uuid;
  v_task_participants text[];
BEGIN
  IF NEW.status = 'Finalizado' AND (OLD.status IS DISTINCT FROM 'Finalizado') THEN
    SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;
    
    IF v_audit.frequency != 'Única' THEN
      -- Base date uses realization_date, fallback to created_at
      v_base_date := COALESCE(NEW.realization_date::TIMESTAMP, NEW.created_at);
      
      IF v_audit.frequency = 'Diária' THEN
        v_next_date := v_base_date + INTERVAL '1 day';
      ELSIF v_audit.frequency = 'Semanal' THEN
        v_next_date := v_base_date + INTERVAL '1 week';
      ELSIF v_audit.frequency = 'Quinzenal' THEN
        v_next_date := v_base_date + INTERVAL '15 days';
      ELSIF v_audit.frequency = 'Mensal' THEN
        v_next_date := v_base_date + INTERVAL '1 month';
      ELSIF v_audit.frequency = 'Bimestral' THEN
        v_next_date := v_base_date + INTERVAL '2 months';
      ELSIF v_audit.frequency = 'Trimestral' THEN
        v_next_date := v_base_date + INTERVAL '3 months';
      ELSIF v_audit.frequency = 'Semestral' THEN
        v_next_date := v_base_date + INTERVAL '6 months';
      ELSIF v_audit.frequency = 'Anual' THEN
        v_next_date := v_base_date + INTERVAL '1 year';
      ELSE
        v_next_date := v_base_date + INTERVAL '1 month';
      END IF;

      -- Add SLA days if defined
      IF v_audit.sla_days IS NOT NULL THEN
        v_next_due_date := v_next_date + (v_audit.sla_days || ' days')::interval;
      ELSE
        v_next_due_date := v_next_date;
      END IF;

      -- Get Task Type 'Auditoria'
      SELECT id INTO v_task_type_id 
      FROM public.task_types 
      WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' 
      LIMIT 1;
      
      -- Get Initial Status
      SELECT id INTO v_task_status_id 
      FROM public.task_statuses 
      WHERE client_id = v_audit.client_id AND is_terminal = false 
      ORDER BY created_at ASC 
      LIMIT 1;

      IF v_task_type_id IS NOT NULL AND v_task_status_id IS NOT NULL THEN
        
        IF NEW.task_id IS NOT NULL THEN
          SELECT participants_ids INTO v_task_participants FROM public.tasks WHERE id = NEW.task_id;
        END IF;
        
        INSERT INTO public.tasks (
          client_id,
          plant_id,
          type_id,
          status_id,
          requester_id,
          assignee_id,
          task_number,
          title,
          description,
          due_date,
          status_updated_at,
          participants_ids
        ) VALUES (
          v_audit.client_id,
          NEW.plant_id,
          NEW.assignee_id, 
          NEW.assignee_id,
          'GERANDO...',
          'Auditoria: ' || v_audit.title,
          'Por favor, realize a auditoria "' || v_audit.title || '" agendada para ' || to_char(v_next_date, 'DD/MM/YYYY') || '. Acesse os detalhes da tarefa para preencher o checklist.',
          v_next_due_date,
          NOW(),
          v_task_participants
        ) RETURNING id INTO v_new_task_id;

        INSERT INTO public.audit_executions (
          audit_id,
          plant_id,
          assignee_id,
          task_id,
          status
        ) VALUES (
          v_audit.id,
          NEW.plant_id,
          NEW.assignee_id,
          v_new_task_id,
          'Pendente'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure trigger exists
DROP TRIGGER IF EXISTS on_audit_execution_finalized ON public.audit_executions;
CREATE TRIGGER on_audit_execution_finalized
  AFTER UPDATE OF status ON public.audit_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_execution_finalized();

-- 3. Recalculate existing incorrect tasks
DO $$
DECLARE
  rec record;
  v_base_date timestamp;
  v_next_date timestamp;
  v_next_due_date timestamp;
BEGIN
  FOR rec IN 
    SELECT 
      ae.id as exec_id, 
      ae.audit_id, 
      ae.task_id,
      a.frequency, 
      a.sla_days,
      prev_ae.realization_date,
      prev_ae.created_at as prev_created_at
    FROM public.audit_executions ae
    JOIN public.audits a ON a.id = ae.audit_id
    JOIN public.tasks t ON t.id = ae.task_id
    LEFT JOIN LATERAL (
      SELECT realization_date, created_at
      FROM public.audit_executions
      WHERE audit_id = ae.audit_id 
        AND plant_id = ae.plant_id 
        AND status = 'Finalizado'
        AND id != ae.id
      ORDER BY created_at DESC
      LIMIT 1
    ) prev_ae ON true
    WHERE ae.status = 'Pendente' 
      AND a.frequency != 'Única'
      AND t.closed_at IS NULL
  LOOP
    IF rec.realization_date IS NOT NULL OR rec.prev_created_at IS NOT NULL THEN
      v_base_date := COALESCE(rec.realization_date::TIMESTAMP, rec.prev_created_at);
      
      IF rec.frequency = 'Diária' THEN v_next_date := v_base_date + INTERVAL '1 day';
      ELSIF rec.frequency = 'Semanal' THEN v_next_date := v_base_date + INTERVAL '1 week';
      ELSIF rec.frequency = 'Quinzenal' THEN v_next_date := v_base_date + INTERVAL '15 days';
      ELSIF rec.frequency = 'Mensal' THEN v_next_date := v_base_date + INTERVAL '1 month';
      ELSIF rec.frequency = 'Bimestral' THEN v_next_date := v_base_date + INTERVAL '2 months';
      ELSIF rec.frequency = 'Trimestral' THEN v_next_date := v_base_date + INTERVAL '3 months';
      ELSIF rec.frequency = 'Semestral' THEN v_next_date := v_base_date + INTERVAL '6 months';
      ELSIF rec.frequency = 'Anual' THEN v_next_date := v_base_date + INTERVAL '1 year';
      ELSE v_next_date := v_base_date + INTERVAL '1 month';
      END IF;

      IF rec.sla_days IS NOT NULL THEN
        v_next_due_date := v_next_date + (rec.sla_days || ' days')::interval;
      ELSE
        v_next_due_date := v_next_date;
      END IF;

      UPDATE public.tasks 
      SET due_date = v_next_due_date,
          description = 'Por favor, realize a auditoria "' || (SELECT title FROM public.audits WHERE id = rec.audit_id) || '" agendada para ' || to_char(v_next_date, 'DD/MM/YYYY') || '. Acesse os detalhes da tarefa para preencher o checklist.'
      WHERE id = rec.task_id;
    END IF;
  END LOOP;
END $$;
