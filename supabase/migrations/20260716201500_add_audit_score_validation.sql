-- Add mandatory score validation to submit_audit_execution
-- This ensures non-draft submissions are rejected if any audit action lacks a score
CREATE OR REPLACE FUNCTION public.submit_audit_execution(
  p_execution_id uuid,
  p_answers jsonb,
  p_participants text,
  p_is_draft boolean DEFAULT false,
  p_signatures jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_audit_id uuid;
  v_task_id uuid;
  v_client_id uuid;
  v_terminal_status_id uuid;
  v_total_score numeric := 0;
  v_max_score numeric := 0;
  v_answer jsonb;
  v_action_id uuid;
  v_score numeric;
  v_weight numeric;
  v_evidence text;
  v_evidence_urls jsonb;
  v_obs text;
  v_corrective_assignee uuid;
  v_corrective_due date;
  v_max_possible_score numeric := 0;
  v_new_status text;
  v_user_id uuid;
  v_missing_count integer := 0;
BEGIN
  SELECT audit_id, task_id INTO v_audit_id, v_task_id
  FROM public.audit_executions
  WHERE id = p_execution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Execution not found';
  END IF;

  SELECT client_id INTO v_client_id
  FROM public.audits
  WHERE id = v_audit_id;

  -- Validation guard: reject non-draft submissions if any action has no score
  IF NOT p_is_draft THEN
    SELECT COUNT(*) INTO v_missing_count
    FROM public.audit_actions aa
    WHERE aa.audit_id = v_audit_id
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(
          CASE jsonb_typeof(p_answers)
            WHEN 'array' THEN p_answers
            ELSE '[]'::jsonb
          END
        ) AS ans
        WHERE ans ? 'action_id'
          AND (ans->>'action_id')::uuid = aa.id
          AND ans ? 'score'
          AND (ans->>'score') IS NOT NULL
      );

    IF v_missing_count > 0 THEN
      RAISE EXCEPTION 'Todos os campos de nota são obrigatórios. Por favor, preencha todas as perguntas antes de salvar.';
    END IF;
  END IF;

  DELETE FROM public.audit_execution_answers WHERE execution_id = p_execution_id;

  SELECT COALESCE(MAX((s->>'score')::numeric), 5) INTO v_max_possible_score
  FROM public.audits a
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE jsonb_typeof(a.scoring_settings)
      WHEN 'array' THEN a.scoring_settings
      ELSE '[]'::jsonb
    END
  ) s ON true
  WHERE a.id = v_audit_id;

  SELECT COALESCE(SUM(weight * v_max_possible_score), 0) INTO v_max_score
  FROM public.audit_actions
  WHERE audit_id = v_audit_id;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(
    CASE jsonb_typeof(p_answers)
      WHEN 'array' THEN p_answers
      ELSE '[]'::jsonb
    END
  )
  LOOP
    IF v_answer ? 'value' THEN
      v_answer := v_answer->'value';
    END IF;

    v_action_id := (v_answer->>'action_id')::uuid;
    v_score := (v_answer->>'score')::numeric;
    v_evidence := v_answer->>'evidence_url';
    v_evidence_urls := COALESCE(v_answer->'evidence_urls', '[]'::jsonb);
    v_obs := v_answer->>'observations';

    BEGIN
      v_corrective_assignee := (v_answer->>'corrective_assignee_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_corrective_assignee := NULL;
    END;

    BEGIN
      v_corrective_due := (v_answer->>'corrective_due_date')::date;
    EXCEPTION WHEN OTHERS THEN
      v_corrective_due := NULL;
    END;

    SELECT weight INTO v_weight FROM public.audit_actions WHERE id = v_action_id;
    IF v_weight IS NULL THEN v_weight := 1; END IF;

    IF v_score IS NOT NULL THEN
      v_total_score := v_total_score + (v_score * v_weight);
    END IF;

    IF v_action_id IS NOT NULL THEN
      INSERT INTO public.audit_execution_answers (
        execution_id, action_id, score, evidence_url, evidence_urls,
        observations, corrective_assignee_id, corrective_due_date
      ) VALUES (
        p_execution_id, v_action_id, v_score, v_evidence, v_evidence_urls,
        v_obs, v_corrective_assignee, v_corrective_due
      )
      ON CONFLICT (execution_id, action_id) DO UPDATE SET
        score = EXCLUDED.score,
        evidence_url = EXCLUDED.evidence_url,
        evidence_urls = EXCLUDED.evidence_urls,
        observations = EXCLUDED.observations,
        corrective_assignee_id = EXCLUDED.corrective_assignee_id,
        corrective_due_date = EXCLUDED.corrective_due_date;
    END IF;
  END LOOP;

  v_new_status := CASE WHEN p_is_draft THEN 'Em Andamento' ELSE 'Finalizado' END;

  UPDATE public.audit_executions
  SET
    status = v_new_status,
    participants = p_participants,
    signatures = p_signatures,
    final_score = v_total_score,
    max_score = CASE WHEN v_max_score > 0 THEN v_max_score ELSE 1 END,
    realization_date = CASE WHEN NOT p_is_draft THEN COALESCE(realization_date, CURRENT_DATE) ELSE realization_date END
  WHERE id = p_execution_id;

  IF NOT p_is_draft AND v_task_id IS NOT NULL THEN
    SELECT id INTO v_terminal_status_id
    FROM public.task_statuses
    WHERE client_id = v_client_id AND is_terminal = true
    ORDER BY created_at ASC LIMIT 1;

    IF v_terminal_status_id IS NOT NULL THEN
      UPDATE public.tasks
      SET status_id = v_terminal_status_id,
          closed_at = COALESCE(closed_at, NOW())
      WHERE id = v_task_id;
    END IF;
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users
    WHERE id IN (SELECT id FROM public.profiles WHERE client_id = v_client_id LIMIT 1)
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
    VALUES (
      v_client_id,
      v_user_id,
      CASE WHEN p_is_draft THEN 'AUDIT_SAVED_DRAFT' ELSE 'AUDIT_FINALIZED' END,
      'Auditoria ' || p_execution_id::text || ' ' || CASE WHEN p_is_draft THEN 'salva como rascunho' ELSE 'finalizada' END || '. Score: ' || v_total_score::text || '/' || v_max_score::text
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'final_score', v_total_score, 'max_score', v_max_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
