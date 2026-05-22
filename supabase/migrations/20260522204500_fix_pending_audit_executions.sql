-- First, fix the trigger that auto-generates tasks to sort by task_number DESC 
-- instead of created_at DESC to prevent duplicate key violations when 
-- multiple executions are finalized in the same transaction.

CREATE OR REPLACE FUNCTION public.handle_audit_execution_finalized()
RETURNS trigger AS $$
DECLARE
  v_audit record;
  v_type_id uuid;
  v_status_id uuid;
  v_requester_id uuid;
  v_next_date timestamptz;
  v_year text;
  v_latest_task text;
  v_seq int;
  v_task_number text;
  v_target_date timestamptz;
BEGIN
  -- Only run if status changed to Finalizado
  IF NEW.status = 'Finalizado' AND OLD.status != 'Finalizado' THEN
    
    -- Get audit details
    SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;
    
    IF v_audit.frequency != 'Única' THEN
      
      -- Calculate next date based on frequency
      v_next_date := COALESCE(NEW.realization_date, NEW.created_at::date);
      
      CASE v_audit.frequency
        WHEN 'Diária' THEN v_next_date := v_next_date + INTERVAL '1 day';
        WHEN 'Semanal' THEN v_next_date := v_next_date + INTERVAL '1 week';
        WHEN 'Mensal' THEN v_next_date := v_next_date + INTERVAL '1 month';
        WHEN 'Semestral' THEN v_next_date := v_next_date + INTERVAL '6 months';
        WHEN 'Anual' THEN v_next_date := v_next_date + INTERVAL '1 year';
        ELSE v_next_date := v_next_date;
      END CASE;
      
      -- Ensure next date is in the future
      WHILE v_next_date < CURRENT_DATE LOOP
        CASE v_audit.frequency
          WHEN 'Diária' THEN v_next_date := v_next_date + INTERVAL '1 day';
          WHEN 'Semanal' THEN v_next_date := v_next_date + INTERVAL '1 week';
          WHEN 'Mensal' THEN v_next_date := v_next_date + INTERVAL '1 month';
          WHEN 'Semestral' THEN v_next_date := v_next_date + INTERVAL '6 months';
          WHEN 'Anual' THEN v_next_date := v_next_date + INTERVAL '1 year';
          ELSE EXIT;
        END CASE;
      END LOOP;

      v_target_date := v_next_date;

      -- Check if a pending execution for this audit, plant, assignee already exists
      IF NOT EXISTS (
        SELECT 1 FROM public.audit_executions 
        WHERE audit_id = NEW.audit_id 
          AND plant_id = NEW.plant_id 
          AND assignee_id = NEW.assignee_id 
          AND status = 'Pendente'
      ) THEN
      
        -- Get task type
        SELECT id INTO v_type_id FROM public.task_types 
        WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;
        
        IF v_type_id IS NULL THEN
          SELECT id INTO v_type_id FROM public.task_types 
          WHERE client_id = v_audit.client_id ORDER BY created_at ASC LIMIT 1;
        END IF;
        
        -- Get task status
        SELECT id INTO v_status_id FROM public.task_statuses 
        WHERE client_id = v_audit.client_id AND is_terminal = false ORDER BY created_at ASC LIMIT 1;
        
        IF v_type_id IS NOT NULL AND v_status_id IS NOT NULL THEN
          
          -- Requester (use assignee or a system user)
          v_requester_id := NEW.assignee_id;
          
          -- Generate task number
          v_year := to_char(CURRENT_DATE, 'YYYY');
          
          SELECT task_number INTO v_latest_task
          FROM public.tasks
          WHERE client_id = v_audit.client_id
            AND task_number LIKE 'TSK-' || v_year || '-%'
          ORDER BY task_number DESC
          LIMIT 1;
          
          IF v_latest_task IS NOT NULL THEN
            v_seq := cast(substring(v_latest_task from 'TSK-\d{4}-(\d+)') as integer) + 1;
          ELSE
            v_seq := 1;
          END IF;
          
          v_task_number := 'TSK-' || v_year || '-' || lpad(v_seq::text, 4, '0');
          
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now safely run the loop to mark executions as Finalizado
DO $$
DECLARE
  rec record;
  v_final numeric;
  v_max numeric;
BEGIN
  -- Find all pending executions that have at least one answer
  FOR rec IN 
    SELECT e.id
    FROM public.audit_executions e
    WHERE e.status = 'Pendente'
      AND EXISTS (SELECT 1 FROM public.audit_execution_answers aea WHERE aea.execution_id = e.id)
  LOOP
    -- Calculate final score and max score based on 100 max per action question
    SELECT SUM(COALESCE(score, 0)), COUNT(*) * 100 
    INTO v_final, v_max
    FROM public.audit_execution_answers
    WHERE execution_id = rec.id;

    -- Update the execution to Finalizado
    UPDATE public.audit_executions
    SET status = 'Finalizado',
        realization_date = COALESCE(realization_date, created_at::date),
        final_score = COALESCE(v_final, 0),
        max_score = COALESCE(v_max, 0)
    WHERE id = rec.id;
  END LOOP;
END $$;
