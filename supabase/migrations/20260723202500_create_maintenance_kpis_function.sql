CREATE OR REPLACE FUNCTION public.get_maintenance_kpis(
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
  v_sla_total INTEGER := 0;
  v_sla_within INTEGER := 0;
  v_sla_adherence NUMERIC;
  v_tma_minutes NUMERIC;
  v_proactive_count INTEGER := 0;
  v_reactive_count INTEGER := 0;
  v_total_repair INTEGER := 0;
  v_proactive_percentage NUMERIC;
  v_reactive_percentage NUMERIC;
BEGIN
  v_client_id := COALESCE(p_client_id, get_user_client_id());

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object(
      'sla_adherence', NULL,
      'tma_minutes', NULL,
      'proactive_percentage', NULL,
      'reactive_percentage', NULL
    );
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE t.actual_end IS NOT NULL),
    COUNT(*) FILTER (
      WHERE t.actual_end IS NOT NULL
      AND t.actual_end <= t.reported_at + (COALESCE(pr.sla_hours, 0) * INTERVAL '1 hour')
    )
  INTO v_sla_total, v_sla_within
  FROM maintenance_tickets t
  LEFT JOIN maintenance_priorities pr ON t.priority_id = pr.id
  WHERE t.client_id = v_client_id
    AND (p_plant_id IS NULL OR t.plant_id = p_plant_id)
    AND t.reported_at::date >= p_date_start
    AND t.reported_at::date <= p_date_end;

  IF v_sla_total > 0 THEN
    v_sla_adherence := ROUND((v_sla_within::NUMERIC / v_sla_total) * 100, 1);
  ELSE
    v_sla_adherence := NULL;
  END IF;

  SELECT AVG(EXTRACT(EPOCH FROM (t.actual_end - t.reported_at)) / 60)
  INTO v_tma_minutes
  FROM maintenance_tickets t
  WHERE t.client_id = v_client_id
    AND (p_plant_id IS NULL OR t.plant_id = p_plant_id)
    AND t.reported_at::date >= p_date_start
    AND t.reported_at::date <= p_date_end
    AND t.actual_end IS NOT NULL;

  IF v_tma_minutes IS NOT NULL THEN
    v_tma_minutes := ROUND(v_tma_minutes, 0);
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE LOWER(t.origin) IN ('preventive', 'planned', 'preventiva')),
    COUNT(*) FILTER (WHERE LOWER(t.origin) IN ('corrective', 'emergency', 'reactive', 'manual', 'portal'))
  INTO v_proactive_count, v_reactive_count
  FROM maintenance_tickets t
  WHERE t.client_id = v_client_id
    AND (p_plant_id IS NULL OR t.plant_id = p_plant_id)
    AND t.reported_at::date >= p_date_start
    AND t.reported_at::date <= p_date_end;

  v_total_repair := v_proactive_count + v_reactive_count;

  IF v_total_repair > 0 THEN
    v_proactive_percentage := ROUND((v_proactive_count::NUMERIC / v_total_repair) * 100, 1);
    v_reactive_percentage := ROUND((v_reactive_count::NUMERIC / v_total_repair) * 100, 1);
  ELSE
    v_proactive_percentage := NULL;
    v_reactive_percentage := NULL;
  END IF;

  RETURN jsonb_build_object(
    'sla_adherence', v_sla_adherence,
    'tma_minutes', v_tma_minutes,
    'proactive_percentage', v_proactive_percentage,
    'reactive_percentage', v_reactive_percentage
  );
END;
$$;
