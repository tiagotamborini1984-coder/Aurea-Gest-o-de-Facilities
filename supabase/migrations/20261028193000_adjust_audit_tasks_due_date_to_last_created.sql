-- Migration: 20261028193000_adjust_audit_tasks_due_date_to_last_created.sql
-- Objetivo: Ajustar prazos (due_date) das tarefas de auditoria/checklist ABERTAS no Painel de Chamados.
-- Conforme solicitação do usuário: "mas os que já estão abertos eu gostaria que ajustasse ao SLA pela data do último que foi criado".
-- Âncora: Data de criação (created_at) do chamado mais recente criado para aquele ciclo/auditoria/planta, somado ao SLA/frequência configurada.
-- Fuso horário: America/Sao_Paulo (23:59:59 BRT).
-- Regra permanente de segurança: Criação prévia de tabela de backup interno com os valores atuais antes de qualquer UPDATE.

-- 1. CRIAÇÃO DA TABELA DE BACKUP INTERNO (backup_tasks_due_date_20261028_v2)
CREATE TABLE IF NOT EXISTS public.backup_tasks_due_date_20261028_v2 AS
SELECT 
  t.id AS task_id,
  t.task_number,
  t.title,
  t.client_id,
  t.plant_id,
  t.type_id,
  t.status_id,
  t.due_date AS current_due_date,
  t.created_at AS task_created_at,
  t.audit_id,
  a.title AS audit_title,
  a.frequency AS audit_frequency,
  a.sla_days AS audit_sla_days,
  a.parent_audit_id,
  NOW() AS backed_up_at
FROM public.tasks t
JOIN public.task_statuses ts ON ts.id = t.status_id
JOIN public.audits a ON a.id = t.audit_id
WHERE ts.is_terminal = false;

COMMENT ON TABLE public.backup_tasks_due_date_20261028_v2 IS 
'Backup do estado de due_date das tarefas de auditoria abertas antes do ajuste de âncora pela data do último chamado criado (2026-10-28 v2)';

-- 2. RECÁLCULO E ATUALIZAÇÃO RESTRITIVA DAS TAREFAS ABERTAS
DO $$
DECLARE
  v_count int := 0;
  r RECORD;
  v_anchor_date_brt date;
  v_target_date_brt date;
  v_new_due_date timestamptz;
  v_min_due_date timestamptz;
  v_now_brt date;
BEGIN
  v_now_brt := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
  -- Mínimo: fim do dia seguinte no fuso de São Paulo (23:59:59 BRT)
  v_min_due_date := ((v_now_brt + 1)::text || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';

  FOR r IN (
    WITH last_calls AS (
      SELECT 
        t_sub.id AS target_task_id,
        t_sub.task_number,
        t_sub.title,
        t_sub.due_date AS old_due_date,
        t_sub.created_at AS task_created_at,
        t_sub.plant_id,
        a_sub.id AS audit_id,
        a_sub.title AS audit_title,
        a_sub.frequency,
        a_sub.sla_days,
        COALESCE(
          -- Tentativa 1: mais recente de toda a árvore da auditoria (parent + children) na mesma planta
          (
            SELECT MAX(t_other.created_at)
            FROM public.tasks t_other
            JOIN public.audits a_other ON a_other.id = t_other.audit_id
            WHERE (
              a_other.parent_audit_id = COALESCE(a_sub.parent_audit_id, a_sub.id)
              OR a_other.id = COALESCE(a_sub.parent_audit_id, a_sub.id)
            )
            AND (t_other.plant_id = t_sub.plant_id OR t_sub.plant_id IS NULL)
          ),
          -- Tentativa 2: mais recente vinculado à mesma auditoria
          (
            SELECT MAX(t_same.created_at)
            FROM public.tasks t_same
            WHERE t_same.audit_id = t_sub.audit_id
          ),
          -- Fallback: a própria data de criação da tarefa
          t_sub.created_at
        ) AS anchor_created_at
      FROM public.tasks t_sub
      JOIN public.task_statuses ts_sub ON ts_sub.id = t_sub.status_id
      JOIN public.audits a_sub ON a_sub.id = t_sub.audit_id
      WHERE ts_sub.is_terminal = false
    )
    SELECT * FROM last_calls
  ) LOOP
    -- Data de criação do último chamado convertido para data em São Paulo
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

    -- Se o prazo resultante cair no passado (ou hoje), aplicar a regra do prazo mínimo (amanhã 23:59:59 BRT)
    IF v_new_due_date < v_min_due_date THEN
      v_new_due_date := v_min_due_date;
    END IF;

    -- Executa UPDATE apenas na linha da tarefa
    UPDATE public.tasks
    SET due_date = v_new_due_date
    WHERE id = r.target_task_id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Ajuste concluído. Total de tarefas de auditoria abertas atualizadas: %', v_count;
END $$;
