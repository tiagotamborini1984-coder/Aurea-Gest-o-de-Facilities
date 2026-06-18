DO $DO$
BEGIN
  -- Delete duplicate daily logs keeping only the most recent one to prevent constraint violations
  DELETE FROM public.daily_logs
  WHERE id IN (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY plant_id, reference_id, date, type ORDER BY created_at DESC) as rnum
      FROM public.daily_logs
    ) t
    WHERE t.rnum > 1
  );

  -- Drop existing unique index if it exists to safely recreate it
  DROP INDEX IF EXISTS daily_logs_unique_record;
  
  -- Create new unique index on exact columns to prevent duplicate inserts for the same day
  CREATE UNIQUE INDEX daily_logs_unique_record ON public.daily_logs (plant_id, reference_id, date, type);
END $DO$;

-- Update the RPC to use strict DATE type comparison, avoiding timezone-shifted query bugs
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id uuid,
  p_date date
)
RETURNS TABLE (
  id uuid,
  name text,
  company_name text,
  function_id uuid,
  location_id uuid,
  status text,
  log_id uuid,
  log_status boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.company_name,
    e.function_id,
    e.location_id,
    e.status,
    l.id as log_id,
    COALESCE(l.status, false) as log_status
  FROM public.employees e
  LEFT JOIN public.daily_logs l 
    ON l.reference_id = e.id 
    AND l.date = p_date 
    AND l.type = 'staff'
  WHERE e.plant_id = p_plant_id
    AND e.status = 'Ativo';
END;
$function$;
