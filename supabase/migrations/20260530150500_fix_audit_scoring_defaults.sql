DO $$
BEGIN
  ALTER TABLE public.audits ALTER COLUMN scoring_settings SET DEFAULT '[
    {"score": 1, "description": "Muito Ruim", "trigger_task": true},
    {"score": 2, "description": "Ruim", "trigger_task": true},
    {"score": 3, "description": "Regular", "trigger_task": false},
    {"score": 4, "description": "Bom", "trigger_task": false},
    {"score": 5, "description": "Excelente", "trigger_task": false}
  ]'::jsonb;

  UPDATE public.audits a
  SET scoring_settings = (
    SELECT jsonb_agg(
      CASE 
        WHEN elem ? 'trigger_task' THEN elem
        ELSE jsonb_set(
          elem, 
          '{trigger_task}', 
          (CASE WHEN COALESCE((elem->>'score')::numeric, 0) <= 2 THEN 'true' ELSE 'false' END)::jsonb
        )
      END
    )
    FROM jsonb_array_elements(a.scoring_settings) AS elem
  )
  WHERE a.scoring_settings IS NOT NULL AND jsonb_typeof(a.scoring_settings) = 'array';
END $$;
