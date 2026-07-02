-- Ensure seed user exists for testing
DO $$
DECLARE
  v_user_id uuid;
  v_client_id uuid;
BEGIN
  -- Get the first client for testing
  SELECT id INTO v_client_id FROM public.clients ORDER BY created_at LIMIT 1;

  IF v_client_id IS NULL THEN
    v_client_id := gen_random_uuid();
    INSERT INTO public.clients (id, name, url_slug, status)
    VALUES (v_client_id, 'Cliente Teste', 'cliente-teste', 'Ativo')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'lptamborini@hotmail.com';

  IF v_user_id IS NULL THEN
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
      '{"name": "Lucas Tamborini"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;

  -- Ensure profile exists with correct client_id and role
  INSERT INTO public.profiles (id, email, name, role, client_id)
  VALUES (v_user_id, 'lptamborini@hotmail.com', 'Lucas Tamborini', 'Administrador', v_client_id)
  ON CONFLICT (id) DO UPDATE SET
    client_id = EXCLUDED.client_id,
    role = EXCLUDED.role;
END $$;

-- Clean up old open policies on inventory_products and ensure tenant-isolated policies
DROP POLICY IF EXISTS "inventory_products_select" ON public.inventory_products;
DROP POLICY IF EXISTS "inventory_products_all" ON public.inventory_products;

DROP POLICY IF EXISTS "authenticated_select_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_select_inventory_products" ON public.inventory_products
  FOR SELECT TO authenticated USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_insert_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_insert_inventory_products" ON public.inventory_products
  FOR INSERT TO authenticated WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_update_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_update_inventory_products" ON public.inventory_products
  FOR UPDATE TO authenticated USING (client_id = public.get_user_client_id()) WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_delete_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_delete_inventory_products" ON public.inventory_products
  FOR DELETE TO authenticated USING (client_id = public.get_user_client_id());
