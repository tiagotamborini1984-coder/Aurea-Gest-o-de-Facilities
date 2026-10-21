-- Migration: 20261021110000_rebuild_audits_from_tasks.sql
-- Reconstrução parcial e honesta dos modelos, execuções e não-conformidades de auditoria
-- Marcador: 'rebuild_20261020' para permitir auditoria/reversão se necessário.

-- 1. Colunas de marcador de lote de reconstrução
ALTER TABLE public.audits 
  ADD COLUMN IF NOT EXISTS reconstruction_batch TEXT;

ALTER TABLE public.audit_executions 
  ADD COLUMN IF NOT EXISTS reconstruction_batch TEXT;

DO $$
DECLARE
  v_client_id UUID;
  v_fs_client_id UUID := '00bb5b84-1e10-414f-9c74-88b1b0ff257c'::uuid;
  v_audit_type_id UUID;
  v_nc_type_id UUID;
  v_limpeza_cat UUID;
  v_organizacao_cat UUID;
  v_seguranca_cat UUID;
  v_estrutura_cat UUID;
  v_processos_cat UUID;
  v_treinamento_cat UUID;
  
  rec_title RECORD;
  rec_task RECORD;
  rec_nc RECORD;
  
  v_audit_id UUID;
  v_exec_id UUID;
  v_action_id UUID;
  v_category_id UUID;
  v_clean_title TEXT;
  v_action_title TEXT;
  v_score INT;
  v_obs TEXT;
  v_participants TEXT;
  v_is_term BOOLEAN;
BEGIN
  -- Desativar triggers colaterais temporariamente para permitir reconstrução exata sem recalcular scores errôneos
  ALTER TABLE public.tasks DISABLE TRIGGER set_task_audit_id_if_missing_trigger;
  ALTER TABLE public.tasks DISABLE TRIGGER sync_audit_execution_status_trigger;
  ALTER TABLE public.audit_executions DISABLE TRIGGER trigger_calculate_audit_execution_score;
  ALTER TABLE public.audit_executions DISABLE TRIGGER ensure_task_audit_id_trigger;
  ALTER TABLE public.audit_executions DISABLE TRIGGER on_audit_execution_finalized;

  -- Obter client_id dominante
  SELECT id INTO v_client_id FROM public.clients WHERE id = v_fs_client_id;
  IF v_client_id IS NULL THEN
    SELECT id INTO v_client_id FROM public.clients LIMIT 1;
  END IF;

  -- Obter tipos de tarefa
  SELECT id INTO v_audit_type_id FROM public.task_types WHERE name = 'Auditoria' LIMIT 1;
  SELECT id INTO v_nc_type_id FROM public.task_types WHERE name = 'Não Conformidade' LIMIT 1;

  -- Mapear IDs de categorias para v_client_id
  SELECT id INTO v_limpeza_cat FROM public.audit_question_categories 
    WHERE client_id = v_client_id AND LOWER(TRIM(name)) = 'limpeza e higiene' LIMIT 1;
  SELECT id INTO v_organizacao_cat FROM public.audit_question_categories 
    WHERE client_id = v_client_id AND LOWER(TRIM(name)) = 'organização e armazenamento' LIMIT 1;
  SELECT id INTO v_seguranca_cat FROM public.audit_question_categories 
    WHERE client_id = v_client_id AND LOWER(TRIM(name)) = 'segurança e epis' LIMIT 1;
  SELECT id INTO v_estrutura_cat FROM public.audit_question_categories 
    WHERE client_id = v_client_id AND LOWER(TRIM(name)) = 'estrutura e conservação' LIMIT 1;
  SELECT id INTO v_processos_cat FROM public.audit_question_categories 
    WHERE client_id = v_client_id AND LOWER(TRIM(name)) = 'processos e documentação' LIMIT 1;
  SELECT id INTO v_treinamento_cat FROM public.audit_question_categories 
    WHERE client_id = v_client_id AND LOWER(TRIM(name)) = 'treinamento' LIMIT 1;

  -- =========================================================================
  -- 2. RECONSTRUIR MODELOS (public.audits)
  -- =========================================================================
  CREATE TEMP TABLE tmp_audit_titles (
    clean_title TEXT PRIMARY KEY,
    audit_id UUID
  ) ON COMMIT DROP;

  -- Títulos das tarefas de Auditoria
  INSERT INTO tmp_audit_titles (clean_title)
  SELECT DISTINCT TRIM(regexp_replace(t.title, '^(?:Auditoria:\s*|Auditoria\s*-\s*)', ''))
  FROM public.tasks t
  WHERE t.type_id = v_audit_type_id
    AND t.title IS NOT NULL
    AND TRIM(regexp_replace(t.title, '^(?:Auditoria:\s*|Auditoria\s*-\s*)', '')) <> ''
  ON CONFLICT (clean_title) DO NOTHING;

  -- Títulos das tarefas de Não Conformidade (mencionados na descrição)
  INSERT INTO tmp_audit_titles (clean_title)
  SELECT DISTINCT TRIM((regexp_match(t.description, 'durante a auditoria ["'']([^"'']+)["'']'))[1])
  FROM public.tasks t
  WHERE t.type_id = v_nc_type_id
    AND (regexp_match(t.description, 'durante a auditoria ["'']([^"'']+)["'']'))[1] IS NOT NULL
    AND TRIM((regexp_match(t.description, 'durante a auditoria ["'']([^"'']+)["'']'))[1]) <> ''
  ON CONFLICT (clean_title) DO NOTHING;

  -- Inserir / Recuperar modelos em public.audits
  FOR rec_title IN SELECT clean_title FROM tmp_audit_titles LOOP
    SELECT id INTO v_audit_id 
    FROM public.audits 
    WHERE client_id = v_client_id AND TRIM(title) = rec_title.clean_title 
    LIMIT 1;

    IF v_audit_id IS NULL THEN
      v_audit_id := gen_random_uuid();
      INSERT INTO public.audits (
        id,
        client_id,
        title,
        type,
        frequency,
        start_date,
        status,
        reconstruction_batch,
        created_at
      ) VALUES (
        v_audit_id,
        v_client_id,
        rec_title.clean_title,
        'Geral',
        'Única',
        CURRENT_DATE,
        'Ativo',
        'rebuild_20261020',
        NOW()
      );
    END IF;

    UPDATE tmp_audit_titles 
    SET audit_id = v_audit_id 
    WHERE clean_title = rec_title.clean_title;
  END LOOP;

  -- =========================================================================
  -- 3. RECONSTRUIR EXECUÇÕES A PARTIR DAS TASKS DE AUDITORIA (165 TASKS)
  -- =========================================================================
  FOR rec_task IN 
    SELECT 
      t.id AS task_id,
      t.plant_id,
      t.assignee_id,
      t.requester_id,
      t.created_at,
      t.closed_at,
      t.participants_ids,
      ts.is_terminal,
      TRIM(regexp_replace(t.title, '^(?:Auditoria:\s*|Auditoria\s*-\s*)', '')) AS clean_title
    FROM public.tasks t
    LEFT JOIN public.task_statuses ts ON ts.id = t.status_id
    WHERE t.type_id = v_audit_type_id
  LOOP
    SELECT audit_id INTO v_audit_id 
    FROM tmp_audit_titles 
    WHERE clean_title = rec_task.clean_title;

    IF v_audit_id IS NOT NULL THEN
      -- Resolver nomes de participantes se houver
      v_participants := NULL;
      IF rec_task.participants_ids IS NOT NULL AND cardinality(rec_task.participants_ids) > 0 THEN
        SELECT string_agg(COALESCE(name::text, 'Colaborador'), ', ')
        INTO v_participants
        FROM public.profiles
        WHERE id = ANY(rec_task.participants_ids);
      END IF;

      -- Verificar se já existe execução para essa task_id
      SELECT id INTO v_exec_id 
      FROM public.audit_executions 
      WHERE task_id = rec_task.task_id 
      LIMIT 1;

      IF v_exec_id IS NULL THEN
        INSERT INTO public.audit_executions (
          id,
          audit_id,
          task_id,
          assignee_id,
          plant_id,
          status,
          realization_date,
          participants,
          final_score,
          max_score,
          created_at,
          reconstruction_batch
        ) VALUES (
          gen_random_uuid(),
          v_audit_id,
          rec_task.task_id,
          rec_task.assignee_id,
          rec_task.plant_id,
          CASE WHEN rec_task.is_terminal = true THEN 'Finalizada' ELSE 'Pendente' END,
          CASE WHEN rec_task.is_terminal = true THEN COALESCE(rec_task.closed_at::date, rec_task.created_at::date) ELSE NULL END,
          v_participants,
          NULL,
          NULL,
          rec_task.created_at,
          'rebuild_20261020'
        );
      ELSE
        UPDATE public.audit_executions
        SET audit_id = v_audit_id,
            reconstruction_batch = COALESCE(reconstruction_batch, 'rebuild_20261020')
        WHERE id = v_exec_id;
      END IF;

      -- Religar tasks.audit_id
      UPDATE public.tasks 
      SET audit_id = v_audit_id 
      WHERE id = rec_task.task_id AND audit_id IS NULL;
    END IF;
  END LOOP;

  -- =========================================================================
  -- 4. RECONSTRUIR PERGUNTAS E RESPOSTAS DAS NÃO CONFORMIDADES (300 TASKS)
  -- =========================================================================
  FOR rec_nc IN
    SELECT 
      t.id AS nc_task_id,
      t.task_number,
      t.plant_id,
      t.assignee_id,
      t.requester_id,
      t.created_at,
      t.closed_at,
      t.due_date,
      t.title,
      t.description,
      TRIM((regexp_match(t.description, 'durante a auditoria ["'']([^"'']+)["'']'))[1]) AS audit_name,
      COALESCE(
        NULLIF(TRIM((regexp_match(t.description, 'Ação Avaliada:\s*([^\r\n]+)'))[1]), ''),
        TRIM(regexp_replace(t.title, '^Não Conformidade:\s*', ''))
      ) AS parsed_action_title,
      (regexp_match(t.description, 'Nota:\s*(\d+)'))[1]::int AS parsed_score,
      TRIM((regexp_match(t.description, 'Observações:\s*(.+?)(?:\r?\n\r?\nFavor|\s*Favor providenciar|$)', 's'))[1]) AS parsed_obs
    FROM public.tasks t
    WHERE t.type_id = v_nc_type_id
  LOOP
    -- 4.1 Achar modelo de auditoria
    SELECT audit_id INTO v_audit_id 
    FROM tmp_audit_titles 
    WHERE clean_title = rec_nc.audit_name;

    IF v_audit_id IS NULL THEN
      -- Se não encontrou por matching exato, tentar buscar em public.audits
      SELECT id INTO v_audit_id 
      FROM public.audits 
      WHERE client_id = v_client_id AND TRIM(title) = rec_nc.audit_name 
      LIMIT 1;
    END IF;

    -- Se ainda assim não existir modelo, criar
    IF v_audit_id IS NULL AND rec_nc.audit_name IS NOT NULL AND rec_nc.audit_name <> '' THEN
      v_audit_id := gen_random_uuid();
      INSERT INTO public.audits (
        id, client_id, title, type, frequency, start_date, status, reconstruction_batch, created_at
      ) VALUES (
        v_audit_id, v_client_id, rec_nc.audit_name, 'Geral', 'Única', CURRENT_DATE, 'Ativo', 'rebuild_20261020', rec_nc.created_at
      );
    END IF;

    IF v_audit_id IS NOT NULL THEN
      -- Religar tasks.audit_id da NC
      UPDATE public.tasks 
      SET audit_id = v_audit_id 
      WHERE id = rec_nc.nc_task_id AND audit_id IS NULL;

      -- 4.2 Inferir Categoria da Pergunta
      v_category_id := NULL;
      v_action_title := rec_nc.parsed_action_title;
      IF v_action_title IS NULL OR v_action_title = '' THEN
        v_action_title := 'Item Não Conforme ' || rec_nc.task_number;
      END IF;

      IF v_processos_cat IS NOT NULL AND (
        v_action_title ILIKE 'DO - %' OR v_action_title ILIKE 'DOCUMENTAÇÃO - %' 
        OR v_action_title ILIKE 'ADM - %' OR v_action_title ILIKE 'RDC 216/04%' OR v_action_title ILIKE 'POP - %'
      ) THEN
        v_category_id := v_processos_cat;
      ELSIF v_limpeza_cat IS NOT NULL AND (
        v_action_title ILIKE 'BANHEIROS - %' OR v_action_title ILIKE 'LAVANDERIA - %' 
        OR v_action_title ILIKE 'CONTAINER LIMP%' OR v_action_title ILIKE '%HIGIEN%' OR v_action_title ILIKE '%LIMPEZ%'
      ) THEN
        v_category_id := v_limpeza_cat;
      ELSIF v_seguranca_cat IS NOT NULL AND (
        v_action_title ILIKE '%EPI%' OR v_action_title ILIKE '%SEGURANÇA%' 
        OR v_action_title ILIKE '%EXTINTOR%' OR v_action_title ILIKE '%PROTEÇÃO%'
      ) THEN
        v_category_id := v_seguranca_cat;
      ELSIF v_organizacao_cat IS NOT NULL AND (
        v_action_title ILIKE 'ALMOX - %' OR v_action_title ILIKE 'DEPÓSITO%' 
        OR v_action_title ILIKE 'TRIAGEM - %' OR v_action_title ILIKE '%ARMAZEN%' OR v_action_title ILIKE '%ROUPEIRO%'
      ) THEN
        v_category_id := v_organizacao_cat;
      ELSIF v_treinamento_cat IS NOT NULL AND (
        v_action_title ILIKE '%TREINAMENTO%' OR v_action_title ILIKE '%CAPACITAÇÃO%'
      ) THEN
        v_category_id := v_treinamento_cat;
      ELSIF v_estrutura_cat IS NOT NULL AND (
        v_action_title ILIKE 'COZINHA - %' OR v_action_title ILIKE 'SALA - %' OR v_action_title ILIKE 'QUARTOS - %'
        OR v_action_title ILIKE 'VARANDA%' OR v_action_title ILIKE 'INSTALAÇÕES - %' OR v_action_title ILIKE '%JARDINAGEM%'
        OR v_action_title ILIKE 'CONFORTO - %' OR v_action_title ILIKE 'VESTIÁRIO - %' OR v_action_title ILIKE 'MANUTENÇÃO - %'
        OR v_action_title ILIKE 'CONTAINER MANUTENÇÃO - %' OR v_action_title ILIKE 'PORTARIA - %' OR v_action_title ILIKE 'LOJA - %'
        OR v_action_title ILIKE 'CDE - %' OR v_action_title ILIKE 'COI %' OR v_action_title ILIKE 'ÁREA DE TERCEIROS - %'
      ) THEN
        v_category_id := v_estrutura_cat;
      END IF;

      -- 4.3 Criar ou Obter a Ação/Pergunta no Modelo
      SELECT id INTO v_action_id 
      FROM public.audit_actions 
      WHERE audit_id = v_audit_id AND TRIM(title) = TRIM(v_action_title)
      LIMIT 1;

      IF v_action_id IS NULL THEN
        v_action_id := gen_random_uuid();
        INSERT INTO public.audit_actions (
          id,
          audit_id,
          title,
          category_id,
          weight,
          evidence_required,
          comments_required,
          order_index,
          created_at
        ) VALUES (
          v_action_id,
          v_audit_id,
          TRIM(v_action_title),
          v_category_id,
          1,
          false,
          false,
          0,
          rec_nc.created_at
        );
      ELSE
        IF v_category_id IS NOT NULL THEN
          UPDATE public.audit_actions 
          SET category_id = v_category_id 
          WHERE id = v_action_id AND category_id IS NULL;
        END IF;
      END IF;

      -- 4.4 Localizar Execução Compatível ou Criar Sintética
      -- Prioriza execução de tarefa 'Auditoria' do mesmo modelo, planta e janela de até 3 dias
      SELECT ae.id INTO v_exec_id
      FROM public.audit_executions ae
      WHERE ae.audit_id = v_audit_id
        AND ae.plant_id = rec_nc.plant_id
        AND abs(extract(epoch from (ae.created_at - rec_nc.created_at))) < 86400 * 3
      ORDER BY abs(extract(epoch from (ae.created_at - rec_nc.created_at))) ASC
      LIMIT 1;

      -- Se não houver execução compatível, cria execução sintética finalizada
      IF v_exec_id IS NULL THEN
        v_exec_id := gen_random_uuid();
        INSERT INTO public.audit_executions (
          id,
          audit_id,
          task_id,
          assignee_id,
          plant_id,
          status,
          realization_date,
          participants,
          final_score,
          max_score,
          created_at,
          reconstruction_batch
        ) VALUES (
          v_exec_id,
          v_audit_id,
          NULL,
          rec_nc.requester_id, -- Auditor que identificou
          rec_nc.plant_id,
          'Finalizada',
          COALESCE(rec_nc.closed_at::date, rec_nc.created_at::date),
          NULL,
          NULL,
          NULL,
          rec_nc.created_at,
          'rebuild_20261020'
        );
      END IF;

      -- 4.5 Inserir Resposta Não Conforme (audit_execution_answers)
      v_score := COALESCE(rec_nc.parsed_score, 3);
      v_obs := COALESCE(rec_nc.parsed_obs, 'Não conformidade originada da OS ' || rec_nc.task_number);

      INSERT INTO public.audit_execution_answers (
        id,
        execution_id,
        action_id,
        score,
        observations,
        corrective_assignee_id,
        corrective_due_date,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_exec_id,
        v_action_id,
        v_score,
        v_obs,
        rec_nc.assignee_id,
        rec_nc.due_date,
        rec_nc.created_at
      )
      ON CONFLICT (execution_id, action_id) DO UPDATE
      SET score = EXCLUDED.score,
          observations = EXCLUDED.observations,
          corrective_assignee_id = COALESCE(public.audit_execution_answers.corrective_assignee_id, EXCLUDED.corrective_assignee_id),
          corrective_due_date = COALESCE(public.audit_execution_answers.corrective_due_date, EXCLUDED.corrective_due_date);

    END IF;
  END LOOP;

  -- Reativar triggers
  ALTER TABLE public.tasks ENABLE TRIGGER set_task_audit_id_if_missing_trigger;
  ALTER TABLE public.tasks ENABLE TRIGGER sync_audit_execution_status_trigger;
  ALTER TABLE public.audit_executions ENABLE TRIGGER trigger_calculate_audit_execution_score;
  ALTER TABLE public.audit_executions ENABLE TRIGGER ensure_task_audit_id_trigger;
  ALTER TABLE public.audit_executions ENABLE TRIGGER on_audit_execution_finalized;

END $$;
