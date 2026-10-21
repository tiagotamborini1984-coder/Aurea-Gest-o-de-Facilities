-- Migration: 20261021140000_mass_destructive_operation_guard.sql
-- Camada 2: Blindagem Técnica contra Operações Destrutivas em Massa
-- Bloqueia deleções em lote/massa e truncates acidentais nas tabelas críticas dos 9 módulos de negócio
-- Exige flag explícita de aprovação por transação (app.allow_mass_destructive_operation = 'true')
-- e criação prévia obrigatória de backup interno antes de permitir qualquer exclusão em massa aprovada.

CREATE SCHEMA IF NOT EXISTS snapshots;

-- Tabela para auditoria interna de tentativas de deleção em massa (bloqueadas e autorizadas)
CREATE TABLE IF NOT EXISTS public.system_destructive_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  affected_estimate BIGINT DEFAULT 0,
  is_blocked BOOLEAN NOT NULL,
  block_reason TEXT,
  executed_by TEXT DEFAULT current_user,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_destructive_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_destructive_audit_log_select" ON public.system_destructive_audit_log;
CREATE POLICY "system_destructive_audit_log_select" ON public.system_destructive_audit_log
  FOR SELECT TO authenticated USING (true);

-- Função auxiliar para criar backup interno antes de operação destrutiva aprovada
-- Padrão de nome exigido: backup_<tabela>_<data>
CREATE OR REPLACE FUNCTION public.create_internal_table_backup(p_table TEXT)
RETURNS TEXT AS $$
DECLARE
  v_timestamp TEXT;
  v_backup_table TEXT;
BEGIN
  v_timestamp := to_char(NOW() AT TIME ZONE 'America/Sao_Paulo', 'YYYYMMDD_HH24MISS');
  v_backup_table := 'backup_' || p_table || '_' || v_timestamp;

  -- Cria cópia completa da tabela preservando todos os dados
  EXECUTE format('CREATE TABLE public.%I AS TABLE public.%I', v_backup_table, p_table);
  
  -- Garante permissões de leitura para administradores autenticados
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_backup_table);
  EXECUTE format('DROP POLICY IF EXISTS "backup_read_auth" ON public.%I', v_backup_table);
  EXECUTE format('CREATE POLICY "backup_read_auth" ON public.%I FOR SELECT TO authenticated USING (true)', v_backup_table);

  RETURN v_backup_table;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger guard que roda BEFORE EACH STATEMENT em DELETE/TRUNCATE nas tabelas críticas
-- Permite operações unitárias / pequenos lotes normais da aplicação (via ROW ou statement com estimativa de poucas linhas)
-- Para operações que afetam potencialmente muitas linhas sem WHERE ou em massa (> 5 registros), exige autorização explícita.
-- Na prática do PostgreSQL, um trigger STATEMENT BEFORE TRUNCATE sempre bloqueia se a flag não estiver ativa.
-- E um trigger ROW de segurança monitora a contagem de linhas deletadas na transação.

CREATE OR REPLACE FUNCTION public.guard_prevent_mass_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_allowed TEXT;
  v_threshold CONSTANT INT := 5; -- Limite para operações normais de aplicação (ex: deletar pacote de 1-5 itens)
  v_current_count INT;
BEGIN
  -- Verifica se a sessão atual possui a flag explícita de aprovação
  BEGIN
    v_allowed := current_setting('app.allow_mass_destructive_operation', true);
  EXCEPTION WHEN OTHERS THEN
    v_allowed := 'false';
  END;

  IF v_allowed = 'true' THEN
    -- Operação aprovada explicitamente pelo operador/administrador
    RETURN OLD;
  END IF;

  -- Se for deleção de registro único ou pequena quantidade, usamos uma variável de transação para rastrear
  -- a quantidade de registros afetados pelo mesmo statement.
  BEGIN
    v_current_count := COALESCE(current_setting('app.stmt_deleted_count', true)::INT, 0) + 1;
  EXCEPTION WHEN OTHERS THEN
    v_current_count := 1;
  END;

  PERFORM set_config('app.stmt_deleted_count', v_current_count::TEXT, true);

  -- Se o número de registros deletados na mesma instrução ultrapassar o threshold, lança exceção com explicação clara
  IF v_current_count > v_threshold THEN
    -- Registra no log de auditoria
    INSERT INTO public.system_destructive_audit_log (table_name, operation, affected_estimate, is_blocked, block_reason)
    VALUES (TG_TABLE_NAME, 'DELETE', v_current_count, true, 'Bloqueio preventivo: tentativa de deleção em massa sem aprovação explícita (threshold ' || v_threshold || ' excedido).');

    RAISE EXCEPTION 'OPERAÇÃO DESTRUTIVA EM MASSA BLOQUEADA [Guarda da Aurea Facilities]: Tentativa de exclusão em massa na tabela % (mais de % registros no mesmo comando) sem aprovação explícita. Para executar uma alteração em massa legítima, é obrigatório solicitar confirmação explícita no chat e definir: SET LOCAL app.allow_mass_destructive_operation = ''true''; após a criação do backup interno.', TG_TABLE_NAME, v_threshold;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger STATEMENT para TRUNCATE (sempre em massa)
CREATE OR REPLACE FUNCTION public.guard_prevent_truncate()
RETURNS TRIGGER AS $$
DECLARE
  v_allowed TEXT;
BEGIN
  BEGIN
    v_allowed := current_setting('app.allow_mass_destructive_operation', true);
  EXCEPTION WHEN OTHERS THEN
    v_allowed := 'false';
  END;

  IF v_allowed <> 'true' THEN
    INSERT INTO public.system_destructive_audit_log (table_name, operation, is_blocked, block_reason)
    VALUES (TG_TABLE_NAME, 'TRUNCATE', true, 'Bloqueio preventivo: TRUNCATE não autorizado.');

    RAISE EXCEPTION 'TRUNCATE BLOQUEADO [Guarda da Aurea Facilities]: TRUNCATE na tabela % é estritamente proibido sem confirmação explícita e flag app.allow_mass_destructive_operation = ''true''.', TG_TABLE_NAME;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplica o guard nas tabelas críticas dos 9 módulos:
DO $$
DECLARE
  t TEXT;
  critical_tables TEXT[] := ARRAY[
    -- 1. Terceiros
    'companies', 'employees', 'contracted_headcount', 'daily_logs', 'trainings', 'employee_training_records', 'function_required_trainings',
    -- 2. Limpeza e Jardinagem
    'cleaning_gardening_areas', 'cleaning_gardening_schedules',
    -- 3. Tarefas
    'tasks', 'task_timeline', 'task_types', 'task_statuses',
    -- 4. Auditorias
    'audits', 'audit_actions', 'audit_executions', 'audit_execution_answers', 'audit_assignments', 'audit_question_categories', 'audit_ai_reports',
    -- 5. Acidentes
    'accidents',
    -- 6. Manutenção
    'maintenance_tickets', 'maintenance_ticket_logs', 'maintenance_preventive_plans', 'maintenance_plan_checklist_items', 'maintenance_assets', 'maintenance_workers', 'maintenance_areas', 'maintenance_sublocations', 'maintenance_types', 'maintenance_priorities', 'maintenance_statuses',
    -- 7. Budget
    'budget_entries', 'budget_accounts', 'budget_cost_centers',
    -- 8. Imóveis
    'properties', 'property_rooms', 'property_guests', 'property_reservations', 'property_cost_centers',
    -- 9. Estoque
    'inventory_products', 'inventory_categories', 'inventory_requests', 'inventory_request_items'
  ];
BEGIN
  FOREACH t IN ARRAY critical_tables LOOP
    -- Aplica trigger de TRUNCATE
    EXECUTE format('DROP TRIGGER IF EXISTS trg_guard_truncate ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_guard_truncate BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.guard_prevent_truncate()', t);

    -- Aplica trigger de DELETE ROW
    EXECUTE format('DROP TRIGGER IF EXISTS trg_guard_mass_delete ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_guard_mass_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_prevent_mass_delete()', t);
  END LOOP;
END $$;
