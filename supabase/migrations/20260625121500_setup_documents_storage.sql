DO $$
BEGIN
  -- Insert 'documents' bucket if it doesn't exist, ensure it is public
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('documents', 'documents', true) 
  ON CONFLICT (id) DO UPDATE SET public = true;

  -- Insert 'training-documents' bucket if it doesn't exist, ensure it is public
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('training-documents', 'training-documents', true) 
  ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

-- Drop specific policies to recreate them cleanly without breaking others
DROP POLICY IF EXISTS "documents_public_access" ON storage.objects;
DROP POLICY IF EXISTS "documents_auth_uploads" ON storage.objects;
DROP POLICY IF EXISTS "documents_auth_updates" ON storage.objects;
DROP POLICY IF EXISTS "documents_auth_deletes" ON storage.objects;

-- Create comprehensive policies for storage
CREATE POLICY "documents_public_access" ON storage.objects
  FOR SELECT USING (bucket_id IN ('documents', 'training-documents'));

CREATE POLICY "documents_auth_uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('documents', 'training-documents'));

CREATE POLICY "documents_auth_updates" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id IN ('documents', 'training-documents'));

CREATE POLICY "documents_auth_deletes" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id IN ('documents', 'training-documents'));
