-- Add map_url to plants
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS map_url TEXT;

-- Add polygon_data to cleaning_gardening_areas
ALTER TABLE public.cleaning_gardening_areas ADD COLUMN IF NOT EXISTS polygon_data JSONB;

-- Create storage bucket for plants if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('plants', 'plants', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "public_plants" ON storage.objects;
CREATE POLICY "public_plants" ON storage.objects FOR SELECT USING (bucket_id = 'plants');

DROP POLICY IF EXISTS "auth_plants_insert" ON storage.objects;
CREATE POLICY "auth_plants_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'plants');

DROP POLICY IF EXISTS "auth_plants_update" ON storage.objects;
CREATE POLICY "auth_plants_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'plants');
