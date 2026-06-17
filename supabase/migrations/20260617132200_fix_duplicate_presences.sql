DO $$
BEGIN

  -- 1. Create a temporary table to identify the duplicate daily_logs starting from 2024-06-11
  CREATE TEMP TABLE duplicate_logs_to_delete AS
  WITH RankedLogs AS (
    SELECT 
      id,
      ROW_NUMBER() OVER(
        PARTITION BY date, type, reference_id, plant_id 
        ORDER BY status DESC, id ASC
      ) as rn
    FROM public.daily_logs
    WHERE date >= '2024-06-11'
  )
  SELECT id FROM RankedLogs WHERE rn > 1;

  -- Delete duplicates keeping the one with status = true
  DELETE FROM public.daily_logs 
  WHERE id IN (SELECT id FROM duplicate_logs_to_delete);

  DROP TABLE duplicate_logs_to_delete;

END $$;

-- 2. Update the RPC get_attendance_employees to correctly use DISTINCT ON for deduplication
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id uuid,
  p_reference_month text,
  p_staff_log_ids uuid[]
)
RETURNS SETOF public.employees
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)))
  ) e.*
  FROM public.employees e
  WHERE e.plant_id = p_plant_id
    AND (
      e.status = 'Ativo'
      OR e.id = ANY(p_staff_log_ids)
    )
  ORDER BY 
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name))),
    CASE WHEN e.reference_month = p_reference_month THEN 1 ELSE 0 END DESC,
    CASE WHEN e.status = 'Ativo' THEN 1 ELSE 0 END DESC,
    e.id;
END;
$;
