-- Fix: Ensure all active employees appear in Lançamentos, including Querência plant
-- Problem: status = 'Ativo' exact match misses employees with case/whitespace variants
-- Solution: normalize status values and make RPC case-insensitive

-- ============================================================================
-- 1. Normalize existing employee status values (trim + title case)
-- ============================================================================
UPDATE public.employees
SET status = 'Ativo',
    updated_at = NOW()
WHERE TRIM(UPPER(status)) = 'ATIVO'
  AND status != 'Ativo';

UPDATE public.employees
SET status = 'Inativo',
    updated_at = NOW()
WHERE TRIM(UPPER(status)) IN ('INATIVO', 'INACTIVE', 'EXCLUIDO', 'EXCLUIDA', 'DELETED')
  AND status != 'Inativo';

-- ============================================================================
-- 2. Drop all existing overloads of get_attendance_employees
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, character varying, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, text, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date, uuid[]);

-- ============================================================================
-- 3. Recreate overload: get_attendance_employees(p_plant_id uuid, p_date date)
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
    AND TRIM(UPPER(e.status)) = 'ATIVO';
END;
$$;

-- ============================================================================
-- 4. Recreate overload: get_attendance_employees(p_plant_id uuid, p_reference_month character varying, p_staff_log_ids uuid[])
--    Case-insensitive status check, dedup by registration_number OR name+plant
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
BEGIN
  v_client_id := get_user_client_id();

  IF NOT is_plant_authorized(p_plant_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT)
  ) e.*
  FROM public.employees e
  WHERE e.client_id = v_client_id
    AND e.plant_id = p_plant_id
    AND TRIM(UPPER(e.status)) = 'ATIVO'
  ORDER BY
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT),
    CASE WHEN e.reference_month = p_reference_month::date THEN 0 ELSE 1 END,
    e.created_at DESC;
END;
$$;

-- ============================================================================
-- 5. Recreate overload: get_attendance_employees(p_plant_id uuid, p_reference_month date, p_staff_log_ids uuid[])
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
  v_client_id := get_user_client_id();

  IF NOT is_plant_authorized(p_plant_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT)
  ) e.*
  FROM public.employees e
  WHERE e.client_id = v_client_id
    AND e.plant_id = p_plant_id
    AND TRIM(UPPER(e.status)) = 'ATIVO'
  ORDER BY
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT),
    CASE WHEN e.reference_month = p_reference_month THEN 0 ELSE 1 END,
    e.created_at DESC;
END;
$$;
