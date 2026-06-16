-- Add reference_month column to employees if it doesn't exist
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS reference_month VARCHAR(7);

-- Create RPC for deduplicated attendance employees
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id UUID,
  p_reference_month VARCHAR,
  p_staff_log_ids UUID[] DEFAULT '{}'
)
RETURNS SETOF public.employees
AS $func$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (LOWER(TRIM(COALESCE(e.name, e.id::TEXT))))
    e.*
  FROM public.employees e
  WHERE e.plant_id = p_plant_id
    AND (e.status = 'Ativo' OR e.id = ANY(p_staff_log_ids))
    AND (e.reference_month = p_reference_month OR e.reference_month IS NULL)
  ORDER BY LOWER(TRIM(COALESCE(e.name, e.id::TEXT))), e.reference_month DESC NULLS LAST, e.created_at DESC;
END;
$func$ LANGUAGE plpgsql;
