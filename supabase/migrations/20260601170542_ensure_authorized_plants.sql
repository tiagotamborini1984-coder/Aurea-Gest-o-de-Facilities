DO $$
BEGIN
  -- Ensure authorized_plants column exists and defaults to an empty JSON array
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS authorized_plants jsonb DEFAULT '[]'::jsonb;
END $$;
