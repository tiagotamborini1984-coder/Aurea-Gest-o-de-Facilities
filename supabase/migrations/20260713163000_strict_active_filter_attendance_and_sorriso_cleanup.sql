=======
-- Migration: Strictly filter active employees in attendance RPC + Sorriso cleanup

-- ========================================================================================================================================================
=======
-- Migration: Strictly filter active employees in attendance RPC + Sorriso cleanup

-- ============================================================================
-- 0. Fix trigger_audit_daily_logs BEFORE any DELETE that fires the trigger
--    When auth.uid() is NULL (migration context), skip the audit insert
--    to avoid FK violation on audit_logs.user_id → auth.users(id).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_audit_daily_logs()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.audit_logs (action_type, client_id, user_id, details)
  VALUES (
    TG_OP,
    COALESCE(NEW.client_id, OLD.client_id),
    v_user_id,
    'Daily Log ' || TG_OP || ' for reference ' || COALESCE(NEW.reference_id, OLD.reference_id) || ' on date ' || COALESCE(NEW.date, OLD.date)::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1. Drop all existing overloads of get_attendance_employees
-- ========================================================================================================================================================
-- 1. Drop all existing overloads of get_attendance_employees
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, character varying, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, text, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date, uuid[]);

-- ============================================================================
-- 2. Recreate overload: get_attendance_employees(p_plant_id uuid, p_date date)
--    Strictly returns only active employees
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
    AND e.status = 'Ativo';
END;
$$;

-- ============================================================================
-- 3. Recreate overload: get_attendance_employees(p_plant_id uuid, p_reference_month character varying, p_staff_log_ids uuid[])
--    Strictly returns only active employees
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
    AND e.status = 'Ativo'
  ORDER BY
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT),
    CASE WHEN e.reference_month = p_reference_month::date THEN 0 ELSE 1 END,
    e.created_at DESC;
END;
$$;

-- ============================================================================
-- 4. Recreate overload: get_attendance_employees(p_plant_id uuid, p_reference_month date, p_staff_log_ids uuid[])
--    Strictly returns only active employees
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
    AND e.status = 'Ativo'
  ORDER BY
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT),
    CASE WHEN e.reference_month = p_reference_month THEN 0 ELSE 1 END,
    e.created_at DESC;
END;
$$;

-- ============================================================================
-- 5. Deactivate specific collaborators at the Sorriso plant
-- ============================================================================
UPDATE public.employees
SET status = 'Inativo',
    updated_at = NOW()
WHERE plant_id IN (
    SELECT id FROM public.plants WHERE name ILIKE '%Sorriso%'
  )
  AND (
    name ILIKE '%Anna Flavia%'
    OR name ILIKE '%Francineide%'
    OR name ILIKE '%Francisco Bezerra%'
    OR name ILIKE '%Irislagia%'
    OR name ILIKE '%Kerliene%'
    OR name ILIKE '%Naira%'
    OR name ILIKE '%Matheus Justino%'
    OR name ILIKE '%Maria Dayane%'
    OR name ILIKE '%Miguel Mrques%'
    OR name ILIKE '%Miguel Marques%'
    OR name ILIKE '%Nilziane%'
    OR name ILIKE '%Wesley Sousa%'
    OR name ILIKE '%Adailton%'
    OR name ILIKE '%Aderon de Sousa%'
    OR name ILIKE '%Benedita Suzete%'
    OR name ILIKE '%Bruno Guilherme%'
    OR name ILIKE '%Carlos Alexandre%'
    OR name ILIKE '%Cezar Augusto%'
    OR name ILIKE '%Diego de Almeida%'
    OR name ILIKE '%Matheus Sousa%'
  );

-- ============================================================================
-- 6. Also deactivate matching org_collaborators at Sorriso plant (if any)
-- ============================================================================
UPDATE public.org_collaborators
SET is_active = false
WHERE plant_id IN (
    SELECT id FROM public.plants WHERE name ILIKE '%Sorriso%'
  )
  AND (
    name ILIKE '%Anna Flavia%'
    OR name ILIKE '%Francineide%'
    OR name ILIKE '%Francisco Bezerra%'
    OR name ILIKE '%Irislagia%'
    OR name ILIKE '%Kerliene%'
    OR name ILIKE '%Naira%'
    OR name ILIKE '%Matheus Justino%'
    OR name ILIKE '%Maria Dayane%'
    OR name ILIKE '%Miguel Mrques%'
    OR name ILIKE '%Miguel Marques%'
    OR name ILIKE '%Nilziane%'
    OR name ILIKE '%Wesley Sousa%'
    OR name ILIKE '%Adailton%'
    OR name ILIKE '%Aderon de Sousa%'
    OR name ILIKE '%Benedita Suzete%'
    OR name ILIKE '%Bruno Guilherme%'
    OR name ILIKE '%Carlos Alexandre%'
    OR name ILIKE '%Cezar Augusto%'
    OR name ILIKE '%Diego de Almeida%'
    OR name ILIKE '%Matheus Sousa%'
  );

-- ============================================================================
-- 7. Clean up orphaned daily_logs for now-inactive employees at Sorriso
--    (optional: remove stale presence logs so they don't appear in reports)
-- ============================================================================
DELETE FROM public.daily_logs
WHERE type = 'staff'
  AND plant_id IN (
    SELECT id FROM public.plants WHERE name ILIKE '%Sorriso%'
  )
  AND reference_id IN (
    SELECT id FROM public.employees
    WHERE status != 'Ativo'
      AND plant_id IN (SELECT id FROM public.plants WHERE name ILIKE '%Sorriso%')
  )
  AND is_published = false;
