-- Migration: 20261021151000_run_initial_snapshot_and_test.sql
-- Executa o primeiro snapshot manual imediatamente e valida que os dados foram copiados com sucesso

DO $$
DECLARE
  v_res JSONB;
  v_audits_count BIGINT;
  v_questions_count BIGINT;
  v_executions_count BIGINT;
  v_answers_count BIGINT;
  v_date_str TEXT;
BEGIN
  v_date_str := to_char((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE, 'YYYYMMDD');

  -- Executa snapshot inicial
  v_res := public.execute_daily_database_snapshot();

  -- Valida contagens nas tabelas espelho de snapshot criadas
  EXECUTE format('SELECT count(*) FROM public.snapshot_audits_%s', v_date_str) INTO v_audits_count;
  EXECUTE format('SELECT count(*) FROM public.snapshot_audit_actions_%s', v_date_str) INTO v_questions_count;
  EXECUTE format('SELECT count(*) FROM public.snapshot_audit_executions_%s', v_date_str) INTO v_executions_count;
  EXECUTE format('SELECT count(*) FROM public.snapshot_audit_execution_answers_%s', v_date_str) INTO v_answers_count;

  RAISE NOTICE 'Snapshot inicial concluído com sucesso: %', v_res;
  RAISE NOTICE 'Conferência Auditorias: % (esperado: 90)', v_audits_count;
  RAISE NOTICE 'Conferência Perguntas/Ações: % (esperado: 5126)', v_questions_count;
  RAISE NOTICE 'Conferência Execuções: % (esperado: 161)', v_executions_count;
  RAISE NOTICE 'Conferência Respostas: % (esperado: 6762)', v_answers_count;

  IF v_audits_count <> 90 OR v_questions_count <> 5126 OR v_executions_count <> 161 OR v_answers_count <> 6762 THEN
    RAISE EXCEPTION 'Discrepância detectada no snapshot das tabelas de auditoria: audits=%, actions=%, executions=%, answers=%',
      v_audits_count, v_questions_count, v_executions_count, v_answers_count;
  END IF;
END $$;
