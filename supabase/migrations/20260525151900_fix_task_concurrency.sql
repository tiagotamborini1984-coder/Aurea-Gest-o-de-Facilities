-- Function to set task_number safely with concurrency locks
CREATE OR REPLACE FUNCTION public.set_task_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
  v_max_retries INT := 3;
  v_attempts INT := 0;
BEGIN
  -- We use an advisory lock to prevent concurrent inserts for the same client
  PERFORM pg_advisory_xact_lock(hashtext(NEW.client_id::text));
  
  v_year := to_char(COALESCE(NEW.created_at, CURRENT_TIMESTAMP), 'YYYY');
  
  LOOP
    -- Calculate the next sequence for the given year
    SELECT COALESCE(
      MAX(
        SUBSTRING(task_number FROM 'TSK-\d{4}-([0-9]+)')::INT
      ), 0
    ) + 1 INTO v_seq
    FROM public.tasks
    WHERE client_id = NEW.client_id AND task_number LIKE 'TSK-' || v_year || '-%';

    NEW.task_number := 'TSK-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
    
    -- Edge case check to retry if it already exists, as requested
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE client_id = NEW.client_id AND task_number = NEW.task_number) THEN
      EXIT;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_retries THEN
      RAISE EXCEPTION 'Failed to generate a unique task number after % attempts.', v_max_retries;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger for before insert on tasks
DROP TRIGGER IF EXISTS on_task_insert ON public.tasks;
CREATE TRIGGER on_task_insert
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_number();

-- Update handle_audit_execution_finalized to rely on the trigger
CREATE OR REPLACE FUNCTION public.handle_audit_execution_finalized()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
DECLARE
  v_audit record;
  v_type_id uuid;
  v_status_id uuid;
  v_requester_id uuid;
  v_next_date timestamptz;
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
  
  RETURN NEW;
END;
$$;

-- Ensure the seed user lptamborini@hotmail.com is present in auth.users
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lptamborini@hotmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'lptamborini@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin LP"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, role)
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'Admin LP', 'Master')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
