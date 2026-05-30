DO $$
BEGIN
  ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS scoring_settings JSONB DEFAULT '[{"score": 1, "description": "Muito Ruim"}, {"score": 2, "description": "Ruim"}, {"score": 3, "description": "Regular"}, {"score": 4, "description": "Bom"}, {"score": 5, "description": "Excelente"}]'::jsonb;
  
  ALTER TABLE public.audit_actions ADD COLUMN IF NOT EXISTS weight NUMERIC NOT NULL DEFAULT 1;
END $$;

CREATE OR REPLACE FUNCTION public.submit_audit_execution(p_execution_id uuid, p_answers jsonb, p_participants text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_client_id uuid;
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
BEGIN
  -- Get execution details
  SELECT a.client_id, e.task_id, a.scoring_settings INTO v_client_id, v_task_id, v_scoring_settings
  FROM public.audit_executions e
  JOIN public.audits a ON a.id = e.audit_id
  WHERE e.id = p_execution_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found';
  END IF;

  -- Determine max score from scale
  IF v_scoring_settings IS NOT NULL AND jsonb_typeof(v_scoring_settings) = 'array' AND jsonb_array_length(v_scoring_settings) > 0 THEN
    SELECT COALESCE(MAX((value->>'score')::numeric), 5) INTO v_audit_max_scale
    FROM jsonb_array_elements(v_scoring_settings);
  END IF;

  -- Process answers and calculate scores
  IF p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
      v_answer_score := (v_answer.value->>'score')::numeric;
      
      -- Get weight for the action
      SELECT COALESCE(weight, 1) INTO v_action_weight
      FROM public.audit_actions
      WHERE id = (v_answer.value->>'action_id')::uuid;

      v_answer_max_score := v_audit_max_scale * COALESCE(v_action_weight, 1);
      
      -- Only add to max_score if the question was actually answered (not N/A)
      IF v_answer_score IS NOT NULL THEN
        -- calculate weighted score
        v_answer_score := v_answer_score * COALESCE(v_action_weight, 1);
      ELSIF v_answer_score IS NULL THEN
        v_answer_max_score := 0; -- N/A doesn't count towards max score
      END IF;
      
      INSERT INTO public.audit_execution_answers (
        execution_id, action_id, score, observations, evidence_url
      ) VALUES (
        p_execution_id,
        (v_answer.value->>'action_id')::uuid,
        (v_answer.value->>'score')::integer,
        v_answer.value->>'observations',
        v_answer.value->>'evidence_url'
      )
      ON CONFLICT (execution_id, action_id) DO UPDATE SET
        score = EXCLUDED.score,
        observations = EXCLUDED.observations,
        evidence_url = EXCLUDED.evidence_url;

      v_final_score := v_final_score + COALESCE(v_answer_score, 0);
      v_max_score := v_max_score + COALESCE(v_answer_max_score, 0);
      v_action_count := v_action_count + 1;
    END LOOP;
  END IF;

  -- Update execution status to transition from Pendente to Finalizado
  -- Update dates and save aggregated scores
  UPDATE public.audit_executions SET
    status = 'Finalizado',
    realization_date = CURRENT_DATE,
    participants = p_participants,
    final_score = v_final_score,
    max_score = v_max_score
  WHERE id = p_execution_id;

  -- Update related task to sync modules
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
