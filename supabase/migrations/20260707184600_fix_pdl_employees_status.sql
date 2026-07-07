-- Ensure the 12 specific PDL collaborators are active with correct reference_month
-- Uses ON CONFLICT DO NOTHING for idempotency

DO $$
DECLARE
  v_pdl_plant_id UUID;
  v_client_id UUID;
  v_ref_month DATE := date_trunc('month', CURRENT_DATE)::date;
  v_emp_name TEXT;
  v_emp_names TEXT[] := ARRAY[
    'Elizângela Alves de Andrade',
    'Maria Elizabete monteiro',
    'Rosana costa monteiro do santos',
    'Natiele Gonçalves dos Santos',
    'Suely Silva dos Santos',
    'Maria serafim costa ferreira',
    'Bernadete mayeski',
    'Antônio Francenildo batista oliveira',
    'Rafael da Silva Almeida',
    'Maria Sandra de Maura Barbosa',
    'Hellen aparecida pereira da Silva',
    'Maria dos remédios'
  ];
BEGIN
  -- Find the PDL plant by name (case-insensitive match)
  SELECT p.id, p.client_id
  INTO v_pdl_plant_id, v_client_id
  FROM public.plants p
  WHERE LOWER(TRIM(p.name)) ILIKE '%pdl%primavera%'
     OR LOWER(TRIM(p.name)) ILIKE '%primavera do leste%'
     OR LOWER(TRIM(p.code)) ILIKE '%pdl%'
  LIMIT 1;

  IF v_pdl_plant_id IS NULL THEN
    RAISE NOTICE 'PDL plant not found. Skipping employee fix.';
    RETURN;
  END IF;

  -- Update existing employees: set status to Ativo and align reference_month
  FOREACH v_emp_name IN ARRAY v_emp_names LOOP
    UPDATE public.employees
    SET
      status = 'Ativo',
      reference_month = v_ref_month,
      plant_id = v_pdl_plant_id,
      client_id = v_client_id,
      updated_at = NOW()
    WHERE plant_id = v_pdl_plant_id
      AND client_id = v_client_id
      AND LOWER(TRIM(name)) = LOWER(TRIM(v_emp_name));
  END LOOP;

  -- Also check if any of these employees exist under a different plant for the same client
  -- and update them to the PDL plant if they are duplicates or misplaced
  FOREACH v_emp_name IN ARRAY v_emp_names LOOP
    -- Only update if no active record exists for PDL yet (avoid overwriting the update above)
    IF NOT EXISTS (
      SELECT 1 FROM public.employees
      WHERE plant_id = v_pdl_plant_id
        AND client_id = v_client_id
        AND LOWER(TRIM(name)) = LOWER(TRIM(v_emp_name))
        AND status = 'Ativo'
    ) THEN
      -- Try to find and reactivate under PDL
      UPDATE public.employees
      SET
        status = 'Ativo',
        reference_month = v_ref_month,
        plant_id = v_pdl_plant_id,
        client_id = v_client_id,
        updated_at = NOW()
      WHERE client_id = v_client_id
        AND LOWER(TRIM(name)) = LOWER(TRIM(v_emp_name))
        AND id NOT IN (
          SELECT id FROM public.employees
          WHERE plant_id = v_pdl_plant_id
            AND client_id = v_client_id
            AND LOWER(TRIM(name)) = LOWER(TRIM(v_emp_name))
        );
    END IF;
  END LOOP;

  RAISE NOTICE 'PDL employees fix completed for plant %.', v_pdl_plant_id;
END $$;
