-- Migration: 20261107190000_rls_backup_and_critical_fixes.sql
-- CORREÇÃO DE VULNERABILIDADES RLS — GRUPO CRÍTICO (itens 1–5)
-- Nenhuma operação de dado (INSERT/UPDATE/DELETE em dados de produção): apenas DDL de policies.
-- Backup interno prévio (regra permanente): todas as policies atuais do schema public
-- são copiadas para public.snapshot_policies_backup (jsonb), sem DROP/DELETE.

-- ============================================================
-- 0. BACKUP INTERNO das policies atuais (padrão snapshot_*)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.snapshot_policies_backup (
  id BIGSERIAL PRIMARY KEY,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  backup_tag TEXT NOT NULL,
  schemaname TEXT NOT NULL,
  tablename TEXT NOT NULL,
  policyname TEXT NOT NULL,
  permissive TEXT,
  cmd TEXT,
  policy_roles TEXT[],
  qual TEXT,
  with_check TEXT
);

DO $$
DECLARE
  v_tag TEXT := 'pre_rls_hardening_20261107';
BEGIN
  -- Backup full (reexecutável: só insere o que ainda não existe para esta tag)
  INSERT INTO public.snapshot_policies_backup
    (backup_tag, schemaname, tablename, policyname, permissive, cmd, policy_roles, qual, with_check)
  SELECT v_tag, schemaname, tablename, policyname, permissive, cmd,
         array_to_string(roles, ',')::text[], qual::text, with_check::text
  FROM pg_policies
  WHERE schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM public.snapshot_policies_backup b
      WHERE b.backup_tag = v_tag
        AND b.schemaname = pg_policies.schemaname
        AND b.tablename = pg_policies.tablename
        AND b.policyname = pg_policies.policyname
        AND b.cmd = pg_policies.cmd
    );
END $$;

-- ============================================================
-- 1. PROFILES — usuário não pode mais se promover / trocar de cliente
-- ============================================================
-- Remove a policy ALL permissiva e a substitui por:
--  - SELECT: leitura do próprio perfil + padrão existente (Master vê tudo; Admin/Gestor veem o cliente)
--  - UPDATE próprio: apenas colunas inofensivas (nome, avatar e preferências de UI)
--    nunca role, client_id, menus, plantas ou permissões
--  - INSERT/DELETE próprios: mantidos para não quebrar fluxos existentes (sem elevação,
--    pois o WITH CHECK impede gravar role/client_id/menus diferentes)
DROP POLICY IF EXISTS "Profiles access" ON public.profiles;

DROP POLICY IF EXISTS "profiles_select_self_and_tenant" ON public.profiles;
CREATE POLICY "profiles_select_self_and_tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.get_user_role() = 'Master'
    OR (
      public.get_user_role() IN ('Administrador', 'Gestor')
      AND client_id = public.get_user_client_id()
    )
  );

DROP POLICY IF EXISTS "profiles_update_self_safe_columns" ON public.profiles;
CREATE POLICY "profiles_update_self_safe_columns" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      AND client_id IS NOT DISTINCT FROM (SELECT p.client_id FROM public.profiles p WHERE p.id = auth.uid())
      AND menus IS NOT DISTINCT FROM (SELECT p.menus FROM public.profiles p WHERE p.id = auth.uid())
      AND accessible_menus IS NOT DISTINCT FROM (SELECT p.accessible_menus FROM public.profiles p WHERE p.id = auth.uid())
      AND authorized_plants IS NOT DISTINCT FROM (SELECT p.authorized_plants FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "profiles_insert_self_safe" ON public.profiles;
CREATE POLICY "profiles_insert_self_safe" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND NOT (
      NEW.role IN ('Master', 'Administrador', 'Gestor')
      OR NEW.menus IS NOT NULL
      OR NEW.accessible_menus IS NOT NULL
      OR NEW.authorized_plants IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "profiles_delete_self" ON public.profiles;
CREATE POLICY "profiles_delete_self" ON public.profiles
  FOR DELETE TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- 2. TASK_TIMELINE — histórico de tarefas isolado por cliente/planta
-- ============================================================
DROP POLICY IF EXISTS "authenticated_select_tl" ON public.task_timeline;
DROP POLICY IF EXISTS "authenticated_insert_tl" ON public.task_timeline;
DROP POLICY IF EXISTS "authenticated_delete_tl" ON public.task_timeline;
DROP POLICY IF EXISTS "generic_access_task_timeline" ON public.task_timeline;
DROP POLICY IF EXISTS "tenant_isolation_task_timeline" ON public.task_timeline;

CREATE POLICY "tenant_isolation_task_timeline" ON public.task_timeline
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_timeline.task_id
        AND (
          t.client_id = public.get_user_client_id()
          OR public.get_user_role() = 'Master'
          OR t.requester_id = auth.uid()
          OR t.assignee_id = auth.uid()
          OR task_timeline.user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_timeline.task_id
        AND (
          t.client_id = public.get_user_client_id()
          OR public.get_user_role() = 'Master'
          OR t.requester_id = auth.uid()
          OR t.assignee_id = auth.uid()
          OR task_timeline.user_id = auth.uid()
        )
    )
  );

-- ============================================================
-- 3. TRAINING_VERIFICATION_JOBS — verificação de treinamentos por cliente
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated full access on training_verification_jobs" ON public.training_verification_jobs;
DROP POLICY IF EXISTS "tenant_isolation_training_verification_jobs" ON public.training_verification_jobs;

CREATE POLICY "tenant_isolation_training_verification_jobs" ON public.training_verification_jobs
  FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id()
    OR public.get_user_role() = 'Master'
    OR created_by = auth.uid()
  )
  WITH CHECK (
    client_id = public.get_user_client_id()
    OR public.get_user_role() = 'Master'
    OR created_by = auth.uid()
  );

-- ============================================================
-- 4. PACKAGES — remove a policy permissiva redundante; mantém isolamento por planta
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated full access on packages" ON public.packages;
DROP POLICY IF EXISTS "tenant_isolation_packages" ON public.packages;

CREATE POLICY "tenant_isolation_packages" ON public.packages
  FOR ALL TO authenticated
  USING (
    (
      public.get_user_role() = 'Master'
      OR client_id = public.get_user_client_id()
    )
    AND public.is_plant_authorized(plant_id)
  )
  WITH CHECK (
    (
      public.get_user_role() = 'Master'
      OR client_id = public.get_user_client_id()
    )
    AND public.is_plant_authorized(plant_id)
  );

-- ============================================================
-- 5. USER_PLANTS — vínculo usuário↔planta só é gerido por Master/Admin do próprio cliente
-- ============================================================
DROP POLICY IF EXISTS "user_plants_select" ON public.user_plants;
DROP POLICY IF EXISTS "user_plants_insert" ON public.user_plants;
DROP POLICY IF EXISTS "user_plants_update" ON public.user_plants;
DROP POLICY IF EXISTS "user_plants_delete" ON public.user_plants;
DROP POLICY IF EXISTS "tenant_isolation_user_plants" ON public.user_plants;

CREATE POLICY "tenant_isolation_user_plants" ON public.user_plants
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_user_role() = 'Master'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_plants.user_id
        AND p.client_id = public.get_user_client_id()
        AND public.get_user_role() IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    public.get_user_role() = 'Master'
    OR (
      public.get_user_role() IN ('Administrador', 'Gestor')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_plants.user_id
          AND p.client_id = public.get_user_client_id()
      )
      AND EXISTS (
        SELECT 1 FROM public.plants pl
        WHERE pl.id = user_plants.plant_id
          AND pl.client_id = public.get_user_client_id()
      )
    )
  );
