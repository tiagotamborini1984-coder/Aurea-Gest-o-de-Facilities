-- Function to submit an audit execution and calculate scores automatically
CREATE OR REPLACE FUNCTION public.submit_audit_execution(
  p_execution_id uuid,
  p_answers jsonb,
  p_participants text
) RETURNS jsonb AS $$
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
BEGIN
  -- Get execution details
  SELECT a.client_id, e.task_id INTO v_client_id, v_task_id
  FROM public.audit_executions e
  JOIN public.audits a ON a.id = e.audit_id
  WHERE e.id = p_execution_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Execution not found';
  END IF;

  -- Process answers and calculate scores
  IF p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
      v_answer_score := (v_answer.value->>'score')::numeric;
      v_answer_max_score := COALESCE((v_answer.value->>'max_score')::numeric, 100);
      
      INSERT INTO public.audit_execution_answers (
        execution_id, action_id, score, observations, evidence_url
      ) VALUES (
        p_execution_id,
        (v_answer.value->>'action_id')::uuid,
        v_answer_score::integer,
        v_answer.value->>'observations',
        v_answer.value->>'evidence_url'
      )
      ON CONFLICT (execution_id, action_id) DO UPDATE SET
        score = EXCLUDED.score,
        observations = EXCLUDED.observations,
        evidence_url = EXCLUDED.evidence_url;

      v_final_score := v_final_score + COALESCE(v_answer_score, 0);
      v_max_score := v_max_score + v_answer_max_score;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
