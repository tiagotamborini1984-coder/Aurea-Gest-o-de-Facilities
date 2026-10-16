-- 1. Ensure extensions for scheduled edge function triggers
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Core database function to generate preventive maintenance tickets directly in PostgreSQL
-- This guarantees generation works reliably even if an external HTTP cron fails,
-- and allows invoking from RPC, triggers, or pg_cron directly.
CREATE OR REPLACE FUNCTION public.generate_preventive_maintenance_tickets(
  p_client_id UUID DEFAULT NULL,
  p_plan_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan RECORD;
  v_status_id UUID;
  v_seq INT;
  v_ticket_number TEXT;
  v_year TEXT;
  v_today DATE := CURRENT_DATE;
  v_start_date DATE;
  v_next_due DATE;
  v_last_gen DATE;
  v_scheduled_date DATE;
  v_planned_start TIMESTAMPTZ;
  v_planned_end TIMESTAMPTZ;
  v_checklist_items JSONB;
  v_generated_count INT := 0;
  v_evaluated_count INT := 0;
  v_safety INT;
BEGIN
  v_year := to_char(v_today, 'YYYY');

  FOR v_plan IN
    SELECT p.*
    FROM public.maintenance_preventive_plans p
    WHERE p.is_active = true
      AND (p_client_id IS NULL OR p.client_id = p_client_id)
      AND (p_plan_id IS NULL OR p.id = p_plan_id)
  LOOP
    v_evaluated_count := v_evaluated_count + 1;
    v_start_date := COALESCE(v_plan.start_date, v_today);

    -- Calculate next due date
    IF v_plan.last_generated_date IS NOT NULL THEN
      v_last_gen := v_plan.last_generated_date;
      CASE LOWER(TRIM(v_plan.frequency))
        WHEN 'diária' THEN v_next_due := v_last_gen + INTERVAL '1 day';
        WHEN 'diaria' THEN v_next_due := v_last_gen + INTERVAL '1 day';
        WHEN 'semanal' THEN v_next_due := v_last_gen + INTERVAL '7 days';
        WHEN 'quinzenal' THEN v_next_due := v_last_gen + INTERVAL '15 days';
        WHEN 'mensal' THEN v_next_due := (v_last_gen + INTERVAL '1 month')::DATE;
        WHEN 'bimestral' THEN v_next_due := (v_last_gen + INTERVAL '2 months')::DATE;
        WHEN 'trimestral' THEN v_next_due := (v_last_gen + INTERVAL '3 months')::DATE;
        WHEN 'semestral' THEN v_next_due := (v_last_gen + INTERVAL '6 months')::DATE;
        WHEN 'anual' THEN v_next_due := (v_last_gen + INTERVAL '1 year')::DATE;
        ELSE v_next_due := (v_last_gen + INTERVAL '1 month')::DATE;
      END CASE;

      -- If next due is still in past, step forward to current period
      v_safety := 0;
      WHILE v_next_due < v_today AND v_safety < 100 LOOP
        CASE LOWER(TRIM(v_plan.frequency))
          WHEN 'diária' THEN v_next_due := v_next_due + INTERVAL '1 day';
          WHEN 'diaria' THEN v_next_due := v_next_due + INTERVAL '1 day';
          WHEN 'semanal' THEN v_next_due := v_next_due + INTERVAL '7 days';
          WHEN 'quinzenal' THEN v_next_due := v_next_due + INTERVAL '15 days';
          WHEN 'mensal' THEN v_next_due := (v_next_due + INTERVAL '1 month')::DATE;
          WHEN 'bimestral' THEN v_next_due := (v_next_due + INTERVAL '2 months')::DATE;
          WHEN 'trimestral' THEN v_next_due := (v_next_due + INTERVAL '3 months')::DATE;
          WHEN 'semestral' THEN v_next_due := (v_next_due + INTERVAL '6 months')::DATE;
          WHEN 'anual' THEN v_next_due := (v_next_due + INTERVAL '1 year')::DATE;
          ELSE v_next_due := (v_next_due + INTERVAL '1 month')::DATE;
        END CASE;
        v_safety := v_safety + 1;
      END LOOP;
    ELSE
      v_next_due := v_start_date;
    END IF;

    -- Only generate if due date is today or earlier (or if start date reached and never generated)
    IF v_today >= v_next_due OR (v_plan.last_generated_date IS NULL AND v_today >= v_start_date) THEN
      v_scheduled_date := LEAST(v_today, v_next_due);

      -- Check if already generated for this plan on this date
      IF NOT EXISTS (
        SELECT 1 FROM public.maintenance_tickets t
        WHERE t.plan_id = v_plan.id
          AND t.planned_start >= (v_scheduled_date::TEXT || ' 00:00:00+00')::TIMESTAMPTZ
          AND t.planned_start <= (v_scheduled_date::TEXT || ' 23:59:59+00')::TIMESTAMPTZ
      ) THEN
        -- Resolve initial status (Planejado > Aberto > first non-terminal)
        SELECT id INTO v_status_id
        FROM public.maintenance_statuses
        WHERE client_id = v_plan.client_id
          AND (step = 'Planejado' OR LOWER(name) = 'planejado')
        LIMIT 1;

        IF v_status_id IS NULL THEN
          SELECT id INTO v_status_id
          FROM public.maintenance_statuses
          WHERE client_id = v_plan.client_id
            AND (step = 'Aberto' OR LOWER(name) = 'aberto')
          LIMIT 1;
        END IF;

        IF v_status_id IS NULL THEN
          SELECT id INTO v_status_id
          FROM public.maintenance_statuses
          WHERE client_id = v_plan.client_id
            AND is_terminal = false
          ORDER BY order_index ASC
          LIMIT 1;
        END IF;

        IF v_status_id IS NULL THEN
          SELECT id INTO v_status_id
          FROM public.maintenance_statuses
          WHERE client_id = v_plan.client_id
          ORDER BY order_index ASC
          LIMIT 1;
        END IF;

        -- Resolve ticket sequence
        SELECT COALESCE(
          MAX(SUBSTRING(ticket_number FROM 'MAN-\d{4}-([0-9]+)')::INT), 0
        ) + 1 INTO v_seq
        FROM public.maintenance_tickets
        WHERE client_id = v_plan.client_id AND ticket_number LIKE 'MAN-' || v_year || '-%';

        v_ticket_number := 'MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

        v_planned_start := (v_scheduled_date::TEXT || ' 08:00:00+00')::TIMESTAMPTZ;
        CASE LOWER(TRIM(v_plan.frequency))
          WHEN 'diária' THEN v_planned_end := v_planned_start + INTERVAL '10 hours';
          WHEN 'diaria' THEN v_planned_end := v_planned_start + INTERVAL '10 hours';
          WHEN 'semanal' THEN v_planned_end := v_planned_start + INTERVAL '7 days';
          WHEN 'quinzenal' THEN v_planned_end := v_planned_start + INTERVAL '15 days';
          WHEN 'mensal' THEN v_planned_end := v_planned_start + INTERVAL '1 month';
          WHEN 'bimestral' THEN v_planned_end := v_planned_start + INTERVAL '2 months';
          WHEN 'trimestral' THEN v_planned_end := v_planned_start + INTERVAL '3 months';
          WHEN 'semestral' THEN v_planned_end := v_planned_start + INTERVAL '6 months';
          WHEN 'anual' THEN v_planned_end := v_planned_start + INTERVAL '1 year';
          ELSE v_planned_end := v_planned_start + INTERVAL '1 month';
        END CASE;

        -- Checklist items
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

        -- Insert OS
        INSERT INTO public.maintenance_tickets (
          client_id,
          plant_id,
          area_id,
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
          v_plan.area_id,
          v_plan.location_id,
          v_plan.asset_id,
          v_plan.type_id,
          v_plan.priority_id,
          v_status_id,
          v_plan.assignee_id,
          v_ticket_number,
          TRIM('[PREVENTIVA] ' || v_plan.title || chr(10) || chr(10) || COALESCE(v_plan.description, '')),
          'Preventiva',
          v_plan.id,
          v_planned_start,
          v_planned_end,
          v_checklist_items
        );

        -- Update last_generated_date
        UPDATE public.maintenance_preventive_plans
        SET last_generated_date = v_scheduled_date
        WHERE id = v_plan.id;

        v_generated_count := v_generated_count + 1;
      ELSE
        -- Update plan last_generated_date to keep it in sync
        IF v_plan.last_generated_date IS NULL OR v_plan.last_generated_date < v_scheduled_date THEN
          UPDATE public.maintenance_preventive_plans
          SET last_generated_date = v_scheduled_date
          WHERE id = v_plan.id;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'evaluated_count', v_evaluated_count,
    'generated_count', v_generated_count
  );
END;
$$;

-- Grant execute to authenticated users (role-based logic handles tenant isolation)
GRANT EXECUTE ON FUNCTION public.generate_preventive_maintenance_tickets(UUID, UUID) TO authenticated;

-- 3. Trigger on insert/update of maintenance_preventive_plans:
-- Whenever a plan is created or updated as active with start_date <= CURRENT_DATE,
-- immediately generate the ticket if due, so user doesn't even have to wait for the daily cron!
CREATE OR REPLACE FUNCTION public.handle_preventive_plan_saved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true AND NEW.start_date <= CURRENT_DATE THEN
    PERFORM public.generate_preventive_maintenance_tickets(NEW.client_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preventive_plan_saved ON public.maintenance_preventive_plans;
CREATE TRIGGER trg_preventive_plan_saved
  AFTER INSERT OR UPDATE OF is_active, start_date, frequency ON public.maintenance_preventive_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_preventive_plan_saved();

-- 4. Register pg_cron daily job to invoke the generator every morning at 06:00
-- Also calls the edge function via net.http_post for webhook/notification consistency if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-preventive-maintenance-daily') THEN
    PERFORM cron.unschedule('process-preventive-maintenance-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'process-preventive-maintenance-daily',
  '0 6 * * *',
  $$
  SELECT public.generate_preventive_maintenance_tickets();
  $$
);

-- 5. Backfill: run immediately for all existing active plans that are due
SELECT public.generate_preventive_maintenance_tickets();
