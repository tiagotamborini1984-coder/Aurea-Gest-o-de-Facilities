-- Migration to safely clean artificial rebuild_20261020 data and prepare for restore injection
DO $$
BEGIN
  -- Unlink tasks first so SET NULL does not trigger or leave undefined state
  UPDATE public.tasks
  SET audit_id = NULL
  WHERE audit_id IN (SELECT id FROM public.audits WHERE reconstruction_batch = 'rebuild_20261020');

  -- Delete artificial executions directly first
  DELETE FROM public.audit_executions WHERE reconstruction_batch = 'rebuild_20261020';

  -- Delete artificial audits
  DELETE FROM public.audits WHERE reconstruction_batch = 'rebuild_20261020';
END $$;
