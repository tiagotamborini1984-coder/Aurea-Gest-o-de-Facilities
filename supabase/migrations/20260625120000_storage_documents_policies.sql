DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('documents', 'documents', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('trainings', 'trainings', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

DROP POLICY IF EXISTS "public_read_documents" ON storage.objects;
DROP POLICY IF EXISTS "auth_insert_documents" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_documents" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_documents" ON storage.objects;

DROP POLICY IF EXISTS "public_read_trainings" ON storage.objects;
DROP POLICY IF EXISTS "auth_insert_trainings" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_trainings" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_trainings" ON storage.objects;

CREATE POLICY "public_read_documents" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'documents');

CREATE POLICY "auth_insert_documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

CREATE POLICY "auth_update_documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'documents');

CREATE POLICY "auth_delete_documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documents');

CREATE POLICY "public_read_trainings" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'trainings');

CREATE POLICY "auth_insert_trainings" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trainings');

CREATE POLICY "auth_update_trainings" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'trainings');

CREATE POLICY "auth_delete_trainings" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'trainings');
