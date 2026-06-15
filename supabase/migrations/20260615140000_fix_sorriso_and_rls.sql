DO $$
DECLARE
  v_client_id uuid;
  v_plant_id uuid;
  v_user_id uuid;
BEGIN
  -- 1. Obter ou criar um client base
  SELECT id INTO v_client_id FROM public.clients ORDER BY created_at LIMIT 1;
  IF v_client_id IS NULL THEN
    v_client_id := gen_random_uuid();
    INSERT INTO public.clients (id, name, document, status)
    VALUES (v_client_id, 'Aurea Client', '00000000000000', 'Ativo')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 2. Garantir planta Sorriso corretamente associada
  SELECT id INTO v_plant_id FROM public.plants WHERE name ILIKE '%Sorriso%' LIMIT 1;
  IF v_plant_id IS NULL THEN
    v_plant_id := gen_random_uuid();
    INSERT INTO public.plants (id, client_id, name, status)
    VALUES (v_plant_id, v_client_id, 'Sorriso', 'Ativo')
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.plants SET client_id = v_client_id WHERE id = v_plant_id;
  END IF;

  -- 3. Seed user requerido no critério de aceite
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lptamborini@hotmail.com') THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'lptamborini@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "LP Tamborini"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'lptamborini@hotmail.com';
  END IF;

  -- 4. Atualizar o profile com permissão de Admin e acesso à planta Sorriso
  INSERT INTO public.profiles (id, email, name, is_admin, client_id, authorized_plants)
  VALUES (v_user_id, 'lptamborini@hotmail.com', 'LP Tamborini', true, v_client_id, ARRAY[v_plant_id])
  ON CONFLICT (id) DO UPDATE
  SET client_id = v_client_id,
      is_admin = true,
      authorized_plants = CASE
        WHEN public.profiles.authorized_plants IS NULL THEN ARRAY[v_plant_id]
        WHEN NOT (v_plant_id = ANY(public.profiles.authorized_plants)) THEN array_append(public.profiles.authorized_plants, v_plant_id)
        ELSE public.profiles.authorized_plants
      END;

END $$;

-- 5. Função segura de validação de autorização da Planta
CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_plant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_auth_plants UUID[];
    v_user_client_id UUID;
    v_plant_client_id UUID;
BEGIN
    SELECT is_admin, authorized_plants, client_id INTO v_is_admin, v_auth_plants, v_user_client_id
    FROM public.profiles
    WHERE id = auth.uid();

    SELECT client_id INTO v_plant_client_id
    FROM public.plants
    WHERE id = p_plant_id;

    -- Bloquear se houver cross-client violation
    IF v_user_client_id IS NOT NULL AND v_plant_client_id IS NOT NULL AND v_user_client_id != v_plant_client_id THEN
        RETURN FALSE;
    END IF;

    -- Admins da mesma empresa (já validado acima)
    IF v_is_admin THEN
        RETURN TRUE;
    END IF;

    -- Membros autorizados
    IF v_auth_plants IS NOT NULL AND p_plant_id = ANY(v_auth_plants) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Refinamento de RLS de daily_logs permitindo INSERT/UPDATE para colaboradores da planta
DROP POLICY IF EXISTS "authenticated_select_daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can view daily logs of their client" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can view daily logs" ON public.daily_logs;

CREATE POLICY "authenticated_select_daily_logs" ON public.daily_logs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can create daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can insert daily logs" ON public.daily_logs;

CREATE POLICY "authenticated_insert_daily_logs" ON public.daily_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_plant_authorized(plant_id));

DROP POLICY IF EXISTS "authenticated_update_daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can update daily logs" ON public.daily_logs;

CREATE POLICY "authenticated_update_daily_logs" ON public.daily_logs
  FOR UPDATE TO authenticated USING (public.is_plant_authorized(plant_id)) WITH CHECK (public.is_plant_authorized(plant_id));

DROP POLICY IF EXISTS "authenticated_delete_daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can delete daily logs" ON public.daily_logs;

CREATE POLICY "authenticated_delete_daily_logs" ON public.daily_logs
  FOR DELETE TO authenticated USING (public.is_plant_authorized(plant_id));

