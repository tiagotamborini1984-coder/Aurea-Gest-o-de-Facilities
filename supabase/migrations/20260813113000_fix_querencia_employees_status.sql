-- Fix Querência plant employees status and update get_attendance_employees RPC
-- Ensure ESEQUIAS BORGES DE ASSIS, LORENA KAROL SILVA, and REINAM QUADRO DE ASSIS are active

DO $$
DECLARE
  v_plant_id uuid;
  v_client_id uuid;
  emp_record RECORD;
  v_existing_id uuid;
BEGIN
  -- Get Querência plant ID and client ID
  SELECT id, client_id INTO v_plant_id, v_client_id
  FROM public.plants
  WHERE name ILIKE '%QUERÊNCIA%' OR code ILIKE '%QUE%' OR name ILIKE '%QUE%'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_plant_id IS NOT NULL THEN
    -- Loop through matching target employees
    FOR emp_record IN
      SELECT id, name, registration_number, reference_month, status, plant_id
      FROM public.employees
      WHERE (
        UPPER(TRIM(name)) LIKE '%ESEQUIAS BORGES DE ASSIS%'
        OR UPPER(TRIM(name)) LIKE '%LORENA KAROL SILVA%'
        OR UPPER(TRIM(name)) LIKE '%REINAM QUADRO DE ASSIS%'
      )
      AND (plant_id = v_plant_id OR plant_id IS NULL)
      ORDER BY
        CASE WHEN plant_id = v_plant_id THEN 0 ELSE 1 END,
        CASE WHEN UPPER(TRIM(status)) = 'ATIVO' THEN 0 ELSE 1 END,
        created_at ASC
    LOOP
      -- Check if another record already exists for the same employee, plant, and reference_month (regardless of status)
      SELECT e.id INTO v_existing_id
      FROM public.employees e
      WHERE e.id <> emp_record.id
        AND e.plant_id = v_plant_id
        AND e.reference_month = emp_record.reference_month
        AND COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name))) =
            COALESCE(NULLIF(TRIM(emp_record.registration_number), ''), LOWER(TRIM(emp_record.name)))
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        -- Re-link any daily_logs pointing to emp_record to v_existing_id
        UPDATE public.daily_logs
        SET reference_id = v_existing_id
        WHERE reference_id = emp_record.id;

        -- Delete conflicting duplicate record first to avoid trigger check_duplicate_employee failure
        DELETE FROM public.employees WHERE id = emp_record.id;

        -- Update existing record in v_plant_id to 'Ativo'
        UPDATE public.employees
        SET status = 'Ativo',
            client_id = COALESCE(client_id, v_client_id),
            updated_at = NOW()
        WHERE id = v_existing_id;
      ELSE
        -- Update employee to 'Ativo' and link to Querência plant
        UPDATE public.employees
        SET status = 'Ativo',
            client_id = COALESCE(client_id, v_client_id),
            plant_id = v_plant_id,
            updated_at = NOW()
        WHERE id = emp_record.id;
      END IF;
    END LOOP;

    -- Cleanup any remaining duplicate records for the plant
    FOR emp_record IN
      SELECT e1.id, e2.id as target_id
      FROM public.employees e1
      JOIN public.employees e2 ON e2.id <> e1.id
        AND e2.plant_id = e1.plant_id
        AND e2.reference_month = e1.reference_month
        AND COALESCE(NULLIF(TRIM(e2.registration_number), ''), LOWER(TRIM(e2.name))) =
            COALESCE(NULLIF(TRIM(e1.registration_number), ''), LOWER(TRIM(e1.name)))
      WHERE e1.plant_id = v_plant_id
        AND (
          (UPPER(TRIM(e2.status)) = 'ATIVO' AND UPPER(TRIM(e1.status)) <> 'ATIVO')
          OR (
            UPPER(TRIM(e2.status)) = UPPER(TRIM(e1.status))
            AND (e2.updated_at > e1.updated_at OR (e2.updated_at = e1.updated_at AND e2.id > e1.id))
          )
        )
    LOOP
      UPDATE public.daily_logs
      SET reference_id = emp_record.target_id
      WHERE reference_id = emp_record.id;

      DELETE FROM public.employees WHERE id = emp_record.id;
    END LOOP;
  END IF;
END $$;

-- Overload 1: (p_plant_id uuid, p_date date)
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id uuid,
  p_date date
)
RETURNS TABLE (
  id uuid,
  company_name text,
  function_id uuid,
  location_id uuid,
  log_id uuid,
  log_status boolean,
  name text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  IF NOT is_plant_authorized(p_plant_id) THEN
    RETURN;
  END IF;

  SELECT client_id INTO v_client_id FROM public.plants WHERE id = p_plant_id;
  IF v_client_id IS NULL THEN
    v_client_id := get_user_client_id();
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.company_name,
    e.function_id,
    e.location_id,
    l.id as log_id,
    COALESCE(l.status, false) as log_status,
    e.name,
    e.status
  FROM public.employees e
  LEFT JOIN public.daily_logs l
    ON l.reference_id = e.id
    AND l.date = p_date
    AND l.type = 'staff'
  WHERE e.plant_id = p_plant_id
    AND (v_client_id IS NULL OR e.client_id = v_client_id)
    AND UPPER(TRIM(e.status)) = 'ATIVO';
END;
$$;

-- Overload 2: (p_plant_id uuid, p_reference_month date, p_staff_log_ids uuid[])
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id uuid,
  p_reference_month date,
  p_staff_log_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS SETOF public.employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT client_id INTO v_client_id FROM public.plants WHERE id = p_plant_id;
  IF v_client_id IS NULL THEN
    v_client_id := get_user_client_id();
  END IF;

  IF NOT is_plant_authorized(p_plant_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RankedEmployees AS (
    SELECT e.*,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT)
        ORDER BY
          CASE WHEN UPPER(TRIM(e.status)) = 'ATIVO' THEN 0 ELSE 1 END,
          CASE WHEN e.reference_month = p_reference_month THEN 0 ELSE 1 END,
          CASE WHEN e.reference_month <= p_reference_month THEN 0 ELSE 1 END,
          e.reference_month DESC,
          e.created_at DESC
      ) as rn
    FROM public.employees e
    WHERE e.plant_id = p_plant_id
      AND (v_client_id IS NULL OR e.client_id = v_client_id)
      AND (
        e.id = ANY(p_staff_log_ids)
        OR UPPER(TRIM(e.status)) = 'ATIVO'
        OR (UPPER(TRIM(e.status)) = 'INATIVO' AND e.reference_month = p_reference_month)
      )
  )
  SELECT re.* FROM RankedEmployees re
  WHERE re.rn = 1
    AND UPPER(TRIM(re.status)) = 'ATIVO'
  ORDER BY re.name ASC;
END;
$$;

-- Overload 3: (p_plant_id uuid, p_reference_month character varying, p_staff_log_ids uuid[])
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id uuid,
  p_reference_month character varying,
  p_staff_log_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS SETOF public.employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
  v_ref_month date;
BEGIN
  SELECT client_id INTO v_client_id FROM public.plants WHERE id = p_plant_id;
  IF v_client_id IS NULL THEN
    v_client_id := get_user_client_id();
  END IF;

  v_ref_month := p_reference_month::date;

  IF NOT is_plant_authorized(p_plant_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RankedEmployees AS (
    SELECT e.*,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT)
        ORDER BY
          CASE WHEN UPPER(TRIM(e.status)) = 'ATIVO' THEN 0 ELSE 1 END,
          CASE WHEN e.reference_month = v_ref_month THEN 0 ELSE 1 END,
          CASE WHEN e.reference_month <= v_ref_month THEN 0 ELSE 1 END,
          e.reference_month DESC,
          e.created_at DESC
      ) as rn
    FROM public.employees e
    WHERE e.plant_id = p_plant_id
      AND (v_client_id IS NULL OR e.client_id = v_client_id)
      AND (
        e.id = ANY(p_staff_log_ids)
        OR UPPER(TRIM(e.status)) = 'ATIVO'
        OR (UPPER(TRIM(e.status)) = 'INATIVO' AND e.reference_month = v_ref_month)
      )
  )
  SELECT re.* FROM RankedEmployees re
  WHERE re.rn = 1
    AND UPPER(TRIM(re.status)) = 'ATIVO'
  ORDER BY re.name ASC;
END;
$$;
