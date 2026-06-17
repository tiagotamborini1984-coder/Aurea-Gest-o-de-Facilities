-- Add evidence_urls column to audit_execution_answers
ALTER TABLE public.audit_execution_answers ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'::jsonb;

-- Recreate the submit_audit_execution function to handle evidence_urls and calculate max_score
CREATE OR REPLACE FUNCTION public.submit_audit_execution(
  p_execution_id UUID,
  p_answers JSONB,
  p_participants TEXT,
  p_is_draft BOOLEAN,
  p_signatures JSONB DEFAULT '[]'::jsonb
) RETURNS void AS $func$
DECLARE
  v_answer JSONB;
  v_action_id UUID;
  v_score INT;
  v_obs TEXT;
  v_evidence TEXT;
  v_evidence_urls JSONB;
  v_assignee UUID;
  v_due_date DATE;
BEGIN
  -- Update execution status and participants
  UPDATE public.audit_executions
  SET 
    status = CASE WHEN p_is_draft THEN 'Em Andamento' ELSE 'Finalizado' END,
    participants = p_participants,
    signatures = p_signatures,
    realization_date = CASE WHEN NOT p_is_draft AND realization_date IS NULL THEN CURRENT_DATE ELSE realization_date END
  WHERE id = p_execution_id;

  -- Delete existing answers to replace them
  DELETE FROM public.audit_execution_answers WHERE execution_id = p_execution_id;

  -- Loop answers and insert
  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    v_action_id := (v_answer->'value'->>'action_id')::UUID;
    
    IF (v_answer->'value'->>'score') IS NOT NULL AND (v_answer->'value'->>'score') != '' THEN
      v_score := (v_answer->'value'->>'score')::INT;
    ELSE
      v_score := NULL;
    END IF;

    v_obs := v_answer->'value'->>'observations';
    v_evidence := v_answer->'value'->>'evidence_url';
    
    IF v_answer->'value' ? 'evidence_urls' THEN
      v_evidence_urls := v_answer->'value'->'evidence_urls';
    ELSE
      v_evidence_urls := '[]'::jsonb;
    END IF;

    IF (v_answer->'value'->>'corrective_assignee_id') IS NOT NULL AND (v_answer->'value'->>'corrective_assignee_id') != '' THEN
      v_assignee := (v_answer->'value'->>'corrective_assignee_id')::UUID;
    ELSE
      v_assignee := NULL;
    END IF;

    IF (v_answer->'value'->>'corrective_due_date') IS NOT NULL AND (v_answer->'value'->>'corrective_due_date') != '' THEN
      v_due_date := (v_answer->'value'->>'corrective_due_date')::DATE;
    ELSE
      v_due_date := NULL;
    END IF;

    INSERT INTO public.audit_execution_answers (
      execution_id, action_id, score, observations, evidence_url, evidence_urls, corrective_assignee_id, corrective_due_date
    ) VALUES (
      p_execution_id, v_action_id, v_score, v_obs, v_evidence, v_evidence_urls, v_assignee, v_due_date
    );
  END LOOP;

  -- Update final_score and max_score if not draft
  IF NOT p_is_draft THEN
    WITH audit_info AS (
      SELECT a.scoring_settings
      FROM public.audit_executions ae
      JOIN public.audits a ON a.id = ae.audit_id
      WHERE ae.id = p_execution_id
    ),
    max_val AS (
      SELECT MAX((s->>'score')::INT) as m_score
      FROM audit_info, jsonb_array_elements(scoring_settings) s
    ),
    scores AS (
      SELECT 
        SUM(ans.score * COALESCE(act.weight, 1)) as total_score,
        SUM((SELECT COALESCE(m_score, 5) FROM max_val) * COALESCE(act.weight, 1)) as max_sc
      FROM public.audit_execution_answers ans
      JOIN public.audit_actions act ON act.id = ans.action_id
      WHERE ans.execution_id = p_execution_id AND ans.score IS NOT NULL
    )
    UPDATE public.audit_executions
    SET 
      final_score = COALESCE(scores.total_score, 0),
      max_score = COALESCE(scores.max_sc, 0)
    FROM scores
    WHERE public.audit_executions.id = p_execution_id;
  END IF;

END;
$func$ LANGUAGE plpgsql;
