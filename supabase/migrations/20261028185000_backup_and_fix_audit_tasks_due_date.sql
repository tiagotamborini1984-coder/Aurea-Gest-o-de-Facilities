-- Migration: 20261028185000_backup_and_fix_audit_tasks_due_date.sql
-- Regra permanente do usuário: backup interno antes de qualquer mudança em dados de produção.
-- Criação da tabela de backup para registrar o estado original das tarefas afetadas:
-- Tabela: backup_tasks_due_date_20261028

CREATE TABLE IF NOT EXISTS public.backup_tasks_due_date_20261028 AS
SELECT 
  t.id AS task_id,
  t.task_number,
  t.title,
  t.client_id,
  t.plant_id,
  t.type_id,
  t.status_id,
  t.due_date AS original_due_date,
  t.created_at AS task_created_at,
  t.audit_id,
  a.frequency AS audit_frequency,
  a.sla_days AS audit_sla_days,
  NOW() AS backed_up_at
FROM public.tasks t
JOIN public.task_statuses ts ON ts.id = t.status_id
JOIN public.audits a ON a.id = t.audit_id
WHERE ts.is_terminal = false
  AND t.created_at >= NOW() - INTERVAL '45 days'
  AND (
    t.due_date < t.created_at 
    OR t.due_date::date <= t.created_at::date
  );

-- Comentário para documentar o backup
COMMENT ON TABLE public.backup_tasks_due_date_20261028 IS 'Backup dos due_date originais das tarefas de auditoria abertas dos últimos 45 dias antes da correção de cálculo de prazo de 2026-10-28';

-- UPDATE restritivo apenas nas tarefas de auditoria abertas, criadas nos últimos 45 dias,
-- que nasceram com due_date vencida ou vencendo no mesmo dia da criação.
-- Aplica o cálculo no fuso horário do Brasil (America/Sao_Paulo):
-- SLA configurado > 0: +sla_days
-- Diária: +1 dia
-- Semanal: +7 dias
-- Quinzenal: +15 dias (solicitação explícita do Tiago)
-- Mensal: +30 dias
-- Bimestral: +60 dias
-- Trimestral: +90 dias
-- Semestral: +180 dias
-- Anual: +365 dias
-- Sem freq conhecida: +1 dia
-- Horário limite: 23:59:59 America/Sao_Paulo

DO $$
DECLARE
  v_count int := 0;
  r RECORD;
  v_base_date_brt date;
  v_target_date_brt date;
  v_new_due_date timestamptz;
BEGIN
  FOR r IN (
    SELECT 
      t.id,
      t.task_number,
      t.created_at,
      a.frequency,
      a.sla_days
    FROM public.tasks t
    JOIN public.task_statuses ts ON ts.id = t.status_id
    JOIN public.audits a ON a.id = t.audit_id
    WHERE ts.is_terminal = false
      AND t.created_at >= NOW() - INTERVAL '45 days'
      AND (
        t.due_date < t.created_at 
        OR t.due_date::date <= t.created_at::date
      )
  ) LOOP
    v_base_date_brt := (r.created_at AT TIME ZONE 'America/Sao_Paulo')::date;

    IF r.sla_days IS NOT NULL AND r.sla_days > 0 THEN
      v_target_date_brt := v_base_date_brt + (r.sla_days::int);
    ELSIF r.frequency = 'Diária' THEN
      v_target_date_brt := v_base_date_brt + 1;
    ELSIF r.frequency = 'Semanal' THEN
      v_target_date_brt := v_base_date_brt + 7;
    ELSIF r.frequency = 'Quinzenal' THEN
      v_target_date_brt := v_base_date_brt + 15;
    ELSIF r.frequency = 'Mensal' THEN
      v_target_date_brt := v_base_date_brt + 30;
    ELSIF r.frequency = 'Bimestral' THEN
      v_target_date_brt := v_base_date_brt + 60;
    ELSIF r.frequency = 'Trimestral' THEN
      v_target_date_brt := v_base_date_brt + 90;
    ELSIF r.frequency = 'Semestral' THEN
      v_target_date_brt := v_base_date_brt + 180;
    ELSIF r.frequency = 'Anual' THEN
      v_target_date_brt := v_base_date_brt + 365;
    ELSE
      v_target_date_brt := v_base_date_brt + 1;
    END IF;

    v_new_due_date := (v_target_date_brt::text || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';

    -- Se porventura a data calculada ainda estivesse no passado em relação a hoje,
    -- garantir no mínimo amanhã no fuso de São Paulo
    IF v_new_due_date < NOW() THEN
      v_new_due_date := (((NOW() AT TIME ZONE 'America/Sao_Paulo')::date + 1)::text || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    UPDATE public.tasks
    SET due_date = v_new_due_date
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Total de tarefas de auditoria corrigidas com novo prazo: %', v_count;
END $$;
