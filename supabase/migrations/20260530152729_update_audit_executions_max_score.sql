DO $$
DECLARE
  v_exec RECORD;
  v_max_scale NUMERIC;
  v_total_weight NUMERIC;
  v_new_max_score NUMERIC;
BEGIN
  FOR v_exec IN
    SELECT e.id, e.audit_id, a.scoring_settings
    FROM public.audit_executions e
    JOIN public.audits a ON a.id = e.audit_id
    WHERE e.max_score IS NULL
  LOOP
    v_max_scale := 5; -- default
    IF jsonb_typeof(v_exec.scoring_settings) = 'array' THEN
      SELECT COALESCE(MAX((val->>'score')::numeric), 5) INTO v_max_scale
      FROM jsonb_array_elements(v_exec.scoring_settings) AS val;
    END IF;
    
    SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
    FROM public.audit_actions
    WHERE audit_id = v_exec.audit_id;
    
    v_new_max_score := v_max_scale * v_total_weight;
    
    UPDATE public.audit_executions
    SET max_score = v_new_max_score
    WHERE id = v_exec.id;
  END LOOP;
END $$;
