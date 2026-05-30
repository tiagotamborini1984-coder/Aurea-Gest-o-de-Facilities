DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('documents', 'documents', true) 
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');

-- Seed mock data to avoid empty states
DO $$
DECLARE
  v_client_id uuid;
  v_plant_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients LIMIT 1;
  SELECT id INTO v_plant_id FROM public.plants WHERE client_id = v_client_id LIMIT 1;

  IF v_client_id IS NOT NULL AND v_plant_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.sector_documents WHERE name = 'AVCB Planta Principal' AND client_id = v_client_id) THEN
      INSERT INTO public.sector_documents (
        id, client_id, plant_id, name, document_type, expiration_date, alert_lead_days, file_url
      ) VALUES 
      (gen_random_uuid(), v_client_id, v_plant_id, 'AVCB Planta Principal', 'AVCB', CURRENT_DATE + INTERVAL '10 days', 30, NULL),
      (gen_random_uuid(), v_client_id, v_plant_id, 'PPRA Atualizado', 'PPRA', CURRENT_DATE + INTERVAL '45 days', 30, NULL),
      (gen_random_uuid(), v_client_id, v_plant_id, 'LTCAT Antigo', 'LTCAT', CURRENT_DATE - INTERVAL '5 days', 30, NULL);
    END IF;
  END IF;
END $$;
