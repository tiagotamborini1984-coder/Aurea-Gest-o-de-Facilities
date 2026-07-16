-- 1. Clean up duplicate audit_executions where one has zero/null score and another has valid score for same task_id
DO $$
DECLARE
  v_dup_id uuid;
BEGIN
  FOR v_dup_id IN
    SELECT ae.id
    FROM public.audit_executions ae
    WHERE ae.task_id IS NOT NULL
      AND (ae.final_score IS NULL OR ae.final_score = 0)
      AND EXISTS (
        SELECT 1 FROM public.audit_executions ae2
        WHERE ae2.task_id = ae.task_id
          AND ae2.id != ae.id
          AND ae2.final_score IS NOT NULL
          AND ae2.final_score > 0
      )
  LOOP
    DELETE FROM public.audit_execution_answers WHERE execution_id = v_dup_id;
    DELETE FROM public.audit_executions WHERE id = v_dup_id;
  END LOOP;
END $$;

-- 2. For remaining duplicates by task_id, keep only the best record (non-zero score, then most recent)
DO $$
DECLARE
  v_dup_id uuid;
BEGIN
  FOR v_dup_id IN
    SELECT ae.id
    FROM public.audit_executions ae
    WHERE ae.task_id IS NOT NULL
      AND ae.id NOT IN (
        SELECT DISTINCT ON (task_id) id
        FROM public.audit_executions
        WHERE task_id IS NOT NULL
        ORDER BY task_id,
          (final_score IS NOT NULL AND final_score > 0) DESC,
          realization_date DESC NULLS LAST,
          created_at DESC
      )
  LOOP
    DELETE FROM public.audit_execution_answers WHERE execution_id = v_dup_id;
    DELETE FROM public.audit_executions WHERE id = v_dup_id;
  END LOOP;
END $$;

-- 3. Create partial unique index on task_id to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS audit_executions_task_id_unique_idx
  ON public.audit_executions (task_id)
  WHERE task_id IS NOT NULL;

-- 4. Update submit_audit_execution: handle evidence_urls, use consistent 'Finalizado' status, ON CONFLICT safety
CREATE OR REPLACE FUNCTION public.submit_audit_execution(
  p_execution_id uuid,
  p_answers jsonb,
  p_participants text,
  p_is_draft boolean DEFAULT false,
  p_signatures jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_audit_id uuid;
  v_task_id uuid;
  v_client_id uuid;
  v_terminal_status_id uuid;
  v_total_score numeric := 0;
  v_max_score numeric := 0;
  v_answer jsonb;
  v_action_id uuid;
  v_score numeric;
  v_weight numeric;
  v_evidence text;
  v_evidence_urls jsonb;
  v_obs text;
  v_corrective_assignee uuid;
  v_corrective_due date;
  v_max_possible_score numeric := 0;
  v_new_status text;
  v_user_id uuid;
BEGIN
  SELECT audit_id, task_id INTO v_audit_id, v_task_id
  FROM public.audit_executions
  WHERE id = p_execution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Execution not found';
  END IF;

  SELECT client_id INTO v_client_id
  FROM public.audits
  WHERE id = v_audit_id;

  DELETE FROM public.audit_execution_answers WHERE execution_id = p_execution_id;

  SELECT COALESCE(MAX((s->>'score')::numeric), 5) INTO v_max_possible_score
  FROM public.audits a
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE jsonb_typeof(a.scoring_settings)
      WHEN 'array' THEN a.scoring_settings
      ELSE '[]'::jsonb
    END
  ) s ON true
  WHERE a.id = v_audit_id;

  SELECT COALESCE(SUM(weight * v_max_possible_score), 0) INTO v_max_score
  FROM public.audit_actions
  WHERE audit_id = v_audit_id;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    IF v_answer ? 'value' THEN
      v_answer := v_answer->'value';
    END IF;

    v_action_id := (v_answer->>'action_id')::uuid;
    v_score := (v_answer->>'score')::numeric;
    v_evidence := v_answer->>'evidence_url';
    v_evidence_urls := COALESCE(v_answer->'evidence_urls', '[]'::jsonb);
    v_obs := v_answer->>'observations';

    BEGIN
      v_corrective_assignee := (v_answer->>'corrective_assignee_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_corrective_assignee := NULL;
    END;

    BEGIN
      v_corrective_due := (v_answer->>'corrective_due_date')::date;
    EXCEPTION WHEN OTHERS THEN
      v_corrective_due := NULL;
    END;

    SELECT weight INTO v_weight FROM public.audit_actions WHERE id = v_action_id;
    IF v_weight IS NULL THEN v_weight := 1; END IF;

    IF v_score IS NOT NULL THEN
      v_total_score := v_total_score + (v_score * v_weight);
    END IF;

    IF v_action_id IS NOT NULL THEN
      INSERT INTO public.audit_execution_answers (
        execution_id, action_id, score, evidence_url, evidence_urls,
        observations, corrective_assignee_id, corrective_due_date
      ) VALUES (
        p_execution_id, v_action_id, v_score, v_evidence, v_evidence_urls,
        v_obs, v_corrective_assignee, v_corrective_due
      )
      ON CONFLICT (execution_id, action_id) DO UPDATE SET
        score = EXCLUDED.score,
        evidence_url = EXCLUDED.evidence_url,
        evidence_urls = EXCLUDED.evidence_urls,
        observations = EXCLUDED.observations,
        corrective_assignee_id = EXCLUDED.corrective_assignee_id,
        corrective_due_date = EXCLUDED.corrective_due_date;
    END IF;
  END LOOP;

  v_new_status := CASE WHEN p_is_draft THEN 'Em Andamento' ELSE 'Finalizado' END;

  UPDATE public.audit_executions
  SET
    status = v_new_status,
    participants = p_participants,
    signatures = p_signatures,
    final_score = v_total_score,
    max_score = CASE WHEN v_max_score > 0 THEN v_max_score ELSE 1 END,
    realization_date = CASE WHEN NOT p_is_draft THEN COALESCE(realization_date, CURRENT_DATE) ELSE realization_date END
  WHERE id = p_execution_id;

  IF NOT p_is_draft AND v_task_id IS NOT NULL THEN
    SELECT id INTO v_terminal_status_id
    FROM public.task_statuses
    WHERE client_id = v_client_id AND is_terminal = true
    ORDER BY created_at ASC LIMIT 1;

    IF v_terminal_status_id IS NOT NULL THEN
      UPDATE public.tasks
      SET status_id = v_terminal_status_id,
          closed_at = COALESCE(closed_at, NOW())
      WHERE id = v_task_id;
    END IF;
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users
    WHERE id IN (SELECT id FROM public.profiles WHERE client_id = v_client_id LIMIT 1)
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
    VALUES (
      v_client_id,
      v_user_id,
      CASE WHEN p_is_draft THEN 'AUDIT_SAVED_DRAFT' ELSE 'AUDIT_FINALIZED' END,
      'Auditoria ' || p_execution_id::text || ' ' || CASE WHEN p_is_draft THEN 'salva como rascunho' ELSE 'finalizada' END || '. Score: ' || v_total_score::text || '/' || v_max_score::text
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'final_score', v_total_score, 'max_score', v_max_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update handle_audit_execution_finalized to check both 'Finalizado' and 'Finalizada', add ON CONFLICT safety
CREATE OR REPLACE FUNCTION public.handle_audit_execution_finalized()
RETURNS trigger AS $$
DECLARE
  v_audit RECORD;
  v_type_id UUID;
  v_status_id UUID;
  v_requester_id UUID;
  v_next_date DATE;
  v_target_date TIMESTAMPTZ;
  v_existing_task_id UUID;
  v_open_status_ids UUID[];
BEGIN
  IF NEW.status IN ('Finalizado', 'Finalizada')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('Finalizado', 'Finalizada')) THEN
    SELECT * INTO v_audit FROM public.audits WHERE id = NEW.audit_id;

    IF v_audit.frequency != 'Única' THEN
      v_next_date := COALESCE(NEW.realization_date, NEW.created_at::date);

      CASE v_audit.frequency
        WHEN 'Diária' THEN v_next_date := v_next_date + INTERVAL '1 day';
        WHEN 'Semanal' THEN v_next_date := v_next_date + INTERVAL '1 week';
        WHEN 'Quinzenal' THEN v_next_date := v_next_date + INTERVAL '15 days';
        WHEN 'Mensal' THEN v_next_date := v_next_date + INTERVAL '1 month';
        WHEN 'Bimestral' THEN v_next_date := v_next_date + INTERVAL '2 months';
        WHEN 'Trimestral' THEN v_next_date := v_next_date + INTERVAL '3 months';
        WHEN 'Semestral' THEN v_next_date := v_next_date + INTERVAL '6 months';
        WHEN 'Anual' THEN v_next_date := v_next_date + INTERVAL '1 year';
        ELSE v_next_date := v_next_date;
      END CASE;

      WHILE v_next_date < CURRENT_DATE LOOP
        CASE v_audit.frequency
          WHEN 'Diária' THEN v_next_date := v_next_date + INTERVAL '1 day';
          WHEN 'Semanal' THEN v_next_date := v_next_date + INTERVAL '1 week';
          WHEN 'Quinzenal' THEN v_next_date := v_next_date + INTERVAL '15 days';
          WHEN 'Mensal' THEN v_next_date := v_next_date + INTERVAL '1 month';
          WHEN 'Bimestral' THEN v_next_date := v_next_date + INTERVAL '2 months';
          WHEN 'Trimestral' THEN v_next_date := v_next_date + INTERVAL '3 months';
          WHEN 'Semestral' THEN v_next_date := v_next_date + INTERVAL '6 months';
          WHEN 'Anual' THEN v_next_date := v_next_date + INTERVAL '1 year';
          ELSE EXIT;
        END CASE;
      END LOOP;

      v_target_date := v_next_date;

      IF NOT EXISTS (
        SELECT 1 FROM public.audit_executions
        WHERE audit_id = NEW.audit_id
          AND plant_id = NEW.plant_id
          AND status = 'Pendente'
      ) THEN
        SELECT id INTO v_type_id FROM public.task_types
        WHERE client_id = v_audit.client_id AND name ILIKE '%Auditoria%' LIMIT 1;

        IF v_type_id IS NULL THEN
          SELECT id INTO v_type_id FROM public.task_types
          WHERE client_id = v_audit.client_id ORDER BY created_at ASC LIMIT 1;
        END IF;

        SELECT id INTO v_status_id FROM public.task_statuses
        WHERE client_id = v_audit.client_id AND is_terminal = false ORDER BY created_at ASC LIMIT 1;

        SELECT array_agg(id) INTO v_open_status_ids
        FROM public.task_statuses
        WHERE client_id = v_audit.client_id AND is_terminal = false;

        IF v_type_id IS NOT NULL AND v_status_id IS NOT NULL THEN
          v_requester_id := NEW.assignee_id;

          SELECT id INTO v_existing_task_id FROM public.tasks
          WHERE client_id = v_audit.client_id
            AND plant_id = NEW.plant_id
            AND type_id = v_type_id
            AND title = 'Auditoria: ' || v_audit.title
            AND status_id = ANY(COALESCE(v_open_status_ids, ARRAY[]::uuid[]))
          ORDER BY created_at DESC
          LIMIT 1;

          IF v_existing_task_id IS NOT NULL THEN
            INSERT INTO public.audit_executions (
              audit_id, task_id, assignee_id, plant_id, status
            )
            SELECT NEW.audit_id, v_existing_task_id, NEW.assignee_id, NEW.plant_id, 'Pendente'
            WHERE NOT EXISTS (
              SELECT 1 FROM public.audit_executions
              WHERE audit_id = NEW.audit_id AND plant_id = NEW.plant_id AND status = 'Pendente'
            )
            ON CONFLICT DO NOTHING;
          ELSE
            WITH inserted_task AS (
              INSERT INTO public.tasks (
                client_id, plant_id, type_id, status_id, requester_id, assignee_id,
                task_number, title, description, due_date, status_updated_at
              ) VALUES (
                v_audit.client_id, NEW.plant_id, v_type_id, v_status_id, v_requester_id, NEW.assignee_id,
                'GERANDO...', 'Auditoria: ' || v_audit.title,
                'Por favor, realize a auditoria "' || v_audit.title || '" agendada para ' || to_char(v_next_date, 'DD/MM/YYYY') || '. Acesse os detalhes da tarefa para preencher o checklist.',
                v_target_date, CURRENT_TIMESTAMP
              ) RETURNING id
            )
            INSERT INTO public.audit_executions (
              audit_id, task_id, assignee_id, plant_id, status
            )
            SELECT NEW.audit_id, id, NEW.assignee_id, NEW.plant_id, 'Pendente'
            FROM inserted_task
            ON CONFLICT DO NOTHING;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
