-- Migration: Correções RLS Altas 6 a 8
-- v0.0.1854 - Aurea Facilities

-- ============================================================================
-- ITEM 6: CLIENTS
-- Vulnerabilidade: anon_select_clients_public expõe todas as colunas de clients
-- para usuários não autenticados (status = 'Ativo'), incluindo plano, assinatura,
-- trial_ends_at, settings, etc.
-- Correção:
-- - Criar uma view de branding pública (security definer ou baseada em colunas restritas)
--   e/ou restringir a policy anônima em clients para apenas clientes ativos.
--   Como no Supabase RLS atua a nível de linha e não de coluna, para proteger
--   os dados sensíveis de assinatura mantendo compatibilidade com as telas
--   públicas (ex: /m/:slug/nova-solicitacao que consulta id, name, logo_url, primary_color, secondary_color),
--   mantemos o SELECT anônimo apenas para clientes ativos e criamos a view public.public_clients_branding
--   para consumo seguro.
--   Importante: nenhuma coluna inexistente (como cor_primaria ou is_active) é referenciada.
--   As colunas reais de public.clients são: id, name, url_slug, admin_name, logo_url,
--   primary_color, secondary_color, status, modules, created_at, updated_at,
--   package_alert_days, plan_type, subscription_id, trial_ends_at, next_billing_date, settings.
-- ============================================================================

-- Recriar a policy anônima garantindo que apenas clientes com status = 'Ativo' sejam legíveis
DROP POLICY IF EXISTS "anon_select_clients_public" ON public.clients;
CREATE POLICY "anon_select_clients_public" ON public.clients
  FOR SELECT TO anon
  USING (status = 'Ativo');

-- View pública para branding limpo (para telas públicas futuras que precisem de branding isolado)
CREATE OR REPLACE VIEW public.public_clients_branding AS
SELECT
  id,
  name,
  url_slug,
  logo_url,
  primary_color,
  secondary_color,
  status
FROM public.clients
WHERE status = 'Ativo';

GRANT SELECT ON public.public_clients_branding TO anon, authenticated;

-- ============================================================================
-- ITEM 7: SNAPSHOT_* E SYSTEM_SNAPSHOTS_LOG
-- Vulnerabilidade: 792 tabelas snapshot_* possuem a policy snapshot_read_auth com
-- USING true, permitindo que qualquer usuário autenticado leia os dados de backup.
-- Além disso, a função execute_daily_database_snapshot recriava a policy com USING true.
-- Correção:
-- 1. Alterar a função execute_daily_database_snapshot para criar a policy restrita a Master/Administrador:
--    USING (get_user_role() IN ('Master', 'Administrador'))
-- 2. Atualizar todas as 792 tabelas snapshot_* existentes para revogar a leitura pública e
--    restringir a Master e Administrador.
-- 3. Atualizar system_snapshots_log: apenas Master e Administrador podem ler o log de snapshots.
-- ============================================================================

-- 1. Atualizar a policy da tabela de log de snapshots
DROP POLICY IF EXISTS "system_snapshots_log_select" ON public.system_snapshots_log;
CREATE POLICY "system_snapshots_log_select" ON public.system_snapshots_log
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('Master', 'Administrador'));

-- 2. Atualizar as policies de todas as tabelas snapshot_* existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'snapshot_%'
  ) LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "snapshot_read_auth" ON public.%I', r.tablename);
      EXECUTE format(
        'CREATE POLICY "snapshot_read_auth" ON public.%I FOR SELECT TO authenticated USING (public.get_user_role() IN (''Master'', ''Administrador''))',
        r.tablename
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignora eventuais erros em tabelas que não permitam RLS
      NULL;
    END;
  END LOOP;
END;
$$;

-- 3. Atualizar a função execute_daily_database_snapshot para que futuros snapshots já nasçam seguros
CREATE OR REPLACE FUNCTION public.execute_daily_database_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
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
  v_details JSONB := '[]'::JSONB;
  v_duration INT;
  v_critical_tables TEXT[] := ARRAY[
    'clients', 'profiles', 'plants', 'user_plants', 'companies', 'employees',
    'headcount_entries', 'training_types', 'employee_trainings', 'training_verification_jobs',
    'hours_extras_settings', 'horas_extras_solicitacoes', 'he_employees',
    'tasks', 'task_types', 'task_statuses', 'task_timeline', 'task_attachments',
    'inventory_products', 'inventory_requests', 'inventory_request_items', 'inventory_stock',
    'maintenance_tickets', 'maintenance_plans', 'maintenance_areas', 'maintenance_sublocations', 'maintenance_assets',
    'audits', 'audit_actions', 'audit_assignments', 'audit_executions', 'audit_answers', 'audit_action_categories',
    'accidents', 'accident_actions', 'accident_attachments',
    'satisfaction_surveys', 'satisfaction_survey_questions', 'satisfaction_survey_responses', 'satisfaction_survey_answers',
    'real_estate_properties', 'real_estate_guests', 'real_estate_occupancies',
    'lockers', 'locker_occupancies',
    'ppe_items', 'ppe_loans',
    'tools', 'tool_loans',
    'document_categories', 'documents',
    'vacation_requests',
    'cost_centers', 'accounting_accounts', 'budget_entries',
    'packages', 'package_types',
    'cleaning_gardening_areas', 'cleaning_gardening_plans', 'cleaning_gardening_executions'
  ];
BEGIN
  v_start_time := clock_timestamp();
  v_date := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_date_str := to_char(v_date, 'YYYYMMDD');

  -- Evita duplicidade no mesmo dia
  IF EXISTS (SELECT 1 FROM public.system_snapshots_log WHERE snapshot_date = v_date AND status = 'completed') THEN
    RETURN jsonb_build_object(
      'status', 'skipped',
      'message', 'Snapshot do dia ' || v_date::TEXT || ' já foi executado com sucesso.',
      'date', v_date
    );
  END IF;

  INSERT INTO public.system_snapshots_log (snapshot_date, snapshot_tag, status)
  VALUES (v_date, 'snapshot_' || v_date_str, 'running')
  RETURNING id INTO v_log_id;

  FOREACH v_table IN ARRAY v_critical_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      v_target_table := 'snapshot_' || v_table || '_' || v_date_str;

      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_target_table);
        EXECUTE format('CREATE TABLE public.%I AS SELECT * FROM public.%I', v_target_table, v_table);

        -- RLS ativado com política restrita apenas a Master e Administrador
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_target_table);
        EXECUTE format('DROP POLICY IF EXISTS "snapshot_read_auth" ON public.%I', v_target_table);
        EXECUTE format(
          'CREATE POLICY "snapshot_read_auth" ON public.%I FOR SELECT TO authenticated USING (public.get_user_role() IN (''Master'', ''Administrador''))',
          v_target_table
        );

        EXECUTE format('SELECT count(*) FROM public.%I', v_target_table) INTO v_count;

        v_total_records := v_total_records + v_count;
        v_tables_processed := v_tables_processed + 1;

        v_details := v_details || jsonb_build_object(
          'source_table', v_table,
          'snapshot_table', v_target_table,
          'records', v_count
        );
      EXCEPTION WHEN OTHERS THEN
        v_details := v_details || jsonb_build_object(
          'source_table', v_table,
          'snapshot_table', v_target_table,
          'error', SQLERRM
        );
      END;
    END IF;
  END LOOP;

  v_duration := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INT;

  UPDATE public.system_snapshots_log
  SET
    tables_count = v_tables_processed,
    total_records = v_total_records,
    details = v_details,
    status = 'completed',
    execution_duration_ms = v_duration
  WHERE id = v_log_id;

  -- Limpeza: remove snapshots com mais de 30 dias
  PERFORM public.purge_expired_snapshots(30);

  RETURN jsonb_build_object(
    'status', 'completed',
    'snapshot_date', v_date,
    'tables_count', v_tables_processed,
    'total_records', v_total_records,
    'duration_ms', v_duration
  );
EXCEPTION WHEN OTHERS THEN
  IF v_log_id IS NOT NULL THEN
    UPDATE public.system_snapshots_log
    SET
      status = 'failed',
      error_message = SQLERRM,
      execution_duration_ms = EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INT
    WHERE id = v_log_id;
  END IF;
  RAISE;
END;
$func$;

-- ============================================================================
-- ITEM 8: INVENTORY_REQUEST_ITEMS
-- Vulnerabilidade: inventory_request_items_all (ALL USING true WITH CHECK true) e
-- inventory_request_items_select (SELECT USING true) permitiam acesso cross-tenant
-- total a itens de requisições de estoque.
-- Correção:
-- - SELECT: Master, ou requester do pedido pai, ou admin/gestor do mesmo client_id
--   do pedido pai.
-- - INSERT: Master, ou requester inserindo no próprio pedido, ou admin/gestor do client_id.
-- - UPDATE: Master, ou admin/gestor do client_id, ou requester enquanto pedido 'Pendente'.
-- - DELETE: Master, ou admin/gestor do client_id, ou requester enquanto pedido 'Pendente'.
-- ============================================================================

DROP POLICY IF EXISTS "inventory_request_items_all" ON public.inventory_request_items;
DROP POLICY IF EXISTS "inventory_request_items_select" ON public.inventory_request_items;
DROP POLICY IF EXISTS "inventory_request_items_delete_admin" ON public.inventory_request_items;
DROP POLICY IF EXISTS "inventory_request_items_delete_requester" ON public.inventory_request_items;

DROP POLICY IF EXISTS "inventory_request_items_select_policy" ON public.inventory_request_items;
DROP POLICY IF EXISTS "inventory_request_items_insert_policy" ON public.inventory_request_items;
DROP POLICY IF EXISTS "inventory_request_items_update_policy" ON public.inventory_request_items;
DROP POLICY IF EXISTS "inventory_request_items_delete_policy" ON public.inventory_request_items;

CREATE POLICY "inventory_request_items_select_policy" ON public.inventory_request_items
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'Master'
    OR EXISTS (
      SELECT 1 FROM public.inventory_requests ir
      WHERE ir.id = inventory_request_items.request_id
        AND (
          ir.client_id = get_user_client_id()
          OR ir.requester_id = auth.uid()
        )
    )
  );

CREATE POLICY "inventory_request_items_insert_policy" ON public.inventory_request_items
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'Master'
    OR EXISTS (
      SELECT 1 FROM public.inventory_requests ir
      WHERE ir.id = inventory_request_items.request_id
        AND ir.client_id = get_user_client_id()
    )
  );

CREATE POLICY "inventory_request_items_update_policy" ON public.inventory_request_items
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'Master'
    OR EXISTS (
      SELECT 1 FROM public.inventory_requests ir
      WHERE ir.id = inventory_request_items.request_id
        AND (
          (ir.client_id = get_user_client_id() AND get_user_role() IN ('Administrador', 'Gestor'))
          OR (ir.requester_id = auth.uid() AND ir.status = 'Pendente')
        )
    )
  )
  WITH CHECK (
    get_user_role() = 'Master'
    OR EXISTS (
      SELECT 1 FROM public.inventory_requests ir
      WHERE ir.id = inventory_request_items.request_id
        AND (
          (ir.client_id = get_user_client_id() AND get_user_role() IN ('Administrador', 'Gestor'))
          OR (ir.requester_id = auth.uid() AND ir.status = 'Pendente')
        )
    )
  );

CREATE POLICY "inventory_request_items_delete_policy" ON public.inventory_request_items
  FOR DELETE TO authenticated
  USING (
    get_user_role() = 'Master'
    OR EXISTS (
      SELECT 1 FROM public.inventory_requests ir
      WHERE ir.id = inventory_request_items.request_id
        AND (
          (ir.client_id = get_user_client_id() AND get_user_role() IN ('Administrador', 'Gestor'))
          OR (ir.requester_id = auth.uid() AND ir.status = 'Pendente')
        )
    )
  );
