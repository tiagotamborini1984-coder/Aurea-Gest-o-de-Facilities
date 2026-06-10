-- Fix SLA date calculations for audit executions
DO $$
BEGIN
  -- Correct specific existing task SLA offset
  UPDATE public.tasks 
  SET due_date = '2026-06-21 00:00:00+00'::timestamptz 
  WHERE task_number = 'TSK-2026-0453';
END $$;

-- Update finalized execution handler to accurately use frequency interval + sla_days
CREATE OR REPLACE FUNCTION public.handle_audit_execution_finalized()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
          v_task_type_id,
          v_task_status_id,
          NEW.assignee_id, 
          NEW.assignee_id,
          'GERANDO...',
          'Auditoria: ' || v_audit.title,
          'Execução automática de auditoria: ' || v_audit.title || '. Frequência: ' || v_audit.frequency || '.',
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
$function$;

-- Ensure the initial task also correctly uses frequency + sla_days for accurate deadlines
CREATE OR REPLACE FUNCTION public.generate_initial_audit_executions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_next_due_date TIMESTAMP;
  v_task_type_id UUID;
  v_status_id UUID;
  v_requester_id UUID;
  v_task_title TEXT;
  v_task_desc TEXT;
  v_new_task_id UUID;
  v_audit RECORD;
  v_base_date TIMESTAMP;
  v_next_date TIMESTAMP;
BEGIN
  SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;
  
  v_base_date := v_audit.start_date::TIMESTAMP;
  
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
    v_next_date := v_base_date;
  END IF;

  IF v_audit.sla_days IS NOT NULL THEN
    v_next_due_date := v_next_date + (v_audit.sla_days || ' days')::INTERVAL;
  ELSE
    v_next_due_date := v_next_date;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.audit_executions 
    WHERE audit_id = NEW.audit_id AND plant_id = NEW.plant_id
  ) THEN
    SELECT id INTO v_task_type_id FROM public.task_types 
    WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;
    
    IF v_task_type_id IS NULL THEN
      SELECT id INTO v_task_type_id FROM public.task_types 
      WHERE client_id = v_audit.client_id ORDER BY created_at LIMIT 1;
    END IF;
    
    SELECT id INTO v_status_id FROM public.task_statuses 
    WHERE client_id = v_audit.client_id AND is_terminal = false ORDER BY created_at LIMIT 1;
    
    IF v_task_type_id IS NOT NULL AND v_status_id IS NOT NULL THEN
      v_task_title := 'Auditoria: ' || v_audit.title;
      v_task_desc := 'Execução automática de auditoria: ' || v_audit.title || '. Frequência: ' || v_audit.frequency || '.';
      
      SELECT id INTO v_requester_id FROM public.profiles 
      WHERE client_id = v_audit.client_id AND role IN ('Administrador', 'Master') LIMIT 1;
      IF v_requester_id IS NULL THEN
        v_requester_id := NEW.assignee_id;
      END IF;
      
      INSERT INTO public.tasks (
        client_id, plant_id, type_id, status_id, requester_id, assignee_id, 
        task_number, title, description, due_date, status_updated_at
      ) VALUES (
        v_audit.client_id, NEW.plant_id, v_task_type_id, v_status_id, v_requester_id, NEW.assignee_id,
        'GERANDO...', v_task_title, v_task_desc, v_next_due_date, NOW()
      ) RETURNING id INTO v_new_task_id;
      
      INSERT INTO public.audit_executions (
        audit_id, task_id, assignee_id, plant_id, status
      ) VALUES (
        v_audit.id, v_new_task_id, NEW.assignee_id, NEW.plant_id, 'Pendente'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Align assignment trigger as well with the exact same SLA rule
CREATE OR REPLACE FUNCTION public.handle_audit_assignment_inserted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_audit record;
  v_type_id uuid;
  v_status_id uuid;
  v_task_id uuid;
  v_due_date timestamptz;
  v_base_date timestamp;
  v_next_date timestamp;
BEGIN
  SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_audit.status != 'Ativa' AND v_audit.status != 'Ativo' THEN RETURN NEW; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.audit_executions WHERE audit_id = NEW.audit_id AND assignee_id = NEW.assignee_id AND plant_id = NEW.plant_id) THEN
    -- Get Task Type
    SELECT id INTO v_type_id FROM public.task_types WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;
    IF v_type_id IS NULL THEN
      INSERT INTO public.task_types (client_id, name, sla_hours) VALUES (v_audit.client_id, 'Auditoria', 24) RETURNING id INTO v_type_id;
    END IF;

    -- Get Status
    SELECT id INTO v_status_id FROM public.task_statuses WHERE client_id = v_audit.client_id AND name = 'Aberta' LIMIT 1;
    IF v_status_id IS NULL THEN
      SELECT id INTO v_status_id FROM public.task_statuses WHERE client_id = v_audit.client_id AND is_terminal = false ORDER BY created_at LIMIT 1;
    END IF;

    v_base_date := v_audit.start_date::timestamp;

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
      v_next_date := v_base_date;
    END IF;

    IF v_audit.sla_days IS NOT NULL THEN
      v_due_date := v_next_date + (v_audit.sla_days || ' days')::interval;
    ELSE
      v_due_date := v_next_date;
    END IF;

    INSERT INTO public.tasks (
      client_id, plant_id, type_id, status_id, requester_id, assignee_id,
      title, description, task_number, due_date
    ) VALUES (
      v_audit.client_id, NEW.plant_id, v_type_id, v_status_id, 
      NEW.assignee_id, NEW.assignee_id,
      'Auditoria: ' || v_audit.title,
      'Execução automática de auditoria: ' || v_audit.title || '. Frequência: ' || v_audit.frequency || '.',
      'GERANDO...',
      v_due_date
    ) RETURNING id INTO v_task_id;

    INSERT INTO public.audit_executions (
      audit_id, plant_id, assignee_id, status, task_id
    ) VALUES (
      v_audit.id, NEW.plant_id, NEW.assignee_id, 'Pendente', v_task_id
    );
  END IF;

  RETURN NEW;
END;
$function$;
