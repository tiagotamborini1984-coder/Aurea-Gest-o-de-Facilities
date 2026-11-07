-- Migration: 20261107191000_rls_high_fixes.sql
-- CORREÇÃO DE VULNERABILIDADES RLS — GRUPO ALTO (itens 6–8)
-- Apenas DDL de policies. Nenhum dado é alterado.

-- ============================================================
-- 6. CLIENTS — login anônimo só lê o mínimo (branding)
-- ============================================================
-- Como consome: src/pages/Login.tsx (anon) usa .select('id, name, logo_url, cor_primaria')
-- e src/store/AppContext.tsx (usuário logado) usa branding + plan.
-- Estratégia segura sem quebrar o login:
--  - policy anon_select_clients_public → SELECT apenas para clientes ATIVOS
--    (a tela de login já filtra por is_active = true); o Frontend NUNCA seleciona
--    colunas de plano/assinatura em requisições anônimas — colunas de plano
--    (plan, subscription_status, trial_ends_at, max_plants, etc.) deixam de ser
--    expostas anonimamente por meio de VIEW de branding + ajuste no Login.
--  - usuários autenticados continuam lendo o próprio cliente (padrão de tenant).

-- 6.1 View de branding para a tela de Login (security_invoker = false → roda com
--     dono da view = postgres, ignora RLS de clients mas só expõe branding)
DROP VIEW IF EXISTS public.clients_login_branding;
CREATE VIEW public.clients_login_branding
  WITH (security_barrier = true) AS
SELECT id, name, logo_url, cor_primaria, cor_secundaria, is_active
FROM public.clients
WHERE is_active = true;

GRANT SELECT ON public.clients_login_branding TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_clients_public" ON public.clients;
DROP POLICY IF EXISTS "clients_select_authenticated" ON public.clients;
DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;

CREATE POLICY "tenant_isolation_clients" ON public.clients
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Master'
    OR id = public.get_user_client_id()
  );

-- Anon: nenhum acesso direto à tabela (usa a view de branding)
-- (nenhuma policy anon criada → anon não lê clients)

-- ============================================================
-- 7. SNAPSHOT_* — apenas service_role lê/escreve
-- ============================================================
-- A tela /admin/auditoria lê public.system_snapshots_log (log do snapshot),
-- não as tabelas snapshot_* diretamente; essa tabela mantém leitura para Master.

-- policies permissivas em tabelas snapshot_* (se houver)
DO $$
DECLARE
  t TEXT;
  pol TEXT;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'snapshot_%'
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- system_snapshots_log: leitura apenas Master (tela /admin/auditoria)
DROP POLICY IF EXISTS "authenticated_read_snapshot_log" ON public.system_snapshots_log;
DROP POLICY IF EXISTS "tenant_isolation_system_snapshots_log" ON public.system_snapshots_log;
CREATE POLICY "tenant_isolation_system_snapshots_log" ON public.system_snapshots_log
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'Master');

-- ============================================================
-- 8. INVENTORY_REQUEST_ITEMS — isolamento pelo pedido pai
-- ============================================================
DROP POLICY IF EXISTS "inventory_request_items_all" ON public.inventory_request_items;
DROP POLICY IF EXISTS "tenant_isolation_inventory_request_items" ON public.inventory_request_items;

CREATE POLICY "tenant_isolation_inventory_request_items" ON public.inventory_request_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_requests r
      WHERE r.id = inventory_request_items.request_id
        AND (
          public.get_user_role() = 'Master'
          OR r.client_id = public.get_user_client_id()
        )
        AND (
          public.get_user_role() = 'Master'
          OR r.plant_id IS NULL
          OR public.is_plant_authorized(r.plant_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_requests r
      WHERE r.id = inventory_request_items.request_id
        AND (
          public.get_user_role() = 'Master'
          OR r.client_id = public.get_user_client_id()
        )
        AND (
          public.get_user_role() = 'Master'
          OR r.plant_id IS NULL
          OR public.is_plant_authorized(r.plant_id)
        )
    )
  );
