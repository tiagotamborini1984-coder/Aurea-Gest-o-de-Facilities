-- Function to properly handle audit execution submission and generate Non-Conformities linking the audit_id
CREATE OR REPLACE FUNCTION public.submit_audit_execution(
  p_execution_id uuid,
  p_answers jsonb,
  p_participants text,
  p_is_draft boolean DEFAULT false,
  p_signatures jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $BODY$
DECLARE
  v_audit_id uuid;
  v_client_id uuid;
  v_plant_id uuid;
  v_assignee_id uuid;
  v_total_score numeric := 0;
  v_max_score numeric := 0;
  v_action record;
  v_answer jsonb;
  v_score numeric;
  v_audit_title text;
  v_freq text;
  
  -- NC task variables
  v_type_id uuid;
  v_status_id uuid;
  v_due_date timestamptz;
  v_base_date timestamptz;
  v_year text;
  v_seq int;
  v_task_number text;
  v_existing_task uuid;
BEGIN
  -- Get execution details
  SELECT audit_id, plant_id, assignee_id INTO v_audit_id, v_plant_id, v_assignee_id
  FROM public.audit_executions WHERE id = p_execution_id;

  SELECT client_id, title, frequency INTO v_client_id, v_audit_title, v_freq
  FROM public.audits WHERE id = v_audit_id;

  -- Upsert answers
  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    v_score := (v_answer->>'score')::numeric;
    
    INSERT INTO public.audit_execution_answers (
      execution_id, action_id, score, observations, evidence_url, evidence_urls
    ) VALUES (
      p_execution_id,
      (v_answer->>'action_id')::uuid,
      v_score,
      v_answer->>'observations',
      v_answer->>'evidence_url',
      CASE WHEN v_answer->'evidence_urls' IS NOT NULL THEN v_answer->'evidence_urls' ELSE '[]'::jsonb END
    )
    ON CONFLICT (execution_id, action_id) DO UPDATE SET
      score = EXCLUDED.score,
      observations = EXCLUDED.observations,
      evidence_url = EXCLUDED.evidence_url,
      evidence_urls = EXCLUDED.evidence_urls;
  END LOOP;

  IF p_is_draft THEN
    UPDATE public.audit_executions
    SET participants = p_participants, signatures = p_signatures
    WHERE id = p_execution_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'Pendente');
  END IF;

  -- Calculate scores
  SELECT COALESCE(SUM(score), 0) INTO v_total_score
  FROM public.audit_execution_answers WHERE execution_id = p_execution_id;

  SELECT COALESCE(SUM(weight * 5), 0) INTO v_max_score
  FROM public.audit_actions WHERE audit_id = v_audit_id;

  UPDATE public.audit_executions
  SET 
    status = 'Finalizado',
    realization_date = CURRENT_DATE,
    participants = p_participants,
    signatures = p_signatures,
    final_score = v_total_score,
    max_score = v_max_score
  WHERE id = p_execution_id;

  -- Generate NC tasks for scores <= 3
  
  -- Find NC Task Type
  SELECT id INTO v_type_id FROM public.task_types 
  WHERE client_id = v_client_id AND (name ILIKE '%Não Conformidade%' OR name ILIKE '%NC%') LIMIT 1;
  IF v_type_id IS NULL THEN
    SELECT id INTO v_type_id FROM public.task_types WHERE client_id = v_client_id ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- Find Initial Status
  SELECT id INTO v_status_id FROM public.task_statuses
  WHERE client_id = v_client_id AND is_terminal = false ORDER BY created_at ASC LIMIT 1;

  v_base_date := NOW();
  IF v_freq = 'Diária' THEN v_due_date := v_base_date + INTERVAL '1 day';
  ELSIF v_freq = 'Semanal' THEN v_due_date := v_base_date + INTERVAL '7 days';
  ELSIF v_freq = 'Quinzenal' THEN v_due_date := v_base_date + INTERVAL '15 days';
  ELSIF v_freq = 'Mensal' THEN v_due_date := v_base_date + INTERVAL '1 month';
  ELSIF v_freq = 'Bimestral' THEN v_due_date := v_base_date + INTERVAL '2 months';
  ELSIF v_freq = 'Trimestral' THEN v_due_date := v_base_date + INTERVAL '3 months';
  ELSIF v_freq = 'Semestral' THEN v_due_date := v_base_date + INTERVAL '6 months';
  ELSIF v_freq = 'Anual' THEN v_due_date := v_base_date + INTERVAL '1 year';
  ELSE v_due_date := v_base_date + INTERVAL '7 days';
  END IF;

  v_due_date := (v_due_date - INTERVAL '1 day')::date + INTERVAL '23:59:59';
  IF v_due_date < NOW() THEN v_due_date := (NOW()::date) + INTERVAL '23:59:59'; END IF;

  FOR v_action IN (
    SELECT a.id, a.title, e.score, e.observations
    FROM public.audit_actions a
    JOIN public.audit_execution_answers e ON e.action_id = a.id
    WHERE e.execution_id = p_execution_id AND e.score <= 3
  ) LOOP
    
    -- Avoid duplicate open NC for same plant/action
    SELECT t.id INTO v_existing_task
    FROM public.tasks t
    JOIN public.task_statuses ts ON t.status_id = ts.id
    WHERE t.client_id = v_client_id 
      AND t.plant_id = v_plant_id 
      AND t.audit_id = v_audit_id
      AND t.title = 'Não Conformidade: ' || substring(v_action.title from 1 for 50)
      AND ts.is_terminal = false
    LIMIT 1;

    IF v_existing_task IS NULL THEN
      v_year := to_char(NOW(), 'YYYY');
      SELECT COUNT(*) + 1 INTO v_seq FROM public.tasks
      WHERE client_id = v_client_id AND task_number LIKE 'TSK-' || v_year || '-%';
      v_task_number := 'TSK-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

      INSERT INTO public.tasks (
        client_id, plant_id, type_id, status_id, requester_id, assignee_id,
        task_number, title, description, due_date, audit_id, status_updated_at
      ) VALUES (
        v_client_id, v_plant_id, v_type_id, v_status_id, v_assignee_id, v_assignee_id,
        v_task_number,
        'Não Conformidade: ' || substring(v_action.title from 1 for 50),
        'Foi identificada uma Não Conformidade durante a auditoria "' || v_audit_title || '".' || E'\n\n' ||
        'Ação Avaliada: ' || v_action.title || E'\n' ||
        'Nota: ' || v_action.score || E'\n' ||
        'Observações: ' || COALESCE(v_action.observations, 'Nenhuma') || E'\n\n' ||
        'Favor providenciar correção até a data limite.',
        v_due_date,
        v_audit_id,
        NOW()
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'status', 'Finalizado', 'final_score', v_total_score, 'max_score', v_max_score);
END;
$BODY$;

-- Backfill missing audit_id in existing tasks (where description contains audit title)
DO $BODY$
BEGIN
  UPDATE public.tasks t
  SET audit_id = a.id
  FROM public.audits a
  WHERE t.audit_id IS NULL 
    AND t.client_id = a.client_id
    AND t.description LIKE '%durante a auditoria "' || a.title || '"%';
END $BODY$;
