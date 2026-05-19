DO $$
DECLARE
  v_user_id uuid;
  v_client_id uuid;
BEGIN
  -- Insert user if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lptamborini@hotmail.com') THEN
    v_user_id := gen_random_uuid();
    v_client_id := gen_random_uuid();
    
    INSERT INTO public.clients (id, name, url_slug, status, modules)
    VALUES (v_client_id, 'Aurea Admin', 'aurea-admin-master', 'Ativo', '[]')
    ON CONFLICT (url_slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_client_id;
    
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
      crypt('Skip@Pass123!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin LPTamborini"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    
    -- Insert profile
    INSERT INTO public.profiles (id, email, name, role, client_id)
    VALUES (v_user_id, 'lptamborini@hotmail.com', 'Admin LPTamborini', 'Master', v_client_id)
    ON CONFLICT (id) DO UPDATE SET role = 'Master', client_id = v_client_id;
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'lptamborini@hotmail.com' LIMIT 1;
    
    -- Ensure client exists for this user or create one
    SELECT client_id INTO v_client_id FROM public.profiles WHERE id = v_user_id LIMIT 1;
    IF v_client_id IS NULL THEN
      SELECT id INTO v_client_id FROM public.clients LIMIT 1;
      IF v_client_id IS NULL THEN
        v_client_id := gen_random_uuid();
        INSERT INTO public.clients (id, name, url_slug, status, modules)
        VALUES (v_client_id, 'Aurea Admin Default', 'aurea-admin-default', 'Ativo', '[]');
      END IF;
      UPDATE public.profiles SET client_id = v_client_id WHERE id = v_user_id;
    END IF;

    -- Ensure user is Master
    UPDATE public.profiles SET role = 'Master' WHERE id = v_user_id;
  END IF;

  -- Insert dummy logs for the dashboard
  IF v_user_id IS NOT NULL AND v_client_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (id, client_id, user_id, action_type, details, created_at)
    VALUES 
      (gen_random_uuid(), v_client_id, v_user_id, 'Login', 'Usuário entrou no sistema', NOW() - INTERVAL '1 hour'),
      (gen_random_uuid(), v_client_id, v_user_id, 'Inclusão', 'Novo registro adicionado na tabela employees (ID: d9b2d63d-a233-4123-8c4d-a2b3c4d5e6f7)', NOW() - INTERVAL '2 hours'),
      (gen_random_uuid(), v_client_id, v_user_id, 'Atualização', 'Registro atualizado na tabela tasks (ID: a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6)', NOW() - INTERVAL '3 hours'),
      (gen_random_uuid(), v_client_id, v_user_id, 'Exclusão', 'Registro removido da tabela equipment (ID: f1e2d3c4-b5a6-9f8e-7d6c-5b4a3f2e1d0c)', NOW() - INTERVAL '4 hours')
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
