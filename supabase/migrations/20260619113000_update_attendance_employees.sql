-- Update get_attendance_employees to strictly filter by active status, selected month, and handle historical data gracefully

CREATE OR REPLACE FUNCTION get_attendance_employees(
  p_plant_id UUID,
  p_reference_month DATE,
  p_staff_log_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS SETOF employees
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
  FROM employees e
  WHERE e.client_id = v_client_id
    AND e.plant_id = p_plant_id
    AND (
      (e.status = 'Ativo' AND e.reference_month = p_reference_month)
      OR 
      (e.id = ANY(p_staff_log_ids))
    )
  ORDER BY 
    COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)), e.id::TEXT),
    CASE WHEN e.id = ANY(p_staff_log_ids) THEN 0 ELSE 1 END,
    CASE WHEN e.reference_month = p_reference_month THEN 0 ELSE 1 END,
    CASE WHEN e.status = 'Ativo' THEN 0 ELSE 1 END,
    e.created_at DESC;
END;
$$;
