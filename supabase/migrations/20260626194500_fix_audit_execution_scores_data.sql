-- 1. Create function and trigger for safety (calculates final score when status changes to Finalizado manually)
CREATE OR REPLACE FUNCTION public.calculate_audit_execution_score()
RETURNS trigger AS $DO$
DECLARE
  v_total_score numeric := 0;
  v_max_score numeric := 0;
  v_max_possible_score numeric := 5;
BEGIN
  IF NEW.status IN ('Finalizado', 'Finalizada', 'Concluído', 'Concluída', 'Realizado', 'Realizada') 
     AND NEW.final_score IS NULL THEN
     
    -- Calculate max possible score
    SELECT COALESCE(MAX((s->>'score')::numeric), 5) INTO v_max_possible_score
    FROM public.audits a
    LEFT JOIN LATERAL jsonb_array_elements(
      CASE jsonb_typeof(a.scoring_settings)
        WHEN 'array' THEN a.scoring_settings
        ELSE '[]'::jsonb
      END
    ) s ON true
    WHERE a.id = NEW.audit_id;

    -- Calculate max score based on action weights
    SELECT COALESCE(SUM(weight * v_max_possible_score), 0) INTO v_max_score
    FROM public.audit_actions
    WHERE audit_id = NEW.audit_id;

    -- Calculate final score based on actual answers
    SELECT COALESCE(SUM(aea.score * COALESCE(aa.weight, 1)), 0) INTO v_total_score
    FROM public.audit_execution_answers aea
    JOIN public.audit_actions aa ON aa.id = aea.action_id
    WHERE aea.execution_id = NEW.id;

    NEW.final_score := v_total_score;
    NEW.max_score := v_max_score;
  END IF;

  RETURN NEW;
END;
$DO$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_calculate_audit_execution_score ON public.audit_executions;
CREATE TRIGGER trigger_calculate_audit_execution_score
BEFORE INSERT OR UPDATE OF status ON public.audit_executions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_audit_execution_score();

-- 2. Verify and enforce submit_audit_execution to ensure it saves scores correctly
CREATE OR REPLACE FUNCTION public.submit_audit_execution(
  p_execution_id uuid,
  p_answers jsonb,
  p_participants text,
  p_is_draft boolean DEFAULT false,
  p_signatures jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb AS $DO$
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
  v_obs text;
  v_corrective_assignee uuid;
  v_corrective_due date;
  v_max_possible_score numeric := 0;
BEGIN
  -- Get execution details
  SELECT audit_id, task_id INTO v_audit_id, v_task_id
  FROM public.audit_executions
  WHERE id = p_execution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Execution not found';
  END IF;

  SELECT client_id INTO v_client_id
  FROM public.audits
  WHERE id = v_audit_id;

  -- Clear existing answers
  DELETE FROM public.audit_execution_answers WHERE execution_id = p_execution_id;

  -- Try to get max score from audits scoring settings
  SELECT COALESCE(MAX((s->>'score')::numeric), 5) INTO v_max_possible_score
  FROM public.audits a
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE jsonb_typeof(a.scoring_settings)
      WHEN 'array' THEN a.scoring_settings
      ELSE '[]'::jsonb
    END
  ) s ON true
  WHERE a.id = v_audit_id;

  -- Calculate max_score for the entire audit based on action weights
  SELECT COALESCE(SUM(weight * v_max_possible_score), 0) INTO v_max_score
  FROM public.audit_actions
  WHERE audit_id = v_audit_id;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    v_action_id := (v_answer->>'action_id')::uuid;
    v_score := (v_answer->>'score')::numeric;
    v_evidence := v_answer->>'evidence_url';
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

    INSERT INTO public.audit_execution_answers (
      execution_id, action_id, score, evidence_url, observations, corrective_assignee_id, corrective_due_date
    ) VALUES (
      p_execution_id, v_action_id, v_score, v_evidence, v_obs, v_corrective_assignee, v_corrective_due
    );
  END LOOP;

  -- Guaranteed persistence of final_score and max_score on submission
  UPDATE public.audit_executions
  SET 
    status = CASE WHEN p_is_draft THEN 'Em Andamento' ELSE 'Finalizado' END,
    participants = p_participants,
    signatures = p_signatures,
    final_score = v_total_score,
    max_score = v_max_score,
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

  RETURN jsonb_build_object('success', true, 'final_score', v_total_score, 'max_score', v_max_score);
END;
$DO$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Idempotent Data Migration: Recalculate historical data with missing scores (e.g. TSK-2026-0255)
DO $DO$
DECLARE
  v_row record;
  v_final_score numeric;
  v_max_score numeric;
  v_max_possible_score numeric;
  v_user_id uuid;
BEGIN
  FOR v_row IN 
    SELECT ae.id, ae.audit_id, ae.final_score, ae.max_score, a.client_id, t.task_number
    FROM public.audit_executions ae
    JOIN public.audits a ON a.id = ae.audit_id
    LEFT JOIN public.tasks t ON t.id = ae.task_id
    WHERE ae.status IN ('Finalizado', 'Finalizada', 'Concluído', 'Concluída', 'Realizado', 'Realizada')
      AND (ae.final_score IS NULL OR ae.max_score IS NULL OR ae.max_score = 0 OR ae.final_score = 0)
  LOOP
    -- Calculate max possible score
    SELECT COALESCE(MAX((s->>'score')::numeric), 5) INTO v_max_possible_score
    FROM public.audits a
    LEFT JOIN LATERAL jsonb_array_elements(
      CASE jsonb_typeof(a.scoring_settings)
        WHEN 'array' THEN a.scoring_settings
        ELSE '[]'::jsonb
      END
    ) s ON true
    WHERE a.id = v_row.audit_id;

    -- Calculate max score
    SELECT COALESCE(SUM(weight * v_max_possible_score), 0) INTO v_max_score
    FROM public.audit_actions
    WHERE audit_id = v_row.audit_id;

    -- Calculate final score
    SELECT COALESCE(SUM(aea.score * COALESCE(aa.weight, 1)), 0) INTO v_final_score
    FROM public.audit_execution_answers aea
    JOIN public.audit_actions aa ON aa.id = aea.action_id
    WHERE aea.execution_id = v_row.id;

    -- Update the record to fix data integrity
    UPDATE public.audit_executions
    SET final_score = v_final_score,
        max_score = v_max_score
    WHERE id = v_row.id;

    -- Get an active user to attribute the log, if none available fallback gracefully
    SELECT id INTO v_user_id FROM auth.users WHERE id IN (SELECT id FROM public.profiles WHERE client_id = v_row.client_id) LIMIT 1;

    -- Insert audit log for historical correction
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
      VALUES (
        v_row.client_id,
        v_user_id,
        'SISTEMA_RECALCULO_SCORE',
        'Recálculo automático de score histórico da auditoria ' || COALESCE(v_row.task_number, v_row.id::text) || ': Score atualizado para ' || v_final_score::text || '/' || v_max_score::text
      );
    END IF;
  END LOOP;
END $DO$;

-- 4. Ensure RLS allows selecting audit executions and answers to satisfy UI visibility requirements
DROP POLICY IF EXISTS "authenticated_select_audit_executions" ON public.audit_executions;
CREATE POLICY "authenticated_select_audit_executions" ON public.audit_executions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select_audit_execution_answers" ON public.audit_execution_answers;
CREATE POLICY "authenticated_select_audit_execution_answers" ON public.audit_execution_answers
  FOR SELECT TO authenticated USING (true);

