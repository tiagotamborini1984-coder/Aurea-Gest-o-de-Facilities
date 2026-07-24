CREATE OR REPLACE FUNCTION public.get_maintenance_dashboard_metrics(
  p_client_id UUID,
  p_plant_id UUID,
  p_date_start DATE,
  p_date_end DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_completed_by_area JSONB;
  v_schedule_total INTEGER := 0;
  v_schedule_on_time INTEGER := 0;
  v_schedule_adherence NUMERIC;
  v_prev_total INTEGER := 0;
  v_prev_on_time INTEGER := 0;
  v_prev_adherence NUMERIC;
BEGIN
  v_client_id := COALESCE(p_client_id, get_user_client_id());

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object(
      'completed_by_area', '[]'::jsonb,
      'schedule_adherence', NULL,
      'preventive_adherence', NULL
    );
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'area_id', area_id,
    'area_name', area_name,
    'count', ticket_count
  )), '[]'::jsonb)
  INTO v_completed_by_area
  FROM (
    SELECT
      t.area_id,
      COALESCE(a.name, 'Sem Área') as area_name,
      COUNT(*) as ticket_count
    FROM maintenance_tickets t
    LEFT JOIN maintenance_areas a ON t.area_id = a.id
    WHERE t.client_id = v_client_id
      AND (p_plant_id IS NULL OR t.plant_id = p_plant_id)
      AND t.actual_end IS NOT NULL
      AND t.actual_end::date >= p_date_start
      AND t.actual_end::date <= p_date_end
    GROUP BY t.area_id, COALESCE(a.name, 'Sem Área')
  ) sub;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE t.actual_start IS NOT NULL
        AND t.actual_end IS NOT NULL
        AND t.planned_start IS NOT NULL
        AND t.planned_end IS NOT NULL
        AND ABS(EXTRACT(EPOCH FROM (t.actual_start - t.planned_start)) / 86400) <= 1
        AND ABS(EXTRACT(EPOCH FROM (t.actual_end - t.planned_end)) / 86400) <= 1
    )
  INTO v_schedule_total, v_schedule_on_time
  FROM maintenance_tickets t
  WHERE t.client_id = v_client_id
    AND (p_plant_id IS NULL OR t.plant_id = p_plant_id)
    AND t.planned_start IS NOT NULL
    AND t.actual_end IS NOT NULL
    AND t.actual_end::date >= p_date_start
    AND t.actual_end::date <= p_date_end;

  IF v_schedule_total > 0 THEN
    v_schedule_adherence := ROUND((v_schedule_on_time::NUMERIC / v_schedule_total) * 100, 1);
  ELSE
    v_schedule_adherence := NULL;
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE t.actual_end IS NOT NULL
        AND t.planned_end IS NOT NULL
        AND t.actual_end <= t.planned_end
    )
  INTO v_prev_total, v_prev_on_time
  FROM maintenance_tickets t
  WHERE t.client_id = v_client_id
    AND (p_plant_id IS NULL OR t.plant_id = p_plant_id)
    AND t.plan_id IS NOT NULL
    AND t.actual_end IS NOT NULL
    AND t.actual_end::date >= p_date_start
    AND t.actual_end::date <= p_date_end;

  IF v_prev_total > 0 THEN
    v_prev_adherence := ROUND((v_prev_on_time::NUMERIC / v_prev_total) * 100, 1);
  ELSE
    v_prev_adherence := NULL;
  END IF;

  RETURN jsonb_build_object(
    'completed_by_area', v_completed_by_area,
    'schedule_adherence', v_schedule_adherence,
    'preventive_adherence', v_prev_adherence
  );
END;
$$;
