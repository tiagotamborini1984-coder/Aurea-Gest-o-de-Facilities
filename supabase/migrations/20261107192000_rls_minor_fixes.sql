-- Migration: 20261107192000_rls_minor_fixes.sql
-- CORREÇÃO DE VULNERABILIDADES RLS — GRUPO MENOR (itens 9–10)
-- Apenas DDL de policies. Nenhum dado é alterado.

-- ============================================================
-- 9. anon_select_plants_public — restringir leitura anônima de plantas
-- ============================================================
-- Consumidores anônimos identificados: formulários públicos de chamados
-- (gestao-manutencao/public) e pesquisas de satisfação (public/).
-- Ambos filtram por empresa ativa no frontend; a policy agora impõe isso
-- no banco (is_active = true) e mantém somente leitura das colunas mínimas
-- (a view pública de manutenção já expõe o mínimo; aqui garantimos o filtro).

DROP POLICY IF EXISTS "anon_select_plants_public" ON public.plants;
DROP POLICY IF EXISTS "plants_select_authenticated" ON public.plants;
DROP POLICY IF EXISTS "tenant_isolation_plants" ON public.plants;

CREATE POLICY "tenant_isolation_plants" ON public.plants
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Master'
    OR client_id = public.get_user_client_id()
  );

CREATE POLICY "anon_select_plants_public" ON public.plants
  FOR SELECT TO anon
  USING (is_active = true);

-- ============================================================
-- 10. AUDIT_LOGS — escrita apenas via service_role / funções dedicadas
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated insert on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_isolation_audit_logs" ON public.audit_logs;

-- Leitura: mantém padrão atual — Master vê tudo; Admin vê as do próprio cliente
CREATE POLICY "tenant_isolation_audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Master'
    OR client_id = public.get_user_client_id()
  );

-- Escrita: nenhuma policy INSERT para authenticated → apenas service_role
-- (o frontend registra logs via edge function / service_role; se algum fluxo
--  gravava direto do browser, passará a falhar silenciosamente — aceitável
--  segundo o pedido, que prioriza o fechamento).
