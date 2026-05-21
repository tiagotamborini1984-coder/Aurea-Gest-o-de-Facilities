DO $$
DECLARE
  v_plan RECORD;
  v_status_id UUID;
  v_seq INT;
  v_ticket_number TEXT;
  v_year TEXT;
  v_planned_start TIMESTAMP WITH TIME ZONE;
  v_planned_end TIMESTAMP WITH TIME ZONE;
  v_checklist_items JSONB;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');

  FOR v_plan IN 
    SELECT * FROM public.maintenance_preventive_plans WHERE is_active = true
  LOOP
    -- Check if it already has a generated ticket for this plan to be idempotent
    IF NOT EXISTS (
      SELECT 1 FROM public.maintenance_tickets 
      WHERE plan_id = v_plan.id AND origin = 'Preventiva'
    ) THEN
      
      -- Get initial status
      SELECT id INTO v_status_id 
      FROM public.maintenance_statuses 
      WHERE client_id = v_plan.client_id 
      ORDER BY order_index ASC 
      LIMIT 1;

      -- Sequence
      SELECT COALESCE(
        MAX(SUBSTRING(ticket_number FROM 'MAN-\d{4}-([0-9]+)')::INT), 0
      ) + 1 INTO v_seq
      FROM public.maintenance_tickets
      WHERE client_id = v_plan.client_id AND ticket_number LIKE 'MAN-' || v_year || '-%';

      v_ticket_number := 'MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

      -- Set planned dates to current week so it shows up in Planejamento easily
      v_planned_start := CURRENT_DATE + TIME '09:00:00';
      v_planned_end := v_planned_start + INTERVAL '2 hours';

      -- Generate initial checklist responses if any checklist items exist
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'item_id', id,
            'description', description,
            'status', 'pending',
            'notes', ''
          ) ORDER BY order_index ASC
        ),
        '[]'::jsonb
      ) INTO v_checklist_items
      FROM public.maintenance_plan_checklist_items
      WHERE plan_id = v_plan.id;

      INSERT INTO public.maintenance_tickets (
        client_id,
        plant_id,
        location_id,
        asset_id,
        type_id,
        priority_id,
        status_id,
        assignee_id,
        ticket_number,
        description,
        origin,
        plan_id,
        planned_start,
        planned_end,
        checklist_responses
      ) VALUES (
        v_plan.client_id,
        v_plan.plant_id,
        v_plan.location_id,
        v_plan.asset_id,
        v_plan.type_id,
        v_plan.priority_id,
        v_status_id,
        v_plan.assignee_id,
        v_ticket_number,
        '[PREVENTIVA] ' || v_plan.title || chr(10) || chr(10) || COALESCE(v_plan.description, ''),
        'Preventiva',
        v_plan.id,
        v_planned_start,
        v_planned_end,
        v_checklist_items
      );
      
      UPDATE public.maintenance_preventive_plans
      SET last_generated_date = CURRENT_DATE
      WHERE id = v_plan.id;

    END IF;
  END LOOP;
END $$;
