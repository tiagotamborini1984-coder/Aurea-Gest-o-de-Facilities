DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID := '4db86cec-7623-406b-9aa6-b83132d84285'::UUID;
BEGIN
  -- 1. Ensure user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@aurea.com') THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone,
      phone_change,
      phone_change_token,
      reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'demo@aurea.com',
      crypt('Demo@123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "Administrador Demo", "role": "Master", "client_id": "4db86cec-7623-406b-9aa6-b83132d84285"}'::jsonb,
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '',
      NULL,
      '',
      '',
      ''
    );
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo@aurea.com' LIMIT 1;
    UPDATE auth.users
    SET
      encrypted_password = crypt('Demo@123', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = '{"name": "Administrador Demo", "role": "Master", "client_id": "4db86cec-7623-406b-9aa6-b83132d84285"}'::jsonb,
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  -- 2. Ensure profile exists and has the correct fields
  INSERT INTO public.profiles (
    id,
    client_id,
    name,
    email,
    role,
    accessible_menus,
    authorized_plants,
    force_password_change,
    feature_permissions
  ) VALUES (
    v_user_id,
    v_client_id,
    'Administrador Demo',
    'demo@aurea.com',
    'Master',
    '[]'::jsonb,
    '[]'::jsonb,
    false,
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    client_id = EXCLUDED.client_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    accessible_menus = EXCLUDED.accessible_menus,
    authorized_plants = EXCLUDED.authorized_plants,
    force_password_change = EXCLUDED.force_password_change;

  -- 3. Associate user with all 4 plants of Empresa Demo in public.user_plants
  INSERT INTO public.user_plants (user_id, plant_id)
  VALUES
    (v_user_id, 'c68f57fb-6257-49fa-a668-fa424f8e54ee'::UUID), -- Planta Alpha
    (v_user_id, 'c9ec792f-c6a6-420b-9cdd-71dae722a37a'::UUID), -- Planta Beta
    (v_user_id, 'e1af31e1-10b0-4fc0-b92e-a18bad45a52e'::UUID), -- Planta Gama
    (v_user_id, '6498476e-460a-46e5-ba52-a2e59fdeb585'::UUID)  -- Planta Delta
  ON CONFLICT (user_id, plant_id) DO NOTHING;

END $$;
