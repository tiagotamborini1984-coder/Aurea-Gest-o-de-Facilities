ALTER TABLE IF EXISTS public.sector_documents ADD COLUMN IF NOT EXISTS file_urls jsonb DEFAULT '[]'::jsonb;
