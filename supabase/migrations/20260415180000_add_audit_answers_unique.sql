DO $$
BEGIN
  -- Clean up duplicates by keeping only the latest answer per execution/action
  DELETE FROM public.audit_execution_answers a
  USING public.audit_execution_answers b
  WHERE a.id > b.id AND a.execution_id = b.execution_id AND a.action_id = b.action_id;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_execution_answers_execution_action_key'
  ) THEN
    ALTER TABLE public.audit_execution_answers
    ADD CONSTRAINT audit_execution_answers_execution_action_key UNIQUE (execution_id, action_id);
  END IF;
END $$;
