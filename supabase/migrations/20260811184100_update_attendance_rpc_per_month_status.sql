-- Update get_attendance_employees to respect per-month employee status
-- Active employees for the selected reference month are included
-- Inactive employees for the selected reference month are excluded
-- Historical data (daily_logs, dashboard indicators) for previous months remains unchanged

-- Drop all existing overloads to avoid signature conflicts
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, character varying, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, text, uuid[]);

-- Overload 1: (p_plant_id uuid, p_date date) - returns active employees with daily log status
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
BEGIN
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
    AND e.client_id = get_user_client_id()
    AND e.status = 'Ativo';
END;
$$;

-- Overload 2: (p_plant_id uuid, p_reference_month date, p_staff_log_ids uuid[])
-- Returns employees whose best record for the selected reference month is 'Ativo'
-- Inactive employees for the selected month are excluded
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
  v_client_id := get_user_client_id();

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
          e.created_at DESC
      ) as rn
    FROM public.employees e
    WHERE e.client_id = v_client_id
      AND e.plant_id = p_plant_id
      AND (
        e.id = ANY(p_staff_log_ids)
        OR e.status = 'Ativo'
        OR (e.status = 'Inativo' AND e.reference_month = p_reference_month)
      )
  )
  SELECT re.* FROM RankedEmployees re
  WHERE re.rn = 1
    AND re.status = 'Ativo'
  ORDER BY re.name ASC;
END;
$$;

-- Overload 3: (p_plant_id uuid, p_reference_month character varying, p_staff_log_ids uuid[])
-- Same logic as overload 2 but accepts varchar for reference_month
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
  v_client_id := get_user_client_id();
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
          e.created_at DESC
      ) as rn
    FROM public.employees e
    WHERE e.client_id = v_client_id
      AND e.plant_id = p_plant_id
      AND (
        e.id = ANY(p_staff_log_ids)
        OR e.status = 'Ativo'
        OR (e.status = 'Inativo' AND e.reference_month = v_ref_month)
      )
  )
  SELECT re.* FROM RankedEmployees re
  WHERE re.rn = 1
    AND re.status = 'Ativo'
  ORDER BY re.name ASC;
END;
$$;
