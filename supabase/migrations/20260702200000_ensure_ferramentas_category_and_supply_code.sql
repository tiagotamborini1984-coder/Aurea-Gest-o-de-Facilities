-- Ensure "Ferramentas" category exists, populate supply_code for imported items, and verify RLS policies
-- Idempotent: safe to run multiple times

-- Step 1: Ensure "Ferramentas" category exists for all clients
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM public.clients LOOP
    INSERT INTO public.inventory_categories (client_id, name)
    VALUES (c.id, 'Ferramentas')
    ON CONFLICT (client_id, name) DO NOTHING;
  END LOOP;
END $$;

-- Step 2: Populate supply_code for Ferramentas products where supply_code is NULL
-- The existing import used fs_code as the provider/supply code
UPDATE public.inventory_products
SET supply_code = fs_code
WHERE category = 'Ferramentas'
  AND supply_code IS NULL
  AND fs_code IS NOT NULL
  AND fs_code != '';

-- Step 3: Ensure all Ferramentas products have the exact category string 'Ferramentas'
-- (case-insensitive fix for any mismatches)
UPDATE public.inventory_products
SET category = 'Ferramentas'
WHERE category ILIKE 'ferramentas'
  AND category != 'Ferramentas';

-- Step 4: Verify RLS policies on inventory_products
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

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

-- Step 5: Verify RLS policies on inventory_categories
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_inventory_categories" ON public.inventory_categories;
CREATE POLICY "authenticated_select_inventory_categories" ON public.inventory_categories
  FOR SELECT TO authenticated USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_insert_inventory_categories" ON public.inventory_categories;
CREATE POLICY "authenticated_insert_inventory_categories" ON public.inventory_categories
  FOR INSERT TO authenticated WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_update_inventory_categories" ON public.inventory_categories;
CREATE POLICY "authenticated_update_inventory_categories" ON public.inventory_categories
  FOR UPDATE TO authenticated USING (client_id = public.get_user_client_id()) WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_delete_inventory_categories" ON public.inventory_categories;
CREATE POLICY "authenticated_delete_inventory_categories" ON public.inventory_categories
  FOR DELETE TO authenticated USING (client_id = public.get_user_client_id());

-- Migration completed successfully
