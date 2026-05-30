DO $$
BEGIN
  ALTER TABLE public.audit_execution_answers ADD COLUMN IF NOT EXISTS corrective_assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.audit_execution_answers ADD COLUMN IF NOT EXISTS corrective_due_date timestamptz;
END $$;

DROP FUNCTION IF EXISTS public.submit_audit_execution(uuid, jsonb, text);

CREATE OR REPLACE FUNCTION public.submit_audit_execution(p_execution_id uuid, p_answers jsonb, p_participants text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_client_id uuid;
  v_plant_id uuid;
  v_task_id uuid;
  v_terminal_status_id uuid;
  v_final_score numeric := 0;
  v_max_score numeric := 0;
  v_action_count int := 0;
  v_answer record;
  v_answer_score numeric;
  v_answer_max_score numeric;
  v_action_weight numeric;
  v_audit_max_scale numeric := 5;
  v_scoring_settings jsonb;
  
  v_audit_title text;
  v_action_title text;
  
  v_task_type_id uuid;
  v_open_status_id uuid;
  v_task_number text;
  v_task_seq int;
  v_task_year text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  SELECT a.client_id, e.task_id, a.scoring_settings, e.plant_id, a.title
  INTO v_client_id, v_task_id, v_scoring_settings, v_plant_id, v_audit_title
  FROM public.audit_executions e
  JOIN public.audits a ON a.id = e.audit_id
  WHERE e.id = p_execution_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found';
  END IF;

  IF v_scoring_settings IS NOT NULL AND jsonb_typeof(v_scoring_settings) = 'array' AND jsonb_array_length(v_scoring_settings) > 0 THEN
    SELECT COALESCE(MAX((value->>'score')::numeric), 5) INTO v_audit_max_scale
    FROM jsonb_array_elements(v_scoring_settings);
  END IF;

  SELECT id INTO v_task_type_id FROM public.task_types WHERE client_id = v_client_id AND name ILIKE '%Corretiva%' LIMIT 1;
  IF v_task_type_id IS NULL THEN
    SELECT id INTO v_task_type_id FROM public.task_types WHERE client_id = v_client_id ORDER BY created_at ASC LIMIT 1;
  END IF;
  
  SELECT id INTO v_open_status_id FROM public.task_statuses WHERE client_id = v_client_id AND is_terminal = false ORDER BY created_at ASC LIMIT 1;
  v_task_year := to_char(NOW(), 'YYYY');

  IF p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
      v_answer_score := (v_answer.value->>'score')::numeric;
      
      SELECT COALESCE(weight, 1), title INTO v_action_weight, v_action_title
      FROM public.audit_actions
      WHERE id = (v_answer.value->>'action_id')::uuid;

      v_answer_max_score := v_audit_max_scale * COALESCE(v_action_weight, 1);
      
      IF v_answer_score IS NOT NULL THEN
        v_answer_score := v_answer_score * COALESCE(v_action_weight, 1);
      ELSIF v_answer_score IS NULL THEN
        v_answer_max_score := 0;
      END IF;
      
      INSERT INTO public.audit_execution_answers (
        execution_id, action_id, score, observations, evidence_url, corrective_assignee_id, corrective_due_date
      ) VALUES (
        p_execution_id,
        (v_answer.value->>'action_id')::uuid,
        (v_answer.value->>'score')::integer,
        v_answer.value->>'observations',
        v_answer.value->>'evidence_url',
        NULLIF(v_answer.value->>'corrective_assignee_id', '')::uuid,
        NULLIF(v_answer.value->>'corrective_due_date', '')::timestamptz
      )
      ON CONFLICT (execution_id, action_id) DO UPDATE SET
        score = EXCLUDED.score,
        observations = EXCLUDED.observations,
        evidence_url = EXCLUDED.evidence_url,
        corrective_assignee_id = EXCLUDED.corrective_assignee_id,
        corrective_due_date = EXCLUDED.corrective_due_date;

      v_final_score := v_final_score + COALESCE(v_answer_score, 0);
      v_max_score := v_max_score + COALESCE(v_answer_max_score, 0);
      v_action_count := v_action_count + 1;

      IF v_answer.value->>'score' IS NOT NULL AND v_scoring_settings IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM jsonb_array_elements(v_scoring_settings) AS s
          WHERE (s->>'score')::numeric = (v_answer.value->>'score')::numeric
            AND (s->>'trigger_task')::boolean = true
        ) AND NULLIF(v_answer.value->>'corrective_assignee_id', '') IS NOT NULL THEN
          
          PERFORM pg_advisory_xact_lock(hashtext(v_client_id::text));
          SELECT COALESCE(MAX(SUBSTRING(task_number FROM 'TSK-\d{4}-([0-9]+)')::INT), 0) + 1 INTO v_task_seq
          FROM public.tasks
          WHERE client_id = v_client_id AND task_number LIKE 'TSK-' || v_task_year || '-%';
          v_task_number := 'TSK-' || v_task_year || '-' || LPAD(v_task_seq::TEXT, 4, '0');

          INSERT INTO public.tasks (
            client_id, plant_id, type_id, status_id, requester_id, assignee_id,
            task_number, title, description, due_date, status_updated_at
          ) VALUES (
            v_client_id,
            v_plant_id,
            v_task_type_id,
            v_open_status_id,
            COALESCE(v_user_id, NULLIF(v_answer.value->>'corrective_assignee_id', '')::uuid),
            NULLIF(v_answer.value->>'corrective_assignee_id', '')::uuid,
            v_task_number,
            'Ação Corretiva: ' || v_audit_title || ' - ' || v_action_title,
            COALESCE(v_answer.value->>'observations', 'Ação corretiva gerada automaticamente a partir de auditoria.'),
            NULLIF(v_answer.value->>'corrective_due_date', '')::timestamptz,
            NOW()
          );
        END IF;
      END IF;

    END LOOP;
  END IF;

  UPDATE public.audit_executions SET
    status = 'Finalizado',
    realization_date = CURRENT_DATE,
    participants = p_participants,
    final_score = v_final_score,
    max_score = v_max_score
  WHERE id = p_execution_id;

  IF v_task_id IS NOT NULL THEN
    SELECT id INTO v_terminal_status_id 
    FROM public.task_statuses 
    WHERE client_id = v_client_id AND is_terminal = true 
    ORDER BY created_at ASC LIMIT 1;

    IF v_terminal_status_id IS NOT NULL THEN
      UPDATE public.tasks SET 
        status_id = v_terminal_status_id,
        closed_at = NOW(),
        status_updated_at = NOW()
      WHERE id = v_task_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'final_score', v_final_score,
    'max_score', v_max_score
  );
END;
$function$;

DO $$
DECLARE
  v_client_id uuid;
  v_audit_id uuid;
  v_plant_id uuid;
  v_assignee_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients LIMIT 1;
  SELECT id INTO v_plant_id FROM public.plants WHERE client_id = v_client_id LIMIT 1;
  SELECT id INTO v_assignee_id FROM public.profiles WHERE client_id = v_client_id LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    INSERT INTO public.audits (
      client_id, title, type, frequency, start_date, advance_notice_days,
      scoring_settings
    ) VALUES (
      v_client_id,
      'Auditoria de Qualidade (Exemplo Corretiva)',
      'Qualidade',
      'Única',
      CURRENT_DATE,
      0,
      '[
        {"score": 1, "description": "Muito Ruim", "trigger_task": true},
        {"score": 2, "description": "Ruim", "trigger_task": true},
        {"score": 3, "description": "Regular", "trigger_task": true},
        {"score": 4, "description": "Bom", "trigger_task": false},
        {"score": 5, "description": "Excelente", "trigger_task": false}
      ]'::jsonb
    ) RETURNING id INTO v_audit_id;

    INSERT INTO public.audit_actions (audit_id, title, evidence_required, order_index, weight)
    VALUES
      (v_audit_id, 'Limpeza do ambiente e organização', true, 1, 1),
      (v_audit_id, 'Uso correto de EPIs pela equipe', true, 2, 2);

    IF v_plant_id IS NOT NULL AND v_assignee_id IS NOT NULL THEN
      INSERT INTO public.audit_executions (
        audit_id, plant_id, assignee_id, status
      ) VALUES (
        v_audit_id, v_plant_id, v_assignee_id, 'Pendente'
      );
    END IF;
  END IF;
END $$;
