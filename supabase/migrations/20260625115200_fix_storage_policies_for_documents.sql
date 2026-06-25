-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  -- Ensure policies for SELECT
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON storage.objects;
  CREATE POLICY "Enable read access for authenticated users"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'documents');

  -- Ensure policies for INSERT
  DROP POLICY IF EXISTS "Enable insert for authenticated users" ON storage.objects;
  CREATE POLICY "Enable insert for authenticated users"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'documents');

  -- Ensure policies for UPDATE
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON storage.objects;
  CREATE POLICY "Enable update for authenticated users"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'documents');

  -- Ensure policies for DELETE
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON storage.objects;
  CREATE POLICY "Enable delete for authenticated users"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'documents');

END $$;
