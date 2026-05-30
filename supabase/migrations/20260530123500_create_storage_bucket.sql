DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('sector-documents', 'sector-documents', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "Authenticated users can read sector-documents" ON storage.objects;
CREATE POLICY "Authenticated users can read sector-documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'sector-documents');

DROP POLICY IF EXISTS "Authenticated users can upload sector-documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload sector-documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sector-documents');

DROP POLICY IF EXISTS "Authenticated users can update sector-documents" ON storage.objects;
CREATE POLICY "Authenticated users can update sector-documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'sector-documents');

DROP POLICY IF EXISTS "Authenticated users can delete sector-documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete sector-documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'sector-documents');
