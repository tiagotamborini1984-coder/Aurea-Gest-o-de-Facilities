-- Migration: Fix inventory products visibility, normalize data and codes (806716, 811741, 513619, 521612, 818322)
-- Idempotent script

-- 1. Seed administrative user lptamborini@hotmail.com if not present
DO $$
DECLARE
  v_user_id uuid;
  v_client_id uuid;
BEGIN
  -- Get default client_id
  SELECT id INTO v_client_id FROM public.clients ORDER BY created_at ASC LIMIT 1;

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
      '{"name": "Tiago Tamborini"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    IF v_client_id IS NOT NULL THEN
      INSERT INTO public.profiles (
        id, email, name, role, client_id, force_password_change
      ) VALUES (
        v_user_id,
        'lptamborini@hotmail.com',
        'Tiago Tamborini',
        'Master',
        v_client_id,
        false
      ) ON CONFLICT (id) DO UPDATE SET
        role = 'Master',
        client_id = EXCLUDED.client_id;
    END IF;
  END IF;
END $$;

-- 2. Ensure all products in inventory_products have a valid client_id assigned
UPDATE public.inventory_products
SET client_id = (SELECT id FROM public.clients ORDER BY created_at ASC LIMIT 1)
WHERE client_id IS NULL;

-- 3. Set is_active = true for ALL products in inventory_products
UPDATE public.inventory_products
SET is_active = true, updated_at = NOW()
WHERE is_active IS DISTINCT FROM true;

-- 4. Specifically target and guarantee visibility for product codes:
-- '806716', '811741', '513619', '521612', '818322'
UPDATE public.inventory_products
SET 
  is_active = true,
  fs_code = TRIM(fs_code),
  supply_code = TRIM(supply_code),
  category = TRIM(REGEXP_REPLACE(COALESCE(category, ''), '[\r\n\t]+', ' ', 'g')),
  updated_at = NOW()
WHERE 
  TRIM(fs_code) IN ('806716', '811741', '513619', '521612', '818322')
  OR TRIM(supply_code) IN ('806716', '811741', '513619', '521612', '818322');

-- 5. Normalize category strings across all inventory_products
UPDATE public.inventory_products
SET category = TRIM(REGEXP_REPLACE(category, '[\r\n\t]+', ' ', 'g')), updated_at = NOW()
WHERE category IS NOT NULL AND category ~ '[\r\n\t]';

UPDATE public.inventory_products
SET category = TRIM(category), updated_at = NOW()
WHERE category IS NOT NULL AND category IS DISTINCT FROM TRIM(category);

UPDATE public.inventory_products
SET category = NULL, updated_at = NOW()
WHERE category IS NOT NULL AND TRIM(category) = '';

-- Trim fs_code and supply_code across all products
UPDATE public.inventory_products
SET fs_code = TRIM(fs_code), updated_at = NOW()
WHERE fs_code IS NOT NULL AND fs_code IS DISTINCT FROM TRIM(fs_code);

UPDATE public.inventory_products
SET supply_code = TRIM(supply_code), updated_at = NOW()
WHERE supply_code IS NOT NULL AND supply_code IS DISTINCT FROM TRIM(supply_code);

-- 6. Ensure RLS policies on inventory_products allow authenticated users to SELECT, INSERT, UPDATE, DELETE with client isolation
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_select_inventory_products" ON public.inventory_products
  FOR SELECT TO authenticated USING (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_insert_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_insert_inventory_products" ON public.inventory_products
  FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_update_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_update_inventory_products" ON public.inventory_products
  FOR UPDATE TO authenticated USING (client_id = get_user_client_id())
  WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_delete_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_delete_inventory_products" ON public.inventory_products
  FOR DELETE TO authenticated USING (client_id = get_user_client_id());
