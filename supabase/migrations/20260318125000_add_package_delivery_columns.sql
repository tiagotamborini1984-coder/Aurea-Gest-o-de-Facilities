-- Add new columns for enhanced delivery tracking
ALTER TABLE public.packages 
  ADD COLUMN IF NOT EXISTS pickup_responsible TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Create storage bucket for package attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('package-attachments', 'package-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the new bucket
CREATE POLICY "Allow authenticated full access on package-attachments"
ON storage.objects FOR ALL TO authenticated 
USING (bucket_id = 'package-attachments') 
WITH CHECK (bucket_id = 'package-attachments');

CREATE POLICY "Allow public read on package-attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'package-attachments');
