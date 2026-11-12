-- Módulo "Chaves API" atribuível por perfil (menu) — /admin/api-keys
-- Perfis Gestor/Operacional com 'Chaves API' em profiles.accessible_menus e do
-- mesmo cliente ganham acesso CRUD às chaves, mantendo o isolamento por tenant.
-- Master/Administrador continuam com acesso pleno (comportamento anterior).

DROP POLICY IF EXISTS "he_api_keys_select" ON public.horas_extras_api_keys;
CREATE POLICY "he_api_keys_select" ON public.horas_extras_api_keys
  FOR SELECT TO authenticated
  USING (
    (get_user_role() = 'Master'::text)
    OR ((get_user_role() = 'Administrador'::text) AND (client_id = get_user_client_id()))
    OR (
      (get_user_role() IN ('Gestor'::text, 'Operacional'::text))
      AND (client_id = get_user_client_id())
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.accessible_menus ? 'Chaves API'
      )
    )
  );

DROP POLICY IF EXISTS "he_api_keys_insert" ON public.horas_extras_api_keys;
CREATE POLICY "he_api_keys_insert" ON public.horas_extras_api_keys
  FOR INSERT TO authenticated
  WITH CHECK (
    (get_user_role() = 'Master'::text)
    OR ((get_user_role() = 'Administrador'::text) AND (client_id = get_user_client_id()))
    OR (
      (get_user_role() IN ('Gestor'::text, 'Operacional'::text))
      AND (client_id = get_user_client_id())
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.accessible_menus ? 'Chaves API'
      )
    )
  );

DROP POLICY IF EXISTS "he_api_keys_update" ON public.horas_extras_api_keys;
CREATE POLICY "he_api_keys_update" ON public.horas_extras_api_keys
  FOR UPDATE TO authenticated
  USING (
    (get_user_role() = 'Master'::text)
    OR ((get_user_role() = 'Administrador'::text) AND (client_id = get_user_client_id()))
    OR (
      (get_user_role() IN ('Gestor'::text, 'Operacional'::text))
      AND (client_id = get_user_client_id())
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.accessible_menus ? 'Chaves API'
      )
    )
  )
  WITH CHECK (
    (get_user_role() = 'Master'::text)
    OR ((get_user_role() = 'Administrador'::text) AND (client_id = get_user_client_id()))
    OR (
      (get_user_role() IN ('Gestor'::text, 'Operacional'::text))
      AND (client_id = get_user_client_id())
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.accessible_menus ? 'Chaves API'
      )
    )
  );

DROP POLICY IF EXISTS "he_api_keys_delete" ON public.horas_extras_api_keys;
CREATE POLICY "he_api_keys_delete" ON public.horas_extras_api_keys
  FOR DELETE TO authenticated
  USING (
    (get_user_role() = 'Master'::text)
    OR ((get_user_role() = 'Administrador'::text) AND (client_id = get_user_client_id()))
    OR (
      (get_user_role() IN ('Gestor'::text, 'Operacional'::text))
      AND (client_id = get_user_client_id())
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.accessible_menus ? 'Chaves API'
      )
    )
  );
