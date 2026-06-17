CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id uuid,
  p_reference_month text,
  p_staff_log_ids uuid[]
)
RETURNS TABLE(id uuid, name text, company_name text, function_id uuid, status text, registration_number text, reference_month text)
LANGUAGE plpgsql
AS $function$
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
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::text)
        ORDER BY
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
    re.reference_month
  FROM RankedEmployees re
  WHERE re.rn = 1
  AND (
    re.id = ANY(p_staff_log_ids)
    OR re.status = 'Ativo'
    OR (re.status = 'Inativo' AND re.reference_month IS NOT NULL AND re.reference_month > p_reference_month)
  );
END;
$function$;
