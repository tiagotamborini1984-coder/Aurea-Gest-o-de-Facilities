-- Migration: 20261028210000_add_nc_sla_days_to_audits.sql
-- Adiciona campo nc_sla_days em public.audits e atualiza a função submit_audit_execution
-- para aplicar o SLA configurado especificamente para Não Conformidades (NCs).

ALTER TABLE public.audits 
ADD COLUMN IF NOT EXISTS nc_sla_days integer DEFAULT 5;

COMMENT ON COLUMN public.audits.nc_sla_days IS 'SLA em dias úteis/corridos para resolução das Não Conformidades geradas nesta auditoria';

-- Atualização da função submit_audit_execution
CREATE OR REPLACE FUNCTION public.submit_audit_execution(
  p_execution_id uuid,
  p_answers jsonb,
  p_participants text DEFAULT NULL,
  p_is_draft boolean DEFAULT false,
  p_signatures jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id uuid;
  v_plant_id uuid;
  v_assignee_id uuid;
  v_task_id uuid;
  v_client_id uuid;
  v_audit_title text;
  v_freq text;
  v_sla_days integer;
  v_nc_sla_days integer;
  v_total_score numeric := 0;
  v_max_score numeric := 0;
  v_max_possible_score numeric := 5;
  v_answer jsonb;
  v_action_id uuid;
  v_score numeric;
  v_obs text;
  v_evidence text;
  v_evidence_urls jsonb;
  v_corrective_assignee uuid;
  v_corrective_due date;
  v_type_id uuid;
  v_status_id uuid;
  v_terminal_status_id uuid;
  v_action record;
  v_existing_task uuid;
  v_nc_assignee uuid;
  v_nc_due_date timestamptz;
  v_user_id uuid;
  v_base_now timestamptz;
  v_base_date_brt date;
  v_target_date_brt date;
  v_nc_target_date_brt date;
  v_due_date timestamptz;
  v_effective_nc_days integer;
BEGIN
  -- 1. Obter dados da execução
  SELECT audit_id, plant_id, assignee_id, task_id
  INTO v_audit_id, v_plant_id, v_assignee_id, v_task_id
  FROM public.audit_executions
  WHERE id = p_execution_id;

  IF v_audit_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Execução não encontrada.');
  END IF;

  -- 2. Obter dados da auditoria base (incluindo nc_sla_days)
  SELECT client_id, title, frequency, sla_days, nc_sla_days 
  INTO v_client_id, v_audit_title, v_freq, v_sla_days, v_nc_sla_days
  FROM public.audits 
  WHERE id = v_audit_id;

  -- 3. Upsert atômico de respostas (SEM DELETE para não violar guard de segurança)
  IF p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
      IF v_answer ? 'value' THEN
        v_answer := v_answer->'value';
      END IF;

      BEGIN
        v_action_id := (v_answer->>'action_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_action_id := NULL;
      END;

      IF v_action_id IS NULL THEN
        CONTINUE;
      END IF;

      BEGIN
        v_score := NULLIF(v_answer->>'score', '')::numeric;
      EXCEPTION WHEN OTHERS THEN
        v_score := NULL;
      END;

      v_obs := v_answer->>'observations';
      v_evidence := v_answer->>'evidence_url';
      
      IF v_answer ? 'evidence_urls' AND jsonb_typeof(v_answer->'evidence_urls') = 'array' THEN
        v_evidence_urls := v_answer->'evidence_urls';
      ELSIF v_evidence IS NOT NULL AND v_evidence <> '' THEN
        v_evidence_urls := jsonb_build_array(v_evidence);
      ELSE
        v_evidence_urls := '[]'::jsonb;
      END IF;

      BEGIN
        v_corrective_assignee := NULLIF(v_answer->>'corrective_assignee_id', '')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_corrective_assignee := NULL;
      END;

      BEGIN
        v_corrective_due := NULLIF(v_answer->>'corrective_due_date', '')::date;
      EXCEPTION WHEN OTHERS THEN
        v_corrective_due := NULL;
      END;

      INSERT INTO public.audit_execution_answers (
        execution_id,
        action_id,
        score,
        observations,
        evidence_url,
        evidence_urls,
        corrective_assignee_id,
        corrective_due_date
      ) VALUES (
        p_execution_id,
        v_action_id,
        v_score,
        v_obs,
        v_evidence,
        v_evidence_urls,
        v_corrective_assignee,
        v_corrective_due
      )
      ON CONFLICT (execution_id, action_id) DO UPDATE SET
        score = COALESCE(EXCLUDED.score, audit_execution_answers.score),
        observations = CASE 
          WHEN EXCLUDED.observations IS NOT NULL AND EXCLUDED.observations <> '' THEN EXCLUDED.observations 
          ELSE COALESCE(EXCLUDED.observations, audit_execution_answers.observations) 
        END,
        evidence_url = CASE 
          WHEN EXCLUDED.evidence_url IS NOT NULL AND EXCLUDED.evidence_url <> '' THEN EXCLUDED.evidence_url 
          ELSE COALESCE(EXCLUDED.evidence_url, audit_execution_answers.evidence_url) 
        END,
        evidence_urls = CASE 
          WHEN jsonb_array_length(EXCLUDED.evidence_urls) > 0 THEN EXCLUDED.evidence_urls 
          ELSE audit_execution_answers.evidence_urls 
        END,
        corrective_assignee_id = COALESCE(EXCLUDED.corrective_assignee_id, audit_execution_answers.corrective_assignee_id),
        corrective_due_date = COALESCE(EXCLUDED.corrective_due_date, audit_execution_answers.corrective_due_date);
    END LOOP;
  END IF;

  -- 4. Tratamento de rascunho
  IF p_is_draft THEN
    UPDATE public.audit_executions
    SET 
      participants = COALESCE(p_participants, participants),
      signatures = COALESCE(p_signatures, signatures)
    WHERE id = p_execution_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'Pendente');
  END IF;

  -- 5. Cálculo de pontuação
  SELECT COALESCE(SUM(aea.score * COALESCE(aa.weight, 1)), 0) INTO v_total_score
  FROM public.audit_execution_answers aea
  JOIN public.audit_actions aa ON aa.id = aea.action_id
  WHERE aea.execution_id = p_execution_id
    AND aea.score IS NOT NULL;

  SELECT COALESCE(MAX((s->>'score')::numeric), 5) INTO v_max_possible_score
  FROM public.audits a
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE jsonb_typeof(a.scoring_settings)
      WHEN 'array' THEN a.scoring_settings
      ELSE '[]'::jsonb
    END
  ) s ON true
  WHERE a.id = v_audit_id;

  IF v_max_possible_score IS NULL OR v_max_possible_score <= 0 THEN
    v_max_possible_score := 5;
  END IF;

  SELECT COALESCE(SUM(COALESCE(weight, 1) * v_max_possible_score), 0) INTO v_max_score
  FROM public.audit_actions
  WHERE audit_id = v_audit_id;

  IF v_max_score IS NULL OR v_max_score <= 0 THEN
    v_max_score := 1;
  END IF;

  -- 6. Finalizar execução de auditoria
  UPDATE public.audit_executions
  SET 
    status = 'Finalizado',
    realization_date = COALESCE(realization_date, ((NOW() AT TIME ZONE 'America/Sao_Paulo')::date)),
    participants = COALESCE(p_participants, participants),
    signatures = COALESCE(p_signatures, signatures),
    final_score = v_total_score,
    max_score = v_max_score
  WHERE id = p_execution_id;

  -- 7. Concluir tarefa vinculada da auditoria se existir
  SELECT id INTO v_terminal_status_id
  FROM public.task_statuses
  WHERE client_id = v_client_id AND is_terminal = true
  ORDER BY created_at ASC LIMIT 1;

  IF v_task_id IS NOT NULL AND v_terminal_status_id IS NOT NULL THEN
    UPDATE public.tasks
    SET status_id = v_terminal_status_id,
        closed_at = COALESCE(closed_at, NOW())
    WHERE id = v_task_id;
  ELSIF v_task_id IS NULL AND v_terminal_status_id IS NOT NULL THEN
    SELECT t.id INTO v_task_id
    FROM public.tasks t
    JOIN public.task_statuses ts ON ts.id = t.status_id
    WHERE t.audit_id = v_audit_id
      AND ts.is_terminal = false
    ORDER BY t.created_at DESC LIMIT 1;

    IF v_task_id IS NOT NULL THEN
      UPDATE public.audit_executions SET task_id = v_task_id WHERE id = p_execution_id;
      UPDATE public.tasks
      SET status_id = v_terminal_status_id,
          closed_at = COALESCE(closed_at, NOW())
      WHERE id = v_task_id;
    END IF;
  END IF;

  -- 8. Geração de demandas de Não Conformidade (NC) para notas <= 3
  SELECT id INTO v_type_id FROM public.task_types 
  WHERE client_id = v_client_id 
    AND (name ILIKE '%Não Conformidade%' OR name ILIKE '%Nao Conformidade%')
  LIMIT 1;

  IF v_type_id IS NULL THEN
    INSERT INTO public.task_types (client_id, name, sla_hours)
    VALUES (v_client_id, 'Não Conformidade', 48)
    RETURNING id INTO v_type_id;
  END IF;

  SELECT id INTO v_status_id FROM public.task_statuses
  WHERE client_id = v_client_id AND is_terminal = false 
  ORDER BY created_at ASC LIMIT 1;

  -- Base date no fuso horário do Brasil (America/Sao_Paulo)
  v_base_now := NOW();
  v_base_date_brt := (v_base_now AT TIME ZONE 'America/Sao_Paulo')::date;

  -- Definição do SLA específico para NC:
  -- Prioridade 1: nc_sla_days da auditoria
  -- Prioridade 2: sla_days da auditoria
  -- Prioridade 3: 5 dias corridos padrão para Não Conformidades
  v_effective_nc_days := COALESCE(v_nc_sla_days, v_sla_days, 5);
  IF v_effective_nc_days <= 0 THEN
    v_effective_nc_days := 5;
  END IF;

  v_nc_target_date_brt := v_base_date_brt + v_effective_nc_days;

  -- Vencimento às 23:59:59 America/Sao_Paulo, nunca no passado
  v_due_date := (v_nc_target_date_brt::text || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  IF v_due_date <= v_base_now THEN 
    v_due_date := ((v_base_date_brt + 1)::text || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  END IF;

  FOR v_action IN (
    SELECT a.id, a.title, e.score, e.observations, e.corrective_assignee_id, e.corrective_due_date
    FROM public.audit_actions a
    JOIN public.audit_execution_answers e ON e.action_id = a.id
    WHERE e.execution_id = p_execution_id 
      AND e.score IS NOT NULL 
      AND e.score <= 3
  ) LOOP
    SELECT t.id INTO v_existing_task
    FROM public.tasks t
    JOIN public.task_statuses ts ON t.status_id = ts.id
    WHERE t.client_id = v_client_id 
      AND t.audit_id = v_audit_id
      AND t.title = 'Não Conformidade: ' || substring(v_action.title from 1 for 50)
      AND ts.is_terminal = false
    LIMIT 1;

    IF v_existing_task IS NULL THEN
      v_nc_assignee := COALESCE(v_action.corrective_assignee_id, v_assignee_id);
      IF v_nc_assignee IS NULL THEN
        SELECT id INTO v_nc_assignee FROM public.profiles WHERE client_id = v_client_id LIMIT 1;
      END IF;

      IF v_action.corrective_due_date IS NOT NULL THEN
        v_nc_due_date := (v_action.corrective_due_date::text || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        IF v_nc_due_date <= v_base_now THEN
          v_nc_due_date := ((v_base_date_brt + 1)::text || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        END IF;
      ELSE
        v_nc_due_date := v_due_date;
      END IF;

      INSERT INTO public.tasks (
        client_id, plant_id, type_id, status_id, requester_id, assignee_id,
        task_number, title, description, due_date, audit_id, status_updated_at
      ) VALUES (
        v_client_id, 
        v_plant_id, 
        v_type_id, 
        v_status_id, 
        COALESCE(v_assignee_id, v_nc_assignee), 
        v_nc_assignee,
        'GERANDO...',
        'Não Conformidade: ' || substring(v_action.title from 1 for 50),
        'Foi identificada uma Não Conformidade durante a auditoria "' || v_audit_title || '".' || E'\n\n' ||
        'Ação Avaliada: ' || v_action.title || E'\n' ||
        'Nota: ' || v_action.score || E'\n' ||
        'Observações: ' || COALESCE(v_action.observations, 'Nenhuma') || E'\n\n' ||
        'SLA definido: ' || v_effective_nc_days || ' dias (vencimento em ' || to_char(v_nc_due_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') || ').' || E'\n\n' ||
        'Favor providenciar correção até a data limite.',
        v_nc_due_date,
        v_audit_id,
        NOW()
      );
    END IF;
  END LOOP;

  -- 9. Registro de auditoria no log
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    v_user_id := v_assignee_id;
  END IF;

  IF v_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
      VALUES (
        v_client_id,
        v_user_id,
        'AUDIT_FINALIZED',
        'Auditoria ' || v_audit_title || ' finalizada. Score: ' || v_total_score::text || '/' || v_max_score::text
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'status', 'Finalizado', 
    'final_score', v_total_score, 
    'max_score', v_max_score
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_audit_execution(uuid, jsonb, text, boolean, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_audit_execution(uuid, jsonb, text, boolean, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_audit_execution(uuid, jsonb, text, boolean, jsonb) TO anon;
