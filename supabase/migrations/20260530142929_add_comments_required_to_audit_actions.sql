DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'audit_actions' 
      AND column_name = 'comments_required'
  ) THEN
    ALTER TABLE public.audit_actions ADD COLUMN comments_required boolean NOT NULL DEFAULT false;
  END IF;
END $$;
