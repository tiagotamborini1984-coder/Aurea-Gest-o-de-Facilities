DO $DO$
BEGIN
  -- Recalculate max_score and final_score for all existing audit executions based on answers and weights
  WITH AuditScores AS (
    SELECT 
      a.id AS audit_id,
      COALESCE(
        (SELECT MAX((s->>'score')::numeric) 
         FROM jsonb_array_elements(
           CASE jsonb_typeof(a.scoring_settings) WHEN 'array' THEN a.scoring_settings ELSE '[]'::jsonb END
         ) AS s
        ), 5
      ) AS max_possible_score
    FROM public.audits a
  ),
  AuditMaxScore AS (
    SELECT 
      aa.audit_id,
      SUM(COALESCE(aa.weight, 1) * ascores.max_possible_score) as calculated_max_score
    FROM public.audit_actions aa
    JOIN AuditScores ascores ON ascores.audit_id = aa.audit_id
    GROUP BY aa.audit_id
  ),
  ExecScores AS (
    SELECT 
      ae.id as execution_id,
      ae.audit_id,
      SUM(COALESCE(aea.score, 0) * COALESCE(aa.weight, 1)) as calculated_final_score
    FROM public.audit_executions ae
    JOIN public.audit_execution_answers aea ON aea.execution_id = ae.id
    LEFT JOIN public.audit_actions aa ON aa.id = aea.action_id
    GROUP BY ae.id, ae.audit_id
  )
  UPDATE public.audit_executions ae
  SET 
    final_score = es.calculated_final_score,
    max_score = COALESCE(ams.calculated_max_score, es.calculated_final_score)
  FROM ExecScores es
  LEFT JOIN AuditMaxScore ams ON ams.audit_id = es.audit_id
  WHERE ae.id = es.execution_id
    AND lower(ae.status) IN ('finalizado', 'finalizada', 'concluido', 'concluído', 'concluida', 'concluída', 'realizado', 'realizada', 'finished', 'completed')
    AND (
      ae.final_score IS DISTINCT FROM es.calculated_final_score OR 
      ae.max_score IS DISTINCT FROM COALESCE(ams.calculated_max_score, es.calculated_final_score)
    );
END $DO$;
