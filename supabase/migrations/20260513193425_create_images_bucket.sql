DO $DO$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('images', 'images', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
END $DO$;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Auth Uploads" ON storage.objects;
CREATE POLICY "Auth Uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "Auth Updates" ON storage.objects;
CREATE POLICY "Auth Updates" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "Auth Deletes" ON storage.objects;
CREATE POLICY "Auth Deletes" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'images');
