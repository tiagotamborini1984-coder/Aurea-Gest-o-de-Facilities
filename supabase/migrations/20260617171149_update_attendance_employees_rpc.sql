-- Drop the function first to ensure we can recreate it with potentially different signatures or contents without conflicts
DROP FUNCTION IF EXISTS public.get_attendance_employees(UUID, TEXT, UUID[]);

CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id UUID,
  p_reference_month TEXT,
  p_staff_log_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  company_name TEXT,
  function_id UUID,
  status TEXT,
  registration_number TEXT,
  reference_month TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RankedEmployees AS (
    SELECT 
      e.id,
      e.name,
      e.company_name,
      e.function_id,
      e.status,
      e.registration_number,
      e.reference_month,
      e.created_at,
      -- Group duplicates by registration number, name, or id
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT)
        ORDER BY 
          -- Priorities for selecting the best duplicate record
          CASE WHEN e.id = ANY(p_staff_log_ids) THEN 0 ELSE 1 END,
          CASE WHEN e.reference_month = p_reference_month THEN 0 ELSE 1 END,
          CASE WHEN e.status = 'Ativo' THEN 0 ELSE 1 END,
          e.created_at DESC
      ) as rn
    FROM public.employees e
    WHERE e.plant_id = p_plant_id
  )
  SELECT 
    re.id,
    re.name,
    re.company_name,
    re.function_id,
    re.status,
    re.registration_number,
    re.reference_month,
    re.created_at
  FROM RankedEmployees re
  WHERE re.rn = 1
    AND (
      re.id = ANY(p_staff_log_ids) 
      OR re.status = 'Ativo'
      OR (re.status = 'Inativo' AND re.reference_month > p_reference_month)
    );
END;
$$;
