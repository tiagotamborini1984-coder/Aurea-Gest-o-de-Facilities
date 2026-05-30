DO $DO$
DECLARE
  v_client_id uuid;
  v_plant_id uuid;
BEGIN
  -- Get the first available active client
  SELECT id INTO v_client_id FROM public.clients WHERE status = 'Ativo' LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    -- Get the first available plant for that client
    SELECT id INTO v_plant_id FROM public.plants WHERE client_id = v_client_id LIMIT 1;
    
    IF v_plant_id IS NOT NULL THEN
      -- Check if we already have demo documents inserted to keep it idempotent
      IF NOT EXISTS (SELECT 1 FROM public.sector_documents WHERE name = 'PGR Demo' AND client_id = v_client_id) THEN
        INSERT INTO public.sector_documents (client_id, plant_id, name, document_type, expiration_date, alert_lead_days, frequency, file_url)
        VALUES
          (v_client_id, v_plant_id, 'PGR Demo', 'Segurança', CURRENT_DATE + INTERVAL '10 days', 15, 'Anual', 'https://example.com/pgr.pdf'),
          (v_client_id, v_plant_id, 'AVCB Demo', 'Bombeiros', CURRENT_DATE - INTERVAL '5 days', 30, 'Anual', 'https://example.com/avcb.pdf'),
          (v_client_id, v_plant_id, 'Licença de Operação Demo', 'Ambiental', CURRENT_DATE + INTERVAL '60 days', 30, 'Anual', 'https://example.com/lo.pdf');
      END IF;
    END IF;
  END IF;
END $DO$;
