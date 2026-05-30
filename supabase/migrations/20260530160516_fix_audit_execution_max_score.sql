DO $$
DECLARE
  v_execution RECORD;
  v_audit_max_scale numeric;
  v_total_max_score numeric;
BEGIN
  FOR v_execution IN 
    SELECT e.id, e.audit_id, a.scoring_settings
    FROM public.audit_executions e
    JOIN public.audits a ON a.id = e.audit_id
    WHERE e.max_score IS NULL OR e.max_score = 0
  LOOP
    -- Calculate max scale (fallback to 5)
    v_audit_max_scale := 5;
    
    -- Extract max scale from scoring settings if available
    IF v_execution.scoring_settings IS NOT NULL AND jsonb_typeof(v_execution.scoring_settings) = 'array' AND jsonb_array_length(v_execution.scoring_settings) > 0 THEN
      SELECT COALESCE(MAX((value->>'score')::numeric), 5) INTO v_audit_max_scale
      FROM jsonb_array_elements(v_execution.scoring_settings);
    END IF;

    -- Calculate total max score by summing the (weight * max_scale) of all actions
    SELECT COALESCE(SUM(v_audit_max_scale * COALESCE(weight, 1)), 0) INTO v_total_max_score
    FROM public.audit_actions
    WHERE audit_id = v_execution.audit_id;

    -- Update the execution record
    IF v_total_max_score > 0 THEN
      UPDATE public.audit_executions
      SET max_score = v_total_max_score
      WHERE id = v_execution.id;
    END IF;
  END LOOP;
END $$;
