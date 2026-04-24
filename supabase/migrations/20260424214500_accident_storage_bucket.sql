DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('accident-evidences', 'accident-evidences', true) 
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "accident_evidences_insert" ON storage.objects;
CREATE POLICY "accident_evidences_insert" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'accident-evidences');

DROP POLICY IF EXISTS "accident_evidences_select" ON storage.objects;
CREATE POLICY "accident_evidences_select" ON storage.objects 
  FOR SELECT TO authenticated 
  USING (bucket_id = 'accident-evidences');

DROP POLICY IF EXISTS "accident_evidences_delete" ON storage.objects;
CREATE POLICY "accident_evidences_delete" ON storage.objects 
  FOR DELETE TO authenticated 
  USING (bucket_id = 'accident-evidences');
