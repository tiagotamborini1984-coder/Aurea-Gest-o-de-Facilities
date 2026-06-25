ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS feature_permissions JSONB DEFAULT '{}'::jsonb;
