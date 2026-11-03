-- Migration: 20261103150000_fix_preventive_maintenance_dates_and_catchup.sql
-- Description:
-- 1. planned_end fix: sets planned_end to same day at 18:00 (planned_start + 10 hours), never skipping a period ahead
-- 2. First generation in past fix: loops target_due forward according to frequency until reaching current period even when last_generated_date IS NULL
-- 3. Timezone fix: computes current date in Brazil timezone (America/Sao_Paulo)
-- 4. Frequency normalization: unaccented, lowercase matching covering Diária, Semanal, Quinzenal, Mensal, Bimestral, Trimestral, Semestral, Anual

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
  v_today DATE;
  v_start_date DATE;
  v_target_due DATE;
  v_last_gen DATE;
  v_advance_days INT;
  v_generation_trigger_date DATE;
  v_planned_start TIMESTAMPTZ;
  v_planned_end TIMESTAMPTZ;
  v_checklist_items JSONB;
  v_generated_count INT := 0;
  v_evaluated_count INT := 0;
  v_safety INT;
  v_norm_freq TEXT;
BEGIN
  -- Data no fuso horário do Brasil (America/Sao_Paulo), evitando deslocamento entre 00h e 03h BRT
  v_today := (timezone('America/Sao_Paulo', now()))::DATE;
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
    v_advance_days := COALESCE(v_plan.advance_days, 0);

    -- Normalizar frequência (sem acentos, minúsculo)
    v_norm_freq := LOWER(TRIM(COALESCE(v_plan.frequency, '')));
    v_norm_freq := REPLACE(v_norm_freq, 'á', 'a');
    v_norm_freq := REPLACE(v_norm_freq, 'à', 'a');
    v_norm_freq := REPLACE(v_norm_freq, 'ã', 'a');
    v_norm_freq := REPLACE(v_norm_freq, 'â', 'a');
    v_norm_freq := REPLACE(v_norm_freq, 'é', 'e');
    v_norm_freq := REPLACE(v_norm_freq, 'ê', 'e');
    v_norm_freq := REPLACE(v_norm_freq, 'í', 'i');
    v_norm_freq := REPLACE(v_norm_freq, 'ó', 'o');
    v_norm_freq := REPLACE(v_norm_freq, 'ô', 'o');
    v_norm_freq := REPLACE(v_norm_freq, 'ú', 'u');

    -- Calculate next target due date (a data de execução prevista)
    IF v_plan.last_generated_date IS NOT NULL THEN
      v_last_gen := v_plan.last_generated_date;
      CASE v_norm_freq
        WHEN 'diaria' THEN v_target_due := v_last_gen + INTERVAL '1 day';
        WHEN 'diario' THEN v_target_due := v_last_gen + INTERVAL '1 day';
        WHEN 'semanal' THEN v_target_due := v_last_gen + INTERVAL '7 days';
        WHEN 'quinzenal' THEN v_target_due := v_last_gen + INTERVAL '15 days';
        WHEN 'mensal' THEN v_target_due := (v_last_gen + INTERVAL '1 month')::DATE;
        WHEN 'bimestral' THEN v_target_due := (v_last_gen + INTERVAL '2 months')::DATE;
        WHEN 'trimestral' THEN v_target_due := (v_last_gen + INTERVAL '3 months')::DATE;
        WHEN 'semestral' THEN v_target_due := (v_last_gen + INTERVAL '6 months')::DATE;
        WHEN 'anual' THEN v_target_due := (v_last_gen + INTERVAL '1 year')::DATE;
        ELSE v_target_due := (v_last_gen + INTERVAL '1 month')::DATE;
      END CASE;
    ELSE
      v_target_due := v_start_date;
    END IF;

    -- Loop de avanço ("catch-up"):
    -- Se a data calculada (ou start_date caso nunca tenha gerado) estiver no passado,
    -- avança respeitando a periodicidade até alcançar a ocorrência atual
    -- onde o trigger de geração é atingido ou v_target_due >= v_today
    IF v_target_due < v_today THEN
      v_safety := 0;
      WHILE (v_target_due - v_advance_days) < v_today AND v_target_due < v_today AND v_safety < 1000 LOOP
        CASE v_norm_freq
          WHEN 'diaria' THEN v_target_due := v_target_due + INTERVAL '1 day';
          WHEN 'diario' THEN v_target_due := v_target_due + INTERVAL '1 day';
          WHEN 'semanal' THEN v_target_due := v_target_due + INTERVAL '7 days';
          WHEN 'quinzenal' THEN v_target_due := v_target_due + INTERVAL '15 days';
          WHEN 'mensal' THEN v_target_due := (v_target_due + INTERVAL '1 month')::DATE;
          WHEN 'bimestral' THEN v_target_due := (v_target_due + INTERVAL '2 months')::DATE;
          WHEN 'trimestral' THEN v_target_due := (v_target_due + INTERVAL '3 months')::DATE;
          WHEN 'semestral' THEN v_target_due := (v_target_due + INTERVAL '6 months')::DATE;
          WHEN 'anual' THEN v_target_due := (v_target_due + INTERVAL '1 year')::DATE;
          ELSE v_target_due := (v_target_due + INTERVAL '1 month')::DATE;
        END CASE;
        v_safety := v_safety + 1;
      END LOOP;
    END IF;

    -- Data a partir da qual a OS deve ser gerada (N dias antes da data planejada)
    v_generation_trigger_date := v_target_due - v_advance_days;

    -- Deve gerar se a data de disparo foi alcançada
    IF v_today >= v_generation_trigger_date THEN
      -- A data planejada de execução da OS continua sendo v_target_due!
      -- Verificar idempotência: já existe OS para este plano com planned_start nessa data planejada?
      IF NOT EXISTS (
        SELECT 1 FROM public.maintenance_tickets t
        WHERE t.plan_id = v_plan.id
          AND t.planned_start >= (v_target_due::TEXT || ' 00:00:00+00')::TIMESTAMPTZ
          AND t.planned_start <= (v_target_due::TEXT || ' 23:59:59+00')::TIMESTAMPTZ
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

        -- Data início: 08:00 do dia planejado
        -- Data fim: 18:00 do MESMO dia planejado (nunca saltar para o próximo período)
        v_planned_start := (v_target_due::TEXT || ' 08:00:00+00')::TIMESTAMPTZ;
        v_planned_end := (v_target_due::TEXT || ' 18:00:00+00')::TIMESTAMPTZ;

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

        -- Update last_generated_date to the planned target execution date
        UPDATE public.maintenance_preventive_plans
        SET last_generated_date = v_target_due
        WHERE id = v_plan.id;

        v_generated_count := v_generated_count + 1;
      ELSE
        -- Update plan last_generated_date to keep it in sync with the planned execution date
        IF v_plan.last_generated_date IS NULL OR v_plan.last_generated_date < v_target_due THEN
          UPDATE public.maintenance_preventive_plans
          SET last_generated_date = v_target_due
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

GRANT EXECUTE ON FUNCTION public.generate_preventive_maintenance_tickets(UUID, UUID) TO authenticated;

-- Atualizar trigger no salvamento de plano com fuso horário do Brasil
CREATE OR REPLACE FUNCTION public.handle_preventive_plan_saved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (timezone('America/Sao_Paulo', now()))::DATE;
BEGIN
  -- Se o plano está ativo e hoje já atingiu a data de disparo (start_date - advance_days)
  IF NEW.is_active = true AND (NEW.start_date - COALESCE(NEW.advance_days, 0)) <= v_today THEN
    PERFORM public.generate_preventive_maintenance_tickets(NEW.client_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preventive_plan_saved ON public.maintenance_preventive_plans;
CREATE TRIGGER trg_preventive_plan_saved
  AFTER INSERT OR UPDATE OF is_active, start_date, frequency, advance_days ON public.maintenance_preventive_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_preventive_plan_saved();
