ALTER TABLE public.cleaning_gardening_schedules 
ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'::jsonb;
