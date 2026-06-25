DO $$
BEGIN
  -- Insert bucket 'documents' if it doesn't exist, and ensure it is public
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('documents', 'documents', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

-- Enable RLS on storage.objects just to be safe
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Ensure SELECT policy exists for public users on the 'documents' bucket
DROP POLICY IF EXISTS "Public users can read documents" ON storage.objects;
CREATE POLICY "Public users can read documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'documents');

-- Ensure SELECT policy exists for authenticated users on the 'documents' bucket
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
CREATE POLICY "Authenticated users can read documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');
