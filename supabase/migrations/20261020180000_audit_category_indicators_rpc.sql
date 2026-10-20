-- Migration: 20261020180000_audit_category_indicators_rpc.sql
-- Function to aggregate audit compliance metrics by category and monthly trend
-- with filters by audit type, authorized plants, and date range.

CREATE OR REPLACE FUNCTION public.get_audit_category_metrics(
  p_client_id UUID DEFAULT NULL,
  p_audit_type TEXT DEFAULT NULL,
  p_plant_ids UUID[] DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_role TEXT;
  v_result JSONB;
BEGIN
  -- Determine client_id and role
  v_role := public.get_user_role();
  
  -- If client_id is passed explicitly, use it (allows Master or direct client context)
  -- Otherwise resolve via user's profile
  IF p_client_id IS NOT NULL THEN
    v_client_id := p_client_id;
  ELSE
    v_client_id := public.get_user_client_id();
  END IF;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object(
      'summary', jsonb_build_object(
        'total_executions', 0,
        'overall_compliance_pct', 0,
        'total_evaluated_questions', 0,
        'total_points_lost', 0,
        'best_category', null,
        'worst_category', null
      ),
      'categories', '[]'::jsonb,
      'trend', '[]'::jsonb
    );
  END IF;

  WITH filtered_executions AS (
    SELECT 
      e.id AS execution_id,
      e.plant_id,
      e.audit_id,
      COALESCE(e.realization_date, e.created_at::date) AS ref_date,
      a.type AS audit_type
    FROM public.audit_executions e
    JOIN public.audits a ON a.id = e.audit_id
    WHERE a.client_id = v_client_id
      AND e.status IN ('Finalizada', 'Finalizado', 'Concluído', 'Concluída')
      AND (
        v_role = 'Master' 
        OR auth.uid() IS NULL -- Fallback for service/DB direct calls
        OR public.is_plant_authorized(e.plant_id)
      )
      AND (p_audit_type IS NULL OR p_audit_type = '' OR p_audit_type = 'all' OR a.type = p_audit_type)
      AND (p_plant_ids IS NULL OR cardinality(p_plant_ids) = 0 OR e.plant_id = ANY(p_plant_ids))
      AND (p_start_date IS NULL OR COALESCE(e.realization_date, e.created_at::date) >= p_start_date)
      AND (p_end_date IS NULL OR COALESCE(e.realization_date, e.created_at::date) <= p_end_date)
  ),
  answers_joined AS (
    SELECT 
      fe.execution_id,
      fe.ref_date,
      to_char(fe.ref_date, 'YYYY-MM') AS month_key,
      COALESCE(c.id::text, 'uncategorized') AS category_id,
      COALESCE(c.name, 'Sem categoria') AS category_name,
      COALESCE(c.color, '#94a3b8') AS category_color,
      ans.score,
      COALESCE(NULLIF(act.weight, 0), 1)::numeric AS weight,
      (ans.score * COALESCE(NULLIF(act.weight, 0), 1))::numeric AS obtained_weighted,
      (5 * COALESCE(NULLIF(act.weight, 0), 1))::numeric AS max_weighted
    FROM filtered_executions fe
    JOIN public.audit_execution_answers ans ON ans.execution_id = fe.execution_id
    JOIN public.audit_actions act ON act.id = ans.action_id
    LEFT JOIN public.audit_question_categories c ON c.id = act.category_id
    WHERE ans.score IS NOT NULL
  ),
  cat_agg AS (
    SELECT 
      category_id,
      category_name,
      category_color,
      COUNT(*)::int AS evaluated_questions,
      ROUND(SUM(obtained_weighted), 2) AS obtained_score,
      ROUND(SUM(max_weighted), 2) AS max_possible_score,
      ROUND(SUM(max_weighted) - SUM(obtained_weighted), 2) AS points_lost,
      CASE 
        WHEN SUM(max_weighted) > 0 
        THEN ROUND((SUM(obtained_weighted) / SUM(max_weighted) * 100)::numeric, 1)
        ELSE 0
      END AS compliance_percentage
    FROM answers_joined
    GROUP BY category_id, category_name, category_color
  ),
  monthly_cat_agg AS (
    SELECT 
      month_key,
      category_id,
      category_name,
      category_color,
      COUNT(*)::int AS evaluated_questions,
      ROUND(SUM(obtained_weighted), 2) AS obtained_score,
      ROUND(SUM(max_weighted), 2) AS max_possible_score,
      CASE 
        WHEN SUM(max_weighted) > 0 
        THEN ROUND((SUM(obtained_weighted) / SUM(max_weighted) * 100)::numeric, 1)
        ELSE 0
      END AS compliance_percentage
    FROM answers_joined
    GROUP BY month_key, category_id, category_name, category_color
  ),
  monthly_trend_grouped AS (
    SELECT 
      m.month_key,
      jsonb_agg(
        jsonb_build_object(
          'category_id', m.category_id,
          'category_name', m.category_name,
          'category_color', m.category_color,
          'compliance_percentage', m.compliance_percentage,
          'evaluated_questions', m.evaluated_questions,
          'obtained_score', m.obtained_score,
          'max_possible_score', m.max_possible_score
        )
        ORDER BY m.category_name
      ) AS categories
    FROM monthly_cat_agg m
    GROUP BY m.month_key
    ORDER BY m.month_key ASC
  ),
  overall_summary AS (
    SELECT 
      (SELECT COUNT(DISTINCT execution_id)::int FROM filtered_executions) AS total_executions,
      COUNT(*)::int AS total_evaluated_questions,
      ROUND(COALESCE(SUM(obtained_weighted), 0), 2) AS overall_obtained,
      ROUND(COALESCE(SUM(max_weighted), 0), 2) AS overall_max,
      ROUND(COALESCE(SUM(max_weighted) - SUM(obtained_weighted), 0), 2) AS total_points_lost,
      CASE 
        WHEN COALESCE(SUM(max_weighted), 0) > 0 
        THEN ROUND((SUM(obtained_weighted) / SUM(max_weighted) * 100)::numeric, 1)
        ELSE 0 
      END AS overall_compliance_pct
    FROM answers_joined
  ),
  ranked_categories AS (
    SELECT 
      category_id,
      category_name,
      category_color,
      compliance_percentage,
      ROW_NUMBER() OVER (ORDER BY compliance_percentage DESC, evaluated_questions DESC) AS best_rank,
      ROW_NUMBER() OVER (ORDER BY compliance_percentage ASC, evaluated_questions DESC) AS worst_rank
    FROM cat_agg
    WHERE evaluated_questions > 0
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_executions', COALESCE(s.total_executions, 0),
      'overall_compliance_pct', COALESCE(s.overall_compliance_pct, 0),
      'total_evaluated_questions', COALESCE(s.total_evaluated_questions, 0),
      'total_points_lost', COALESCE(s.total_points_lost, 0),
      'best_category', (
        SELECT jsonb_build_object(
          'id', r.category_id,
          'name', r.category_name,
          'color', r.category_color,
          'compliance_percentage', r.compliance_percentage
        )
        FROM ranked_categories r
        WHERE r.best_rank = 1
        LIMIT 1
      ),
      'worst_category', (
        SELECT jsonb_build_object(
          'id', r.category_id,
          'name', r.category_name,
          'color', r.category_color,
          'compliance_percentage', r.compliance_percentage
        )
        FROM ranked_categories r
        WHERE r.worst_rank = 1
        LIMIT 1
      )
    ),
    'categories', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.category_id,
          'name', c.category_name,
          'color', c.category_color,
          'evaluated_questions', c.evaluated_questions,
          'obtained_score', c.obtained_score,
          'max_possible_score', c.max_possible_score,
          'points_lost', c.points_lost,
          'compliance_percentage', c.compliance_percentage
        )
        ORDER BY 
          CASE WHEN c.category_id = 'uncategorized' THEN 1 ELSE 0 END,
          c.compliance_percentage ASC,
          c.category_name ASC
      )
      FROM cat_agg c
    ), '[]'::jsonb),
    'trend', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'month', t.month_key,
          'categories', t.categories
        )
      )
      FROM monthly_trend_grouped t
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM overall_summary s;

  RETURN v_result;
END;
$$;

-- Grant execution to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.get_audit_category_metrics(UUID, TEXT, UUID[], DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_category_metrics(UUID, TEXT, UUID[], DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_audit_category_metrics(UUID, TEXT, UUID[], DATE, DATE) TO service_role;
