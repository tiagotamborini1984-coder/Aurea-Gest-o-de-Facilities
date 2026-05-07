DO $$
BEGIN
  UPDATE storage.buckets 
  SET public = true 
  WHERE id = 'training-documents';
END $$;

DROP POLICY IF EXISTS "Allow public read training-documents" ON storage.objects;
CREATE POLICY "Allow public read training-documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'training-documents');
