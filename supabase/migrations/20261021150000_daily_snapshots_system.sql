-- Migration: 20261021150000_daily_snapshots_system.sql
-- Camada 3: Snapshot Diário Automático
-- Criação de rotina diária às 03:00 BRT (06:00 UTC) via pg_cron
-- Copia todas as tabelas críticas dos 9 módulos para snapshots datados (snapshot_<tabela>_<YYYYMMDD>)
-- Mantém retenção de 30 dias (limpeza automática remove snapshots mais antigos)
-- Registra metadados e contagens na tabela public.system_snapshots_log para auditoria e conferência

CREATE SCHEMA IF NOT EXISTS snapshots;

-- Tabela de histórico e controle dos snapshots
CREATE TABLE IF NOT EXISTS public.system_snapshots_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  snapshot_tag TEXT NOT NULL,
  tables_count INT NOT NULL DEFAULT 0,
  total_records BIGINT NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  execution_duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_log_date ON public.system_snapshots_log (snapshot_date DESC);

ALTER TABLE public.system_snapshots_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_snapshots_log_select" ON public.system_snapshots_log;
CREATE POLICY "system_snapshots_log_select" ON public.system_snapshots_log
  FOR SELECT TO authenticated USING (true);

-- Função principal que executa o snapshot diário completo
CREATE OR REPLACE FUNCTION public.execute_daily_database_snapshot(p_target_date DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_date DATE;
  v_date_str TEXT;
  v_log_id UUID;
  v_start_time TIMESTAMPTZ;
  v_table TEXT;
  v_target_table TEXT;
  v_count BIGINT;
  v_total_records BIGINT := 0;
  v_tables_processed INT := 0;
  v_details JSONB := '[]'::jsonb;
  v_duration_ms INT;
  critical_tables TEXT[] := ARRAY[
    -- 1. Gestão de Terceiros
    'companies', 'employees', 'contracted_headcount', 'daily_logs', 'trainings', 'employee_training_records', 'function_required_trainings',
    -- 2. Limpeza e Jardinagem
    'cleaning_gardening_areas', 'cleaning_gardening_schedules',
    -- 3. Gestão de Tarefas
    'tasks', 'task_timeline', 'task_types', 'task_statuses',
    -- 4. Auditorias e Check list
    'audits', 'audit_actions', 'audit_executions', 'audit_execution_answers', 'audit_assignments', 'audit_question_categories', 'audit_ai_reports',
    -- 5. Gestão de Acidentes
    'accidents',
    -- 6. Gestão de Manutenção
    'maintenance_tickets', 'maintenance_ticket_logs', 'maintenance_preventive_plans', 'maintenance_plan_checklist_items', 'maintenance_assets', 'maintenance_workers', 'maintenance_areas', 'maintenance_sublocations', 'maintenance_types', 'maintenance_priorities', 'maintenance_statuses',
    -- 7. Gestão de Budget
    'budget_entries', 'budget_accounts', 'budget_cost_centers',
    -- 8. Gestão de Imóveis
    'properties', 'property_rooms', 'property_guests', 'property_reservations', 'property_cost_centers',
    -- 9. Gestão de Estoque
    'inventory_products', 'inventory_categories', 'inventory_requests', 'inventory_request_items'
  ];
BEGIN
  v_start_time := clock_timestamp();
  v_date := COALESCE(p_target_date, (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE);
  v_date_str := to_char(v_date, 'YYYYMMDD');

  -- Insere registro inicial do log
  INSERT INTO public.system_snapshots_log (snapshot_date, snapshot_tag, status)
  VALUES (v_date, v_date_str, 'in_progress')
  RETURNING id INTO v_log_id;

  FOREACH v_table IN ARRAY critical_tables LOOP
    -- Nome do snapshot: tanto na schema snapshots quanto tabela espelho nomeada snapshot_<tabela>_<YYYYMMDD>
    -- Para conveniência do usuário e compatibilidade total: criamos na schema snapshots como <tabela>_<YYYYMMDD>
    -- e criamos uma view/tabela no public chamada snapshot_<tabela>_<YYYYMMDD>.
    v_target_table := 'snapshot_' || v_table || '_' || v_date_str;

    -- Dropa se já existir para o mesmo dia (idempotência)
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_target_table);

    -- Copia completa preservando tipos, colunas e dados
    EXECUTE format('CREATE TABLE public.%I AS TABLE public.%I', v_target_table, v_table);

    -- Habilita RLS para leitura de administradores autenticados
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_target_table);
    EXECUTE format('DROP POLICY IF EXISTS "snapshot_read_auth" ON public.%I', v_target_table);
    EXECUTE format('CREATE POLICY "snapshot_read_auth" ON public.%I FOR SELECT TO authenticated USING (true)', v_target_table);

    -- Conta registros copiados
    EXECUTE format('SELECT count(*) FROM public.%I', v_target_table) INTO v_count;

    v_total_records := v_total_records + v_count;
    v_tables_processed := v_tables_processed + 1;

    v_details := v_details || jsonb_build_object(
      'table', v_table,
      'snapshot_table', v_target_table,
      'record_count', v_count
    );
  END LOOP;

  v_duration_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_start_time))::INT +
                   (EXTRACT(SECOND FROM (clock_timestamp() - v_start_time))::INT * 1000);

  -- Atualiza o log com os totais e detalhes
  UPDATE public.system_snapshots_log
  SET tables_count = v_tables_processed,
      total_records = v_total_records,
      details = v_details,
      status = 'completed',
      execution_duration_ms = v_duration_ms
  WHERE id = v_log_id;

  RETURN jsonb_build_object(
    'log_id', v_log_id,
    'snapshot_date', v_date,
    'snapshot_tag', v_date_str,
    'tables_count', v_tables_processed,
    'total_records', v_total_records,
    'execution_duration_ms', v_duration_ms,
    'details', v_details
  );
EXCEPTION WHEN OTHERS THEN
  IF v_log_id IS NOT NULL THEN
    UPDATE public.system_snapshots_log
    SET status = 'failed',
        error_message = SQLERRM
    WHERE id = v_log_id;
  END IF;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rotina de limpeza com retenção de 30 dias:
-- Remove tabelas de snapshot com mais de 30 dias
-- DESTRUTIVA APENAS sobre tabelas que começam com 'snapshot_' e tenham data no padrão YYYYMMDD
CREATE OR REPLACE FUNCTION public.cleanup_old_database_snapshots(p_retention_days INT DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  v_rec RECORD;
  v_table_date DATE;
  v_deleted_tables TEXT[] := ARRAY[]::TEXT[];
  v_cutoff_date DATE;
BEGIN
  v_cutoff_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - p_retention_days;

  FOR v_rec IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'snapshot_%'
  LOOP
    -- Extrai os últimos 8 caracteres para verificar se é data YYYYMMDD
    IF v_rec.table_name ~ 'snapshot_.+_[0-9]{8}$' THEN
      BEGIN
        v_table_date := to_date(substring(v_rec.table_name from '[0-9]{8}$'), 'YYYYMMDD');
        IF v_table_date < v_cutoff_date THEN
          EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_rec.table_name);
          v_deleted_tables := array_append(v_deleted_tables, v_rec.table_name);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Ignora formato não reconhecido
        NULL;
      END;
    END IF;
  END LOOP;

  -- Remove registros de log mais antigos que a retenção
  DELETE FROM public.system_snapshots_log
  WHERE snapshot_date < v_cutoff_date;

  RETURN jsonb_build_object(
    'retention_days', p_retention_days,
    'cutoff_date', v_cutoff_date,
    'dropped_tables', v_deleted_tables,
    'count_dropped', array_length(v_deleted_tables, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rotina orquestradora diária que executa o snapshot e em seguida roda a limpeza
CREATE OR REPLACE FUNCTION public.run_daily_snapshot_job()
RETURNS void AS $$
BEGIN
  PERFORM public.execute_daily_database_snapshot();
  PERFORM public.cleanup_old_database_snapshots(30);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Configuração do agendamento pg_cron:
-- Horário: 03:00 BRT (Horário de Brasília) = 06:00 UTC (já que UTC = BRT + 3)
-- Expressão cron: '0 6 * * *'
DO $$
BEGIN
  -- Se pg_cron estiver ativo, registra ou atualiza o job
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove job anterior se existir
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'daily-database-snapshot-aurea';

    -- Agenda o job diário para rodar às 06:00 UTC (03:00 Horário de Brasília)
    PERFORM cron.schedule(
      'daily-database-snapshot-aurea',
      '0 6 * * *',
      'SELECT public.run_daily_snapshot_job();'
    );
  END IF;
END $$;
