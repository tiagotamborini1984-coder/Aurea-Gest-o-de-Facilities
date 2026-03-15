-- Ensure we have an Administrador user fully compatible with auth.users requirements
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  demo_client_id uuid;
BEGIN
  -- Get the first client or create one
  SELECT id INTO demo_client_id FROM public.clients LIMIT 1;
  IF demo_client_id IS NULL THEN
    demo_client_id := gen_random_uuid();
    INSERT INTO public.clients (id, name, url_slug, admin_name) VALUES (demo_client_id, 'Aurea', 'aurea', 'Administrador');
  END IF;

  -- Create or Update Admin User
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@aurea.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      admin_id, '00000000-0000-0000-0000-000000000000', 'admin@aurea.com',
      crypt('AureaAdmin2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Administrador Sistema"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    -- Wait a moment for trigger if any, though DO block is atomic
    -- Upsert profile to ensure Administrador role
    INSERT INTO public.profiles (id, email, name, role, client_id) 
    VALUES (admin_id, 'admin@aurea.com', 'Administrador Sistema', 'Administrador', demo_client_id)
    ON CONFLICT (id) DO UPDATE SET role = 'Administrador', client_id = demo_client_id;
  ELSE
    -- Update existing profile to Administrador
    UPDATE public.profiles
    SET role = 'Administrador', client_id = COALESCE(client_id, demo_client_id)
    WHERE email = 'admin@aurea.com';
    
    -- Ensure any existing 'Master' users are converted to 'Administrador'
    UPDATE public.profiles
    SET role = 'Administrador'
    WHERE role = 'Master';
  END IF;
END $$;
