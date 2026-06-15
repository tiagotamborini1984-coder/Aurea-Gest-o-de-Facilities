DO $$
DECLARE
  v_client_id uuid;
  v_plant_id uuid;
  v_user_id uuid;
  v_plants_jsonb jsonb;
BEGIN
  -- 1. Ensure we have at least one client to link the plant to
  SELECT id INTO v_client_id FROM public.clients ORDER BY created_at LIMIT 1;
  
  IF v_client_id IS NULL THEN
    v_client_id := gen_random_uuid();
    INSERT INTO public.clients (id, name, cnpj)
    VALUES (v_client_id, 'Cliente Master', '00000000000000')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 2. Verify and correct the 'Sorriso' plant
  SELECT id INTO v_plant_id FROM public.plants WHERE name ILIKE '%Sorriso%' LIMIT 1;
  
  IF v_plant_id IS NULL THEN
    v_plant_id := gen_random_uuid();
    INSERT INTO public.plants (id, name, client_id)
    VALUES (v_plant_id, 'Sorriso', v_client_id);
  ELSE
    UPDATE public.plants
    SET client_id = v_client_id
    WHERE id = v_plant_id AND client_id IS NULL;
  END IF;

  -- 3. Ensure the test user exists in auth.users
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
      '{"name": "Lucas"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'lptamborini@hotmail.com' LIMIT 1;
  END IF;

  -- 4. Ensure the test user has access to this plant in their profile
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, name, role, is_admin)
    VALUES (v_user_id, 'lptamborini@hotmail.com', 'Lucas', 'admin', false)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    SELECT authorized_plants INTO v_plants_jsonb FROM public.profiles WHERE id = v_user_id;
    
    IF v_plants_jsonb IS NULL THEN
      v_plants_jsonb := '[]'::jsonb;
    END IF;

    IF NOT (v_plants_jsonb @> to_jsonb(v_plant_id::text)) THEN
      UPDATE public.profiles
      SET authorized_plants = (
        CASE 
          WHEN jsonb_typeof(authorized_plants) = 'array' THEN authorized_plants || to_jsonb(v_plant_id::text)
          ELSE jsonb_build_array(v_plant_id::text)
        END
      )
      WHERE id = v_user_id;
    END IF;
  END IF;
END $$;

-- 5. RLS Policy Audit for daily_logs
DROP POLICY IF EXISTS "daily_logs_insert" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_update" ON public.daily_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Allow authenticated users to update daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_select" ON public.daily_logs;

CREATE POLICY "daily_logs_select" ON public.daily_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_admin = true
        OR profiles.role IN ('Master', 'Administrador', 'admin')
        OR (profiles.authorized_plants IS NOT NULL AND profiles.authorized_plants @> to_jsonb(plant_id::text))
      )
    )
  );

CREATE POLICY "daily_logs_insert" ON public.daily_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_admin = true
        OR profiles.role IN ('Master', 'Administrador', 'admin')
        OR (profiles.authorized_plants IS NOT NULL AND profiles.authorized_plants @> to_jsonb(plant_id::text))
      )
    )
  );

CREATE POLICY "daily_logs_update" ON public.daily_logs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_admin = true
        OR profiles.role IN ('Master', 'Administrador', 'admin')
        OR (profiles.authorized_plants IS NOT NULL AND profiles.authorized_plants @> to_jsonb(plant_id::text))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_admin = true
        OR profiles.role IN ('Master', 'Administrador', 'admin')
        OR (profiles.authorized_plants IS NOT NULL AND profiles.authorized_plants @> to_jsonb(plant_id::text))
      )
    )
  );
