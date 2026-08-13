-- Reactivate specifically Ezequias, Lorena and Reinam at the Querência plant
-- so they reappear in the Lançamentos de Colaboradores screen.
-- Idempotent: safe to run multiple times; only targets these 3 names at Querência.

DO $$
DECLARE
  v_querencia_plant_id UUID;
  v_client_id UUID;
  v_ref_month DATE := date_trunc('month', CURRENT_DATE)::date;
  v_updated_count INT := 0;
BEGIN
  -- 1. Locate the Querência plant (case-insensitive match on name or code)
  SELECT p.id, p.client_id
  INTO v_querencia_plant_id, v_client_id
  FROM public.plants p
  WHERE LOWER(TRIM(p.name)) ILIKE '%querencia%'
     OR LOWER(TRIM(p.code)) ILIKE '%querencia%'
  LIMIT 1;

  IF v_querencia_plant_id IS NULL THEN
    RAISE NOTICE 'Querência plant not found. Skipping employee reactivation.';
    RETURN;
  END IF;

  -- 2. Reactivate only Ezequias, Lorena and Reinam at Querência
  --    Match by exact name (case-insensitive, trimmed) to avoid mass updates.
  UPDATE public.employees
  SET
    status = 'Ativo',
    reference_month = v_ref_month,
    updated_at = NOW()
  WHERE plant_id = v_querencia_plant_id
    AND client_id = v_client_id
    AND (
      TRIM(LOWER(name)) = 'ezequias'
      OR TRIM(LOWER(name)) = 'lorena'
      OR TRIM(LOWER(name)) = 'reinam'
    );

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RAISE NOTICE 'Querência specific employees reactivated: % rows updated for plant %.', v_updated_count, v_querencia_plant_id;
END $$;
