-- ============================================================================
-- Exclusão pontual e autorizada da conta fantasma "Admin LPTamborini"
-- (e7832374-73ce-4ad7-9d6f-d8a7e3d8a26d / liberado-aurea-nov-2026@troca-interna.local)
-- ----------------------------------------------------------------------------
-- É a conta fantasma renomeada no swap de e-mail da v0.0.1875 (migração
-- 20261112133000). Autorização explícita do usuário nesta rodada: o pedido
-- "remover a conta fantasma" É a confirmação para esta exclusão específica.
-- NÃO usar como modelo para outras exclusões.
--
-- Procedimento (padrão snapshot_email_swap_20261112 + delete_gleiccy_user):
--   1. Verificação de estado: a conta existe com o e-mail esperado e o ID;
--      o Master real (5c8fb418-... / lptamborini@hotmail.com) NÃO é tocado.
--   2. BACKUP interno ANTES da mudança (regra permanente do usuário): linhas
--      completas de auth.users e public.profiles em snapshot_ghost_delete_20261112.
--   3. Vínculos verificados em 2026-11-12: nenhum (requesters, tasks,
--      audit_logs, user_plants, auth.identities, maintenance_tickets e
--      task_timeline com 0 linhas). FKs remanescentes são CASCADE/SET NULL
--      pela migração 20261107150000 — histórico é preservado.
--   4. Anula referências idempotentemente (segurança extra, não apaga nada).
--   5. Remove o perfil público e a credencial de auth.
--
-- Operação de linha única (WHERE por ID exato) — o guard de banco bloqueia
-- DELETE em lote, e aqui nada é em lote.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. BACKUP: snapshot das linhas de auth.users e profiles antes da exclusão
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.snapshot_ghost_delete_20261112 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taken_at timestamptz NOT NULL DEFAULT now(),
  source_table text NOT NULL,
  user_id uuid NOT NULL,
  email text NOT NULL,
  row_data jsonb NOT NULL
);

-- RLS restrita a Master/Admin (padrão das tabelas snapshot_*)
ALTER TABLE public.snapshot_ghost_delete_20261112 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snapshot_ghost_delete_select" ON public.snapshot_ghost_delete_20261112;
CREATE POLICY "snapshot_ghost_delete_select" ON public.snapshot_ghost_delete_20261112
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('Master', 'Administrador'));

DO $$
DECLARE
  v_ghost uuid := 'e7832374-73ce-4ad7-9d6f-d8a7e3d8a26d';
  v_master uuid := '5c8fb418-b88c-4adb-9f11-59a6f2923637';
BEGIN
  IF v_ghost = v_master THEN
    RAISE EXCEPTION 'Abortado: IDs de ghost e Master não podem coincidir.';
  END IF;

  -- Estado esperado: fantasma existe com o e-mail liberado; Master real intocado.
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_ghost AND lower(email) = 'liberado-aurea-nov-2026@troca-interna.local'
  ) THEN
    RAISE EXCEPTION 'Estado inesperado: conta fantasma não encontrada com o e-mail esperado. Migração abortada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_master AND lower(email) = 'lptamborini@hotmail.com'
  ) THEN
    RAISE EXCEPTION 'Estado inesperado: conta Master real não encontrada. Migração abortada.';
  END IF;

  -- Já executada antes? Não repetir (idempotência).
  IF EXISTS (SELECT 1 FROM public.snapshot_ghost_delete_20261112 WHERE user_id = v_ghost) THEN
    RAISE NOTICE 'Backup já existente — seguindo para a exclusão.';
  ELSE
    -- Backup da linha completa de auth.users
    INSERT INTO public.snapshot_ghost_delete_20261112 (source_table, user_id, email, row_data)
    SELECT 'auth.users', id, lower(email), to_jsonb(u)
    FROM auth.users u WHERE id = v_ghost;

    -- Backup da linha completa de public.profiles
    INSERT INTO public.snapshot_ghost_delete_20261112 (source_table, user_id, email, row_data)
    SELECT 'public.profiles', id, lower(email), to_jsonb(p)
    FROM public.profiles p WHERE id = v_ghost;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Exclusão pontual (WHERE por ID exato)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_ghost uuid := 'e7832374-73ce-4ad7-9d6f-d8a7e3d8a26d';
  v_master uuid := '5c8fb418-b88c-4adb-9f11-59a6f2923637';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_ghost) THEN
    RAISE NOTICE 'Conta fantasma já removida — nada a fazer.';
    RETURN;
  END IF;

  -- Segurança extra: anula referências remanescentes de forma idempotente
  -- (não apaga nada, só desvincula). FKs já são SET NULL para histórico;
  -- aqui cobrimos as que eram CASCADE.
  UPDATE public.tasks SET requester_id = NULL WHERE requester_id = v_ghost;
  UPDATE public.tasks SET assignee_id = NULL WHERE assignee_id = v_ghost;
  UPDATE public.tasks SET previous_assignee_id = NULL WHERE previous_assignee_id = v_ghost;
  UPDATE public.tasks SET approved_by = NULL WHERE approved_by = v_ghost;
  UPDATE public.task_timeline SET user_id = NULL WHERE user_id = v_ghost;
  UPDATE public.audit_assignments SET assignee_id = NULL WHERE assignee_id = v_ghost;
  UPDATE public.user_plants SET user_id = NULL WHERE user_id = v_ghost;
  UPDATE public.requesters SET user_id = NULL WHERE user_id = v_ghost;
  UPDATE public.audit_logs SET user_id = NULL WHERE user_id = v_ghost;

  -- Remove o perfil público (FKs de public.* são SET NULL — histórico preservado).
  DELETE FROM public.profiles WHERE id = v_ghost;

  -- Remove a credencial de auth (cascade interno do GoTrue limpa auth.*).
  DELETE FROM auth.users WHERE id = v_ghost;

  RAISE NOTICE 'Conta fantasma e7832374 removida com backup em snapshot_ghost_delete_20261112.';
END $$;

-- ---------------------------------------------------------------------------
-- 3. Verificação: nada com o e-mail troca-interna.local em circulação
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(email) LIKE '%troca-interna.local%'
  ) OR EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) LIKE '%troca-interna.local%'
  ) THEN
    RAISE EXCEPTION 'Falha na verificação: ainda existem linhas com e-mail troca-interna.local.';
  END IF;
END $$;
