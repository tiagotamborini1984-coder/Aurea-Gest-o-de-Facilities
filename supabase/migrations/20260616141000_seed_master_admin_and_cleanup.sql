DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed master user if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lptamborini@hotmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'lptamborini@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin Master"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL,
      '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, is_admin)
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'Admin Master', true)
    ON CONFLICT (id) DO UPDATE SET is_admin = true;
  ELSE
    -- If user already exists, ensure admin status
    UPDATE public.profiles 
    SET is_admin = true
    WHERE email = 'lptamborini@hotmail.com';
  END IF;
  
  -- Cleanup duplicate employees if the function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_duplicate_employees') THEN
    PERFORM cleanup_duplicate_employees();
  END IF;
END $$;
