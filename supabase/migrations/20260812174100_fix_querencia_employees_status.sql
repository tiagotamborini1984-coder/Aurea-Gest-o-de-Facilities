-- Fix: Reactivate inactive employees for the Querência plant so they appear in Lançamentos
-- These collaborators exist in the registry but have status = 'Inativo' (or variant),
-- which causes the case-insensitive RPC filter TRIM(UPPER(status)) = 'ATIVO' to exclude them.

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

  -- 2. Update all employees for this plant whose status is inactive (any casing/spacing variant)
  --    back to 'Ativo' so they reappear in the Lançamentos screen.
  UPDATE public.employees
  SET
    status = 'Ativo',
    reference_month = v_ref_month,
    updated_at = NOW()
  WHERE plant_id = v_querencia_plant_id
    AND client_id = v_client_id
    AND TRIM(UPPER(status)) IN ('INATIVO', 'INACTIVE', 'EXCLUIDO', 'EXCLUIDA', 'DELETED')
    AND status != 'Ativo';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RAISE NOTICE 'Querência employees reactivated: % rows updated for plant %.', v_updated_count, v_querencia_plant_id;
END $$;

-- 3. Also ensure any employees for Querência whose status has trailing/leading spaces
--    or mixed casing that still normalizes to ATIVO are set to the canonical 'Ativo' value.
UPDATE public.employees
SET
  status = 'Ativo',
  updated_at = NOW()
WHERE plant_id IN (
    SELECT id FROM public.plants
    WHERE LOWER(TRIM(name)) ILIKE '%querencia%'
       OR LOWER(TRIM(code)) ILIKE '%querencia%'
  )
  AND TRIM(UPPER(status)) = 'ATIVO'
  AND status != 'Ativo';
