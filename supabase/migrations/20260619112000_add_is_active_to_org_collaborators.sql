DO $$
BEGIN
  ALTER TABLE public.org_collaborators ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
END $$;
