DO $$
BEGIN
  -- Add evidence_urls if it doesn't exist to store multiple evidences
  ALTER TABLE public.audit_execution_answers ADD COLUMN IF NOT EXISTS evidence_urls jsonb DEFAULT '[]'::jsonb;
END $$;

CREATE OR REPLACE FUNCTION public.submit_audit_execution(
  p_execution_id uuid,
  p_answers jsonb,
  p_participants text,
  p_is_draft boolean DEFAULT false,
  p_signatures jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_action_record record;
  v_answer jsonb;
  v_total_score numeric := 0;
  v_max_score numeric := 0;
  v_audit_id uuid;
  v_new_status text;
  v_realization_date date;
BEGIN
  -- Get audit_id from execution
  SELECT audit_id INTO v_audit_id FROM public.audit_executions WHERE id = p_execution_id;

  -- Process answers atomically
  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    INSERT INTO public.audit_execution_answers (
      execution_id,
      action_id,
      score,
      observations,
      evidence_url,
      evidence_urls,
      corrective_assignee_id,
      corrective_due_date
    ) VALUES (
      p_execution_id,
      (v_answer->'value'->>'action_id')::uuid,
      (v_answer->'value'->>'score')::integer,
      (v_answer->'value'->>'observations')::text,
      (v_answer->'value'->>'evidence_url')::text,
      COALESCE(v_answer->'value'->'evidence_urls', '[]'::jsonb),
      NULLIF(v_answer->'value'->>'corrective_assignee_id', '')::uuid,
      (v_answer->'value'->>'corrective_due_date')::timestamp with time zone
    )
    ON CONFLICT (execution_id, action_id) DO UPDATE SET
      score = EXCLUDED.score,
      observations = EXCLUDED.observations,
      evidence_url = EXCLUDED.evidence_url,
      evidence_urls = EXCLUDED.evidence_urls,
      corrective_assignee_id = EXCLUDED.corrective_assignee_id,
      corrective_due_date = EXCLUDED.corrective_due_date;
  END LOOP;

  -- The maximum score a single action can get from scoring_settings
  SELECT COALESCE(MAX((s->>'score')::numeric), 0) INTO v_max_score
  FROM public.audits a,
       jsonb_array_elements(a.scoring_settings) s
  WHERE a.id = v_audit_id;

  -- Sum of all action weights * max possible score
  SELECT COALESCE(SUM(COALESCE(weight, 1) * v_max_score), 0) INTO v_max_score
  FROM public.audit_actions
  WHERE audit_id = v_audit_id;

  -- Calculate total score from answers based on their weights
  FOR v_action_record IN 
    SELECT a.id, a.weight, e.score 
    FROM public.audit_actions a
    LEFT JOIN public.audit_execution_answers e ON a.id = e.action_id AND e.execution_id = p_execution_id
    WHERE a.audit_id = v_audit_id
  LOOP
    IF v_action_record.score IS NOT NULL THEN
      v_total_score := v_total_score + (v_action_record.score * COALESCE(v_action_record.weight, 1));
    END IF;
  END LOOP;

  -- Determine final status
  IF p_is_draft THEN
    SELECT status INTO v_new_status FROM public.audit_executions WHERE id = p_execution_id;
    IF v_new_status NOT IN ('Finalizado', 'Finalizada', 'Concluído', 'Concluída', 'Realizado', 'Realizada', 'Finished', 'Completed') THEN
      v_new_status := 'Em Andamento';
    END IF;
    v_realization_date := NULL;
  ELSE
    v_new_status := 'Finalizado';
    v_realization_date := CURRENT_DATE;
  END IF;

  UPDATE public.audit_executions
  SET 
    participants = p_participants,
    signatures = p_signatures,
    status = v_new_status,
    realization_date = COALESCE(v_realization_date, realization_date),
    final_score = v_total_score,
    max_score = v_max_score
  WHERE id = p_execution_id;

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Data Migration: Update existing records to 'Finalizado' if they have answers and aren't 'Finalizado' yet
-- Also compute final_score and max_score if missing to prevent "unfilled" rendering in the UI
DO $$
DECLARE
  exec RECORD;
  v_total_score numeric;
  v_max_score numeric;
  v_action_record RECORD;
BEGIN
  FOR exec IN 
    SELECT e.id, e.audit_id, e.status, e.realization_date 
    FROM public.audit_executions e
    WHERE e.status NOT IN ('Finalizado', 'Finalizada', 'Concluído', 'Concluída', 'Realizado', 'Realizada', 'Finished', 'Completed')
      AND EXISTS (SELECT 1 FROM public.audit_execution_answers a WHERE a.execution_id = e.id)
  LOOP
    SELECT COALESCE(MAX((s->>'score')::numeric), 0) INTO v_max_score
    FROM public.audits a,
         jsonb_array_elements(a.scoring_settings) s
    WHERE a.id = exec.audit_id;

    SELECT COALESCE(SUM(COALESCE(weight, 1) * v_max_score), 0) INTO v_max_score
    FROM public.audit_actions
    WHERE audit_id = exec.audit_id;

    v_total_score := 0;
    FOR v_action_record IN 
      SELECT a.weight, e.score 
      FROM public.audit_actions a
      JOIN public.audit_execution_answers e ON a.id = e.action_id AND e.execution_id = exec.id
      WHERE a.audit_id = exec.audit_id
    LOOP
      IF v_action_record.score IS NOT NULL THEN
        v_total_score := v_total_score + (v_action_record.score * COALESCE(v_action_record.weight, 1));
      END IF;
    END LOOP;

    UPDATE public.audit_executions
    SET 
      status = 'Finalizado',
      realization_date = COALESCE(exec.realization_date, CURRENT_DATE),
      final_score = v_total_score,
      max_score = v_max_score
    WHERE id = exec.id;
  END LOOP;
END $$;
