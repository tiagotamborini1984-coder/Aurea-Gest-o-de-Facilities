DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('training-documents', 'training-documents', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('documents', 'documents', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "Public Access for training-documents" ON storage.objects;
CREATE POLICY "Public Access for training-documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'training-documents');

DROP POLICY IF EXISTS "Authenticated users can upload training-documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload training-documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'training-documents');

DROP POLICY IF EXISTS "Authenticated users can update training-documents" ON storage.objects;
CREATE POLICY "Authenticated users can update training-documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'training-documents');

DROP POLICY IF EXISTS "Authenticated users can delete training-documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete training-documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'training-documents');

DROP POLICY IF EXISTS "Public Access for documents" ON storage.objects;
CREATE POLICY "Public Access for documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY "Authenticated users can update documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documents');
