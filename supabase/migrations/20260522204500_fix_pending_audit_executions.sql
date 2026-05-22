DO $$
DECLARE
  rec record;
  v_final numeric;
  v_max numeric;
BEGIN
  -- Find all pending executions that have at least one answer
  FOR rec IN 
    SELECT e.id
    FROM public.audit_executions e
    WHERE e.status = 'Pendente'
      AND EXISTS (SELECT 1 FROM public.audit_execution_answers aea WHERE aea.execution_id = e.id)
  LOOP
    -- Calculate final score and max score based on 100 max per action question
    SELECT SUM(COALESCE(score, 0)), COUNT(*) * 100 
    INTO v_final, v_max
    FROM public.audit_execution_answers
    WHERE execution_id = rec.id;

    -- Update the execution to Finalizado
    UPDATE public.audit_executions
    SET status = 'Finalizado',
        realization_date = COALESCE(realization_date, created_at::date),
        final_score = COALESCE(v_final, 0),
        max_score = COALESCE(v_max, 0)
    WHERE id = rec.id;
  END LOOP;
END $$;
