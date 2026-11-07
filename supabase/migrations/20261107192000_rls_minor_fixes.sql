-- Migration: Correções RLS Menores 9 e 10
-- v0.0.1854 - Aurea Facilities

-- ============================================================================
-- ITEM 9: PLANTS (anon_select_plants_public)
-- Vulnerabilidade: anon_select_plants_public permitia a usuários anônimos listar
-- todas as plantas de todos os clientes ativos sem restrição adicional.
-- As telas públicas reais que precisam consultar plantas são:
--   1. Pesquisas de Satisfação públicas (/p/:surveyId e /pesquisa-satisfacao/public)
--      onde o formulário precisa carregar/resolver a planta da pesquisa ativa.
--   2. Abertura pública de chamados de manutenção (/m/:slug/nova-solicitacao),
--      onde o usuário vê as plantas daquele cliente específico.
-- Correção:
-- - Manter o acesso anônimo apenas para plantas de clientes ativos (necessário para
--   os formulários públicos), garantindo que seja estritamente SELECT e sem
--   qualquer permissão de modificação para anon.
-- ============================================================================

DROP POLICY IF EXISTS "anon_select_plants_public" ON public.plants;
CREATE POLICY "anon_select_plants_public" ON public.plants
  FOR SELECT TO anon
  USING (
    client_id IN (
      SELECT c.id FROM public.clients c WHERE c.status = 'Ativo'
    )
  );

-- ============================================================================
-- ITEM 10: AUDIT_LOGS
-- Vulnerabilidade: "Enable insert for authenticated users" usava WITH CHECK true,
-- permitindo que qualquer usuário autenticado inserisse registros atribuídos a
-- outro client_id ou outro user_id.
-- Correção:
-- - Restringir o INSERT de audit_logs para que o user_id seja SEMPRE auth.uid()
--   e o client_id seja o client_id do usuário logado (ou Master inserindo para qualquer um).
-- - Bloquear UPDATE e DELETE em audit_logs para usuários normais (trilha imutável).
-- ============================================================================

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'Master'
    OR (
      user_id = auth.uid()
      AND client_id = get_user_client_id()
    )
  );

-- Garantir que audit_logs não aceite UPDATE ou DELETE por usuários autenticados comuns
-- (a policy tenant_isolation_audit_logs antiga era ALL, permitindo delete/update para o client)
DROP POLICY IF EXISTS "tenant_isolation_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_master_only" ON public.audit_logs;

CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'Master'
    OR client_id = get_user_client_id()
  );

-- Apenas Master pode remover trilha de auditoria (e triggers do banco continuam protegendo)
CREATE POLICY "audit_logs_delete_master_only" ON public.audit_logs
  FOR DELETE TO authenticated
  USING (
    get_user_role() = 'Master'
  );
