-- Fix get_attendance_employees overloads to prioritize the most recent employee version
-- Most recent version by reference_month DESC, created_at DESC wins.
-- Only if the winning version is 'Ativo', the employee is considered active.
-- Historical daily_logs for previous months remain preserved.

DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, character varying, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, text, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date, uuid[]);

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
  v_ref_month date;
BEGIN
  IF NOT is_plant_authorized(p_plant_id) THEN
    RETURN;
  END IF;

  SELECT client_id INTO v_client_id FROM public.plants WHERE id = p_plant_id;
  IF v_client_id IS NULL THEN
    v_client_id := get_user_client_id();
  END IF;

  v_ref_month := date_trunc('month', p_date)::date;

  RETURN QUERY
  WITH RankedEmployees AS (
    SELECT e.*,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT)
        ORDER BY
          CASE WHEN e.reference_month = v_ref_month THEN 0 ELSE 1 END,
          CASE WHEN e.reference_month <= v_ref_month THEN 0 ELSE 1 END,
          e.reference_month DESC,
          e.created_at DESC,
          CASE WHEN UPPER(TRIM(e.status)) = 'ATIVO' THEN 0 ELSE 1 END
      ) as rn
    FROM public.employees e
    WHERE e.plant_id = p_plant_id
      AND (v_client_id IS NULL OR e.client_id = v_client_id)
  )
  SELECT
    re.id,
    re.company_name,
    re.function_id,
    re.location_id,
    l.id as log_id,
    COALESCE(l.status, false) as log_status,
    re.name,
    re.status
  FROM RankedEmployees re
  LEFT JOIN public.daily_logs l
    ON l.reference_id = re.id
    AND l.date = p_date
    AND l.type = 'staff'
  WHERE re.rn = 1
    AND UPPER(TRIM(re.status)) = 'ATIVO'
  ORDER BY re.name ASC;
END;
$$;

-- Overload 2: (p_plant_id uuid, p_reference_month character varying, p_staff_log_ids uuid[])
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
          CASE WHEN e.reference_month = v_ref_month THEN 0 ELSE 1 END,
          CASE WHEN e.reference_month <= v_ref_month THEN 0 ELSE 1 END,
          e.reference_month DESC,
          e.created_at DESC,
          CASE WHEN UPPER(TRIM(e.status)) = 'ATIVO' THEN 0 ELSE 1 END
      ) as rn
    FROM public.employees e
    WHERE e.plant_id = p_plant_id
      AND (v_client_id IS NULL OR e.client_id = v_client_id)
  )
  SELECT re.* FROM RankedEmployees re
  WHERE (
    (re.rn = 1 AND UPPER(TRIM(re.status)) = 'ATIVO')
    OR re.id = ANY(p_staff_log_ids)
  )
  ORDER BY re.name ASC;
END;
$$;

-- Overload 3: (p_plant_id uuid, p_reference_month date, p_staff_log_ids uuid[])
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
          CASE WHEN e.reference_month = p_reference_month THEN 0 ELSE 1 END,
          CASE WHEN e.reference_month <= p_reference_month THEN 0 ELSE 1 END,
          e.reference_month DESC,
          e.created_at DESC,
          CASE WHEN UPPER(TRIM(e.status)) = 'ATIVO' THEN 0 ELSE 1 END
      ) as rn
    FROM public.employees e
    WHERE e.plant_id = p_plant_id
      AND (v_client_id IS NULL OR e.client_id = v_client_id)
  )
  SELECT re.* FROM RankedEmployees re
  WHERE (
    (re.rn = 1 AND UPPER(TRIM(re.status)) = 'ATIVO')
    OR re.id = ANY(p_staff_log_ids)
  )
  ORDER BY re.name ASC;
END;
$$;
