-- Fix get_attendance_employees to include ALL active employees regardless of reference_month match
-- The previous version filtered too aggressively, hiding valid collaborators

CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id UUID,
  p_reference_month DATE,
  p_staff_log_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS SETOF public.employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
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
    AND e.status NOT IN ('Deleted', 'Excluido', 'Excluído')
    AND (
      e.status = 'Ativo'
      OR e.id = ANY(p_staff_log_ids)
    )
  ORDER BY
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT),
    CASE WHEN e.id = ANY(p_staff_log_ids) THEN 0 ELSE 1 END,
    CASE WHEN e.reference_month = p_reference_month THEN 0 ELSE 1 END,
    CASE WHEN e.status = 'Ativo' THEN 0 ELSE 1 END,
    e.created_at DESC;
END;
$$;
