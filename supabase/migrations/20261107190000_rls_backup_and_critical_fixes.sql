-- Migration: Backup interno das policies de RLS atuais e correções Críticas 1 a 5
-- v0.0.1854 - Aurea Facilities

-- ============================================================================
-- PARTE 0: BACKUP INTERNO DAS POLICIES ATUAIS (REGRA PERMANENTE DO PROJETO)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.snapshot_rls_policies_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_tag text NOT NULL DEFAULT 'pre_rls_fixes_20261107',
  schemaname text NOT NULL,
  tablename text NOT NULL,
  policyname text NOT NULL,
  permissive text,
  roles text[],
  cmd text,
  qual text,
  with_check text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.snapshot_rls_policies_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snapshot_rls_policies_backup_master_only" ON public.snapshot_rls_policies_backup;
CREATE POLICY "snapshot_rls_policies_backup_master_only" ON public.snapshot_rls_policies_backup
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'Master');

-- Inserir snapshot das policies de todas as tabelas afetadas (e do schema público em geral)
INSERT INTO public.snapshot_rls_policies_backup (
  backup_tag, schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
)
SELECT
  'pre_rls_fixes_20261107',
  p.schemaname,
  p.tablename,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
FROM pg_policies p
WHERE p.schemaname = 'public'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ITEM 1: PROFILES
-- Vulnerabilidade: usuário comum podia executar UPDATE no próprio registro e alterar
-- campos críticos (role, client_id, accessible_menus, authorized_plants, feature_permissions).
-- Correção:
-- - Separar a policy "Profiles access" antiga em SELECT, INSERT, UPDATE, DELETE explícitos.
-- - Para UPDATE: Master pode tudo; Admin/Gestor do mesmo client pode atualizar usuários do mesmo client;
-- - O próprio usuário pode atualizar APENAS campos seguros (name, force_password_change).
--   Para garantir isso sem falhas de client, usamos um trigger BEFORE UPDATE + WITH CHECK.
-- ============================================================================

-- Trigger para bloquear auto-promoção e alteração de client/menus/plants pelo próprio usuário
CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_client_id uuid;
BEGIN
  -- Se chamado via service_role ou auth.uid() nulo, libera
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role, client_id INTO v_caller_role, v_caller_client_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- Master pode atualizar qualquer perfil e qualquer campo
  IF v_caller_role = 'Master' THEN
    RETURN NEW;
  END IF;

  -- Admin/Gestor atualizando outro usuário do mesmo cliente
  IF v_caller_role IN ('Administrador', 'Gestor') AND auth.uid() <> OLD.id THEN
    -- Admin/Gestor não pode promover ninguém a Master
    IF NEW.role = 'Master' AND OLD.role <> 'Master' THEN
      RAISE EXCEPTION 'Apenas usuários Master podem atribuir o perfil Master.';
    END IF;
    -- Admin/Gestor não pode mudar o client_id para outro cliente
    IF NEW.client_id IS DISTINCT FROM OLD.client_id AND NEW.client_id IS DISTINCT FROM v_caller_client_id THEN
      RAISE EXCEPTION 'Não é permitido transferir usuário para outro cliente.';
    END IF;
    RETURN NEW;
  END IF;

  -- Se o usuário está atualizando o PRÓPRIO perfil:
  IF auth.uid() = OLD.id THEN
    -- Não pode alterar role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Alteração de perfil/cargo (role) não permitida pelo próprio usuário.';
    END IF;
    -- Não pode alterar client_id
    IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
      RAISE EXCEPTION 'Alteração de cliente não permitida pelo próprio usuário.';
    END IF;
    -- Não pode alterar accessible_menus
    IF NEW.accessible_menus IS DISTINCT FROM OLD.accessible_menus THEN
      RAISE EXCEPTION 'Alteração de menus acessíveis não permitida pelo próprio usuário.';
    END IF;
    -- Não pode alterar authorized_plants
    IF NEW.authorized_plants IS DISTINCT FROM OLD.authorized_plants THEN
      RAISE EXCEPTION 'Alteração de plantas autorizadas não permitida pelo próprio usuário.';
    END IF;
    -- Não pode alterar feature_permissions
    IF NEW.feature_permissions IS DISTINCT FROM OLD.feature_permissions THEN
      RAISE EXCEPTION 'Alteração de permissões especiais não permitida pelo próprio usuário.';
    END IF;
    -- Não pode alterar id nem email por aqui
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Alteração de identificador ou e-mail de acesso não permitida diretamente.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_self_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_self_update();

-- Refatorar as policies de profiles
DROP POLICY IF EXISTS "Profiles access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_client" ON public.profiles;
DROP POLICY IF EXISTS "chamado_select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- SELECT: Master vê todos; Admin/Gestor/Operacional vê os do mesmo cliente; Usuário sempre vê o próprio
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR get_user_role() = 'Master'
    OR (client_id IS NOT NULL AND client_id = get_user_client_id())
  );

-- INSERT: Master pode criar qualquer; Admin/Gestor pode criar para o próprio client
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'Master'
    OR (
      get_user_role() IN ('Administrador', 'Gestor')
      AND client_id = get_user_client_id()
      AND role <> 'Master'
    )
  );

-- UPDATE: Master; Admin/Gestor para o próprio client; próprio usuário (com o trigger protegendo os campos)
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR get_user_role() = 'Master'
    OR (
      get_user_role() IN ('Administrador', 'Gestor')
      AND client_id = get_user_client_id()
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR get_user_role() = 'Master'
    OR (
      get_user_role() IN ('Administrador', 'Gestor')
      AND client_id = get_user_client_id()
    )
  );

-- DELETE: Master; Admin para o próprio client (não pode deletar a si mesmo)
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    get_user_role() = 'Master'
    OR (
      get_user_role() = 'Administrador'
      AND client_id = get_user_client_id()
      AND id <> auth.uid()
    )
  );

-- ============================================================================
-- ITEM 2: TASK_TIMELINE
-- Vulnerabilidade: generic_access_task_timeline, authenticated_select_tl,
-- authenticated_insert_tl, authenticated_delete_tl usavam USING true / WITH CHECK true.
-- Correção: isolar pelo client_id da task relacionada.
-- ============================================================================
DROP POLICY IF EXISTS "generic_access_task_timeline" ON public.task_timeline;
DROP POLICY IF EXISTS "authenticated_select_tl" ON public.task_timeline;
DROP POLICY IF EXISTS "authenticated_insert_tl" ON public.task_timeline;
DROP POLICY IF EXISTS "authenticated_delete_tl" ON public.task_timeline;
DROP POLICY IF EXISTS "task_timeline_select_policy" ON public.task_timeline;
DROP POLICY IF EXISTS "task_timeline_insert_policy" ON public.task_timeline;
DROP POLICY IF EXISTS "task_timeline_delete_policy" ON public.task_timeline;

CREATE POLICY "task_timeline_select_policy" ON public.task_timeline
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'Master'
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_timeline.task_id
        AND t.client_id = get_user_client_id()
    )
  );

CREATE POLICY "task_timeline_insert_policy" ON public.task_timeline
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'Master'
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_timeline.task_id
        AND t.client_id = get_user_client_id()
    )
  );

CREATE POLICY "task_timeline_delete_policy" ON public.task_timeline
  FOR DELETE TO authenticated
  USING (
    get_user_role() = 'Master'
    OR user_id = auth.uid()
    OR (
      get_user_role() IN ('Administrador', 'Gestor')
      AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_timeline.task_id
          AND t.client_id = get_user_client_id()
      )
    )
  );

-- ============================================================================
-- ITEM 3: TRAINING_VERIFICATION_JOBS
-- Vulnerabilidade: "Allow authenticated full access on training_verification_jobs" USING true.
-- Correção: isolar por client_id da linha = get_user_client_id() ou Master.
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated full access on training_verification_jobs" ON public.training_verification_jobs;
DROP POLICY IF EXISTS "training_verification_jobs_tenant_isolation" ON public.training_verification_jobs;

CREATE POLICY "training_verification_jobs_tenant_isolation" ON public.training_verification_jobs
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'Master'
    OR client_id = get_user_client_id()
  )
  WITH CHECK (
    get_user_role() = 'Master'
    OR client_id = get_user_client_id()
  );

-- ============================================================================
-- ITEM 4: PACKAGES
-- Vulnerabilidade: "Allow authenticated full access on packages" com USING true
-- anulava a política restritiva "plant_isolation_packages".
-- Correção: remover a policy permissiva e manter/reforçar plant_isolation_packages.
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated full access on packages" ON public.packages;

-- ============================================================================
-- ITEM 5: USER_PLANTS
-- Vulnerabilidade: user_plants_select, insert, update, delete todas com USING true.
-- Correção:
-- - SELECT: Master, ou a própria vinculação do usuário (user_id = auth.uid()),
--   ou Admin/Gestor visualizando vínculos do seu cliente (via plant_id -> plants.client_id).
-- - INSERT/UPDATE/DELETE: Master ou Admin do mesmo cliente da planta.
-- ============================================================================
DROP POLICY IF EXISTS "user_plants_select" ON public.user_plants;
DROP POLICY IF EXISTS "user_plants_insert" ON public.user_plants;
DROP POLICY IF EXISTS "user_plants_update" ON public.user_plants;
DROP POLICY IF EXISTS "user_plants_delete" ON public.user_plants;
DROP POLICY IF EXISTS "user_plants_select_policy" ON public.user_plants;
DROP POLICY IF EXISTS "user_plants_modify_policy" ON public.user_plants;

CREATE POLICY "user_plants_select_policy" ON public.user_plants
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'Master'
    OR user_id = auth.uid()
    OR (
      get_user_role() IN ('Administrador', 'Gestor')
      AND EXISTS (
        SELECT 1 FROM public.plants p
        WHERE p.id = user_plants.plant_id
          AND p.client_id = get_user_client_id()
      )
    )
  );

CREATE POLICY "user_plants_modify_policy" ON public.user_plants
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'Master'
    OR (
      get_user_role() = 'Administrador'
      AND EXISTS (
        SELECT 1 FROM public.plants p
        WHERE p.id = user_plants.plant_id
          AND p.client_id = get_user_client_id()
      )
    )
  )
  WITH CHECK (
    get_user_role() = 'Master'
    OR (
      get_user_role() = 'Administrador'
      AND EXISTS (
        SELECT 1 FROM public.plants p
        WHERE p.id = user_plants.plant_id
          AND p.client_id = get_user_client_id()
      )
    )
  );
