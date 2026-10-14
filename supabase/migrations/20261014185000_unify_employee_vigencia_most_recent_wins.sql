-- Unify employee vigência resolution in get_attendance_employees overloads.
-- Regra de vigência v0.0.1717 / v0.0.1718:
-- A versão mais recente por pessoa (matrícula normalizada ou nome normalizado em minúsculas + plant_id)
-- vence SEMPRE (ordenado por reference_month DESC, desempate por created_at DESC).
-- Se a versão mais recente for 'Inativo', a pessoa NÃO aparece na listagem/presença.
-- Histórico e logs de presença anteriores permanecem 100% preservados.

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
BEGIN
  IF NOT is_plant_authorized(p_plant_id) THEN
    RETURN;
  END IF;

  SELECT client_id INTO v_client_id FROM public.plants WHERE id = p_plant_id;
  IF v_client_id IS NULL THEN
    v_client_id := get_user_client_id();
  END IF;

  RETURN QUERY
  WITH RankedEmployees AS (
    SELECT e.*,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(
          NULLIF(UPPER(TRIM(e.registration_number)), ''),
          LOWER(REGEXP_REPLACE(TRIM(e.name), '\s+', ' ', 'g')),
          e.id::TEXT
        )
        ORDER BY
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
        PARTITION BY COALESCE(
          NULLIF(UPPER(TRIM(e.registration_number)), ''),
          LOWER(REGEXP_REPLACE(TRIM(e.name), '\s+', ' ', 'g')),
          e.id::TEXT
        )
        ORDER BY
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
        PARTITION BY COALESCE(
          NULLIF(UPPER(TRIM(e.registration_number)), ''),
          LOWER(REGEXP_REPLACE(TRIM(e.name), '\s+', ' ', 'g')),
          e.id::TEXT
        )
        ORDER BY
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
