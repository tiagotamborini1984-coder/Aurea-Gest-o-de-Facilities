-- Migration: 20261028200000_adjust_audit_and_nc_tasks_due_date_v3.sql
-- Objetivo: Extensão do ajuste de prazos das tarefas de auditoria e checklist (v3).
-- Abrange todas as tarefas dos tipos 'Auditoria' e 'Não Conformidade' (e com prefixos "Auditoria:", "Não Conformidade:", "NC:")
-- que estejam com due_date < NOW() ou que necessitem de recálculo com âncora no último chamado do ciclo.
-- 
-- Regra de vínculo estrito: Apenas tarefas derivadas de auditoria/checklist são elegíveis.
-- NCs avulsas ou sem vínculo com auditoria/checklist ficam de fora.
-- Regra permanente de segurança: Criação da tabela backup_tasks_due_date_20261028_v3 ANTES de qualquer UPDATE.
-- Âncora: MAX(created_at) do último chamado criado para o mesmo ciclo/auditoria/planta (fallback para o próprio created_at).
-- Fuso horário: America/Sao_Paulo (23:59:59 BRT), com piso mínimo em amanhã 23:59:59 BRT caso o resultado caia no passado/hoje.

-- 1. CRIAÇÃO DA TABELA DE BACKUP INTERNO (backup_tasks_due_date_20261028_v3)
CREATE TABLE IF NOT EXISTS public.backup_tasks_due_date_20261028_v3 (
  task_id UUID PRIMARY KEY,
  task_number TEXT,
  title TEXT,
  client_id UUID,
  plant_id UUID,
  type_id UUID,
  type_name TEXT,
  status_id UUID,
  status_name TEXT,
  original_due_date TIMESTAMPTZ,
  task_created_at TIMESTAMPTZ,
  audit_id UUID,
  audit_title TEXT,
  audit_frequency TEXT,
  audit_sla_days INT,
  parent_audit_id UUID,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.backup_tasks_due_date_20261028_v3 IS 
'Backup do estado de due_date das tarefas de auditoria/checklist e NCs vinculadas antes do ajuste v3 (2026-10-28)';

-- 2. RECÁLCULO E ATUALIZAÇÃO SEGURA E RESTRITIVA
DO $$
DECLARE
  v_count INT := 0;
  r RECORD;
  v_anchor_date_brt DATE;
  v_target_date_brt DATE;
  v_new_due_date TIMESTAMPTZ;
  v_min_due_date TIMESTAMPTZ;
  v_now_brt DATE;
BEGIN
  -- Data de "hoje" no fuso de São Paulo
  v_now_brt := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
  -- Piso mínimo: amanhã às 23:59:59 BRT
  v_min_due_date := ((v_now_brt + 1)::text || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';

  -- A. Pré-vincular de forma segura tarefas que porventura tenham audit_id nulo mas correspondam diretamente a uma auditoria
  WITH audit_matches AS (
    SELECT DISTINCT ON (t.id)
      t.id AS task_id,
      a.id AS matched_audit_id
    FROM public.tasks t
    JOIN public.audits a ON a.client_id = t.client_id
    WHERE t.audit_id IS NULL
      AND (
        (
          t.title ILIKE 'Auditoria:%'
          AND (
            lower(trim(substring(t.title from 'Auditoria:\s*(.*)'))) = lower(trim(a.title))
            OR lower(trim(a.title)) ILIKE '%' || lower(trim(substring(t.title from 'Auditoria:\s*(.*)'))) || '%'
            OR lower(trim(substring(t.title from 'Auditoria:\s*(.*)'))) ILIKE '%' || lower(trim(a.title)) || '%'
          )
        )
        OR (
          (t.title ILIKE 'Não Conformidade:%' OR t.title ILIKE 'NC:%')
          AND t.description ILIKE '%' || a.title || '%'
        )
      )
    ORDER BY t.id, a.created_at DESC
  )
  UPDATE public.tasks t
  SET audit_id = am.matched_audit_id
  FROM audit_matches am
  WHERE t.id = am.task_id
    AND t.audit_id IS NULL;

  -- B. Identificar a população elegível:
  -- Tarefas ABERTAS (status não-terminal),
  -- com due_date < NOW() OU com due_date nula ou que nasceram vencidas,
  -- pertencentes ao módulo de auditoria/checklist (tipo 'Auditoria' ou 'Não Conformidade' COM vínculo de auditoria),
  -- ou que ainda estejam fora da população da v2 com prazo inconsistente.
  
  -- Preencher a tabela de backup para TODAS as linhas da população antes do UPDATE
  INSERT INTO public.backup_tasks_due_date_20261028_v3 (
    task_id,
    task_number,
    title,
    client_id,
    plant_id,
    type_id,
    type_name,
    status_id,
    status_name,
    original_due_date,
    task_created_at,
    audit_id,
    audit_title,
    audit_frequency,
    audit_sla_days,
    parent_audit_id,
    backed_up_at
  )
  SELECT 
    t.id AS task_id,
    t.task_number,
    t.title,
    t.client_id,
    t.plant_id,
    t.type_id,
    tt.name AS type_name,
    t.status_id,
    ts.name AS status_name,
    t.due_date AS original_due_date,
    t.created_at AS task_created_at,
    t.audit_id,
    a.title AS audit_title,
    a.frequency AS audit_frequency,
    a.sla_days AS audit_sla_days,
    a.parent_audit_id,
    NOW() AS backed_up_at
  FROM public.tasks t
  JOIN public.task_statuses ts ON ts.id = t.status_id
  LEFT JOIN public.task_types tt ON tt.id = t.type_id
  JOIN public.audits a ON a.id = t.audit_id
  WHERE ts.is_terminal = false
    AND (
      t.due_date IS NULL
      OR t.due_date < NOW()
      OR (t.due_date < t.created_at)
    )
    AND (
      tt.name IN ('Auditoria', 'Não Conformidade')
      OR t.title ILIKE 'Auditoria:%'
      OR t.title ILIKE 'NC:%'
      OR t.title ILIKE 'Não Conformidade:%'
    )
  ON CONFLICT (task_id) DO NOTHING;

  -- C. Iterar sobre os registros elegíveis e aplicar o recálculo conforme a regra da v2
  FOR r IN (
    WITH eligible_tasks AS (
      SELECT 
        t.id AS target_task_id,
        t.task_number,
        t.title,
        t.due_date AS old_due_date,
        t.created_at AS task_created_at,
        t.plant_id,
        a.id AS audit_id,
        a.title AS audit_title,
        a.frequency,
        a.sla_days,
        a.parent_audit_id,
        COALESCE(
          -- Tentativa 1: chamado mais recente em toda a árvore da auditoria (parent + children) na mesma planta
          (
            SELECT MAX(t_other.created_at)
            FROM public.tasks t_other
            JOIN public.audits a_other ON a_other.id = t_other.audit_id
            WHERE (
              a_other.parent_audit_id = COALESCE(a.parent_audit_id, a.id)
              OR a_other.id = COALESCE(a.parent_audit_id, a.id)
            )
            AND (t_other.plant_id = t.plant_id OR t.plant_id IS NULL)
          ),
          -- Tentativa 2: chamado mais recente vinculado à mesma auditoria
          (
            SELECT MAX(t_same.created_at)
            FROM public.tasks t_same
            WHERE t_same.audit_id = t.audit_id
          ),
          -- Fallback: data de criação da própria tarefa
          t.created_at
        ) AS anchor_created_at
      FROM public.tasks t
      JOIN public.task_statuses ts ON ts.id = t.status_id
      LEFT JOIN public.task_types tt ON tt.id = t.type_id
      JOIN public.audits a ON a.id = t.audit_id
      WHERE ts.is_terminal = false
        AND (
          t.due_date IS NULL
          OR t.due_date < NOW()
          OR (t.due_date < t.created_at)
        )
        AND (
          tt.name IN ('Auditoria', 'Não Conformidade')
          OR t.title ILIKE 'Auditoria:%'
          OR t.title ILIKE 'NC:%'
          OR t.title ILIKE 'Não Conformidade:%'
        )
    )
    SELECT * FROM eligible_tasks
  ) LOOP
    -- Data de criação do último chamado convertida para data civil em São Paulo
    v_anchor_date_brt := (r.anchor_created_at AT TIME ZONE 'America/Sao_Paulo')::date;

    -- Soma da frequência / SLA configurado
    IF r.sla_days IS NOT NULL AND r.sla_days > 0 THEN
      v_target_date_brt := v_anchor_date_brt + (r.sla_days::int);
    ELSIF r.frequency = 'Diária' THEN
      v_target_date_brt := v_anchor_date_brt + 1;
    ELSIF r.frequency = 'Semanal' THEN
      v_target_date_brt := v_anchor_date_brt + 7;
    ELSIF r.frequency = 'Quinzenal' THEN
      v_target_date_brt := v_anchor_date_brt + 15;
    ELSIF r.frequency = 'Mensal' THEN
      v_target_date_brt := v_anchor_date_brt + 30;
    ELSIF r.frequency = 'Bimestral' THEN
      v_target_date_brt := v_anchor_date_brt + 60;
    ELSIF r.frequency = 'Trimestral' THEN
      v_target_date_brt := v_anchor_date_brt + 90;
    ELSIF r.frequency = 'Semestral' THEN
      v_target_date_brt := v_anchor_date_brt + 180;
    ELSIF r.frequency = 'Anual' THEN
      v_target_date_brt := v_anchor_date_brt + 365;
    ELSE
      v_target_date_brt := v_anchor_date_brt + 1;
    END IF;

    -- Transforma em 23:59:59 America/Sao_Paulo
    v_new_due_date := (v_target_date_brt::text || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';

    -- Se o prazo resultante cair no passado ou for menor que amanhã 23:59:59 BRT, fixa no mínimo amanhã 23:59:59 BRT
    IF v_new_due_date < v_min_due_date THEN
      v_new_due_date := v_min_due_date;
    END IF;

    -- UPDATE restritivo apenas na linha da tarefa
    UPDATE public.tasks
    SET due_date = v_new_due_date
    WHERE id = r.target_task_id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Ajuste v3 concluído com sucesso. Total de tarefas de auditoria/checklist atualizadas: %', v_count;
END $$;
