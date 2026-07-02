-- Ensure RLS policies on inventory_products for authenticated insert/select
-- This migration is idempotent and ensures tenant isolation

-- Ensure RLS is enabled
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

-- Drop old open policies if they exist
DROP POLICY IF EXISTS "inventory_products_select" ON public.inventory_products;
DROP POLICY IF EXISTS "inventory_products_all" ON public.inventory_products;

-- Ensure tenant-isolated SELECT policy
DROP POLICY IF EXISTS "authenticated_select_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_select_inventory_products" ON public.inventory_products
  FOR SELECT TO authenticated USING (client_id = public.get_user_client_id());

-- Ensure tenant-isolated INSERT policy
DROP POLICY IF EXISTS "authenticated_insert_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_insert_inventory_products" ON public.inventory_products
  FOR INSERT TO authenticated WITH CHECK (client_id = public.get_user_client_id());

-- Ensure tenant-isolated UPDATE policy
DROP POLICY IF EXISTS "authenticated_update_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_update_inventory_products" ON public.inventory_products
  FOR UPDATE TO authenticated USING (client_id = public.get_user_client_id()) WITH CHECK (client_id = public.get_user_client_id());

-- Ensure tenant-isolated DELETE policy
DROP POLICY IF EXISTS "authenticated_delete_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_delete_inventory_products" ON public.inventory_products
  FOR DELETE TO authenticated USING (client_id = public.get_user_client_id());

-- Ensure RLS on inventory_categories
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
