-- ============================================================================
-- Root cause fix for Ezequias, Lorena, and Reinam not appearing in Lançamentos
-- at the Querência plant.
--
-- Root cause #1: get_attendance_employees RPC used get_user_client_id() which
--   returns the USER's client_id, not the PLANT's client_id. For Master users
--   viewing a plant from a different client, this filtered out ALL employees.
--
-- Root cause #2: Previous reactivation migrations may have failed silently due
--   to the unique_active_employee_per_plant_month constraint when duplicate
--   active records existed for the same person+plant+month.
--
-- Root cause #3: The frontend applied a redundant ATIVO status filter on RPC
--   results (the RPC already filters) and the fallback query used a restrictive
--   lte('reference_month') filter.
-- ============================================================================

-- ============================================================================
-- 1. Drop ALL existing overloads of get_attendance_employees
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, character varying, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, text, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date, uuid[]);

-- ============================================================================
-- 2. Recreate overload: get_attendance_employees(p_plant_id uuid, p_date date)
--    Derives client_id from the PLANT, not from the user's profile.
-- ============================================================================
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
  -- Derive client_id from the plant itself, not from the user's profile
  SELECT client_id INTO v_client_id FROM public.plants WHERE id = p_plant_id;
  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT is_plant_authorized(p_plant_id) THEN
    RETURN;
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
    AND e.client_id = v_client_id
    AND TRIM(UPPER(e.status)) = 'ATIVO';
END;
$$;

-- ============================================================================
-- 3. Recreate overload: get_attendance_employees(p_plant_id uuid, p_reference_month varchar, p_staff_log_ids uuid[])
--    Derives client_id from the PLANT. Case-insensitive normalized status check.
-- ============================================================================
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
    RETURN;
  END IF;

  v_ref_month := p_reference_month::date;

  IF NOT is_plant_authorized(p_plant_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT)
  ) e.*
  FROM public.employees e
  WHERE e.plant_id = p_plant_id
    AND e.client_id = v_client_id
    AND TRIM(UPPER(e.status)) = 'ATIVO'
  ORDER BY
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT),
    CASE WHEN e.reference_month = v_ref_month THEN 0 ELSE 1 END,
    e.created_at DESC;
END;
$$;

-- ============================================================================
-- 4. Recreate overload: get_attendance_employees(p_plant_id uuid, p_reference_month date, p_staff_log_ids uuid[])
--    Same fix: derive client_id from plant.
-- ============================================================================
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
    RETURN;
  END IF;

  IF NOT is_plant_authorized(p_plant_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT)
  ) e.*
  FROM public.employees e
  WHERE e.plant_id = p_plant_id
    AND e.client_id = v_client_id
    AND TRIM(UPPER(e.status)) = 'ATIVO'
  ORDER BY
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT),
    CASE WHEN e.reference_month = p_reference_month THEN 0 ELSE 1 END,
    e.created_at DESC;
END;
$$;

-- ============================================================================
-- 5. Data correction for Ezequias, Lorena, and Reinam at Querência plant
--    Handles unique constraint conflicts by first inactivating duplicates,
--    then activating the best record per person.
-- ============================================================================
DO $$
DECLARE
  v_plant_id uuid;
  v_client_id uuid;
  v_ref_month date := date_trunc('month', CURRENT_DATE)::date;
  v_emp record;
  v_dedup_key text;
  v_updated_count int := 0;
BEGIN
  -- Locate the Querência plant
  SELECT id, client_id
  INTO v_plant_id, v_client_id
  FROM public.plants
  WHERE LOWER(TRIM(name)) ILIKE '%querencia%'
     OR LOWER(TRIM(code)) ILIKE '%querencia%'
  LIMIT 1;

  IF v_plant_id IS NULL THEN
    RAISE NOTICE 'Querência plant not found. Skipping employee fix.';
    RETURN;
  END IF;

  -- Process each target employee name
  FOR v_emp IN
    SELECT id, name, registration_number, company_name, company_id,
           function_id, location_id, client_id, status, reference_month
    FROM public.employees
    WHERE plant_id = v_plant_id
      AND TRIM(LOWER(name)) IN ('ezequias', 'lorena', 'reinam')
    ORDER BY TRIM(LOWER(name)), created_at DESC
  LOOP
    v_dedup_key := COALESCE(
      NULLIF(TRIM(v_emp.registration_number), ''),
      LOWER(TRIM(v_emp.name))
    );

    -- Step 1: Inactivate ALL other active records with the same dedup key
    -- This clears any unique constraint conflicts before we activate the target
    UPDATE public.employees
    SET status = 'Inativo', updated_at = NOW()
    WHERE plant_id = v_plant_id
      AND id != v_emp.id
      AND COALESCE(
        NULLIF(TRIM(registration_number), ''),
        LOWER(TRIM(name))
      ) = v_dedup_key
      AND TRIM(UPPER(status)) = 'ATIVO';

    -- Step 2: Activate this record with current reference_month
    -- Try with reference_month update first
    BEGIN
      UPDATE public.employees
      SET status = 'Ativo',
          reference_month = v_ref_month,
          updated_at = NOW()
      WHERE id = v_emp.id
        AND (TRIM(UPPER(status)) != 'ATIVO' OR reference_month != v_ref_month);

      GET DIAGNOSTICS v_updated_count = ROW_COUNT;

      IF v_updated_count = 0 AND TRIM(UPPER(v_emp.status)) = 'ATIVO' THEN
        -- Already active, just ensure reference_month is current
        BEGIN
          UPDATE public.employees
          SET reference_month = v_ref_month, updated_at = NOW()
          WHERE id = v_emp.id AND reference_month != v_ref_month;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Could not update reference_month for %: %', v_emp.name, SQLERRM;
        END;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fully update % (constraint?): %. Trying status-only update.', v_emp.name, SQLERRM;
      -- Fallback: just set status without changing reference_month
      BEGIN
        UPDATE public.employees
        SET status = 'Ativo', updated_at = NOW()
        WHERE id = v_emp.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not update % at all: %', v_emp.name, SQLERRM;
      END;
    END;

    RAISE NOTICE 'Processed employee: % (id: %)', v_emp.name, v_emp.id;
  END LOOP;

  -- Summary: check final state
  RAISE NOTICE '=== Final state for target employees at Querência ===';
  FOR v_emp IN
    SELECT name, status, reference_month, id
    FROM public.employees
    WHERE plant_id = v_plant_id
      AND TRIM(LOWER(name)) IN ('ezequias', 'lorena', 'reinam')
    ORDER BY TRIM(LOWER(name)), created_at DESC
  LOOP
    RAISE NOTICE '  %: status=%, ref_month=%, id=%', v_emp.name, v_emp.status, v_emp.reference_month, v_emp.id;
  END LOOP;
END $$;
