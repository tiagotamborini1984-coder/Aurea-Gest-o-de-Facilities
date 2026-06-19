DO $$
BEGIN
  -- Recreate the first signature of get_attendance_employees to explicitly handle deleted statuses and enforce tenant boundaries
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
  AS $function$
  BEGIN
    -- Security Check to ensure user is authorized for the plant
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
      AND e.status NOT IN ('Deleted', 'Excluido', 'Excluído')
      AND (
        e.status = 'Ativo' 
        OR l.id IS NOT NULL 
        OR (e.status = 'Inativo' AND e.reference_month >= date_trunc('month', p_date)::date)
      );
  END;
  $function$;

  -- Recreate the second signature of get_attendance_employees to explicitly handle deleted statuses and enforce tenant boundaries
  CREATE OR REPLACE FUNCTION public.get_attendance_employees(
    p_plant_id uuid,
    p_reference_month character varying,
    p_staff_log_ids uuid[] DEFAULT '{}'::uuid[]
  )
  RETURNS SETOF public.employees
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
  BEGIN
    -- Security Check to ensure user is authorized for the plant
    IF NOT is_plant_authorized(p_plant_id) THEN
      RETURN;
    END IF;

    RETURN QUERY
    WITH RankedEmployees AS (
      SELECT 
        e.*,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::text)
          ORDER BY 
            CASE WHEN e.id = ANY(p_staff_log_ids) THEN 0 ELSE 1 END,
            CASE WHEN e.reference_month = p_reference_month::date THEN 0 ELSE 1 END,
            CASE WHEN e.status = 'Ativo' THEN 0 ELSE 1 END,
            e.created_at DESC
        ) as rn
      FROM public.employees e
      WHERE e.plant_id = p_plant_id
        AND e.client_id = get_user_client_id()
        AND e.status NOT IN ('Deleted', 'Excluido', 'Excluído')
    )
    SELECT 
      r.id, r.client_id, r.plant_id, r.location_id, r.function_id, 
      r.company_name, r.name, r.created_at, r.company_id, 
      r.reference_month, r.status, r.registration_number, r.updated_at
    FROM RankedEmployees r
    WHERE r.rn = 1
      AND (
        r.status = 'Ativo'
        OR r.id = ANY(p_staff_log_ids)
        OR (r.status = 'Inativo' AND r.reference_month >= p_reference_month::date)
      );
  END;
  $function$;
END $$;
