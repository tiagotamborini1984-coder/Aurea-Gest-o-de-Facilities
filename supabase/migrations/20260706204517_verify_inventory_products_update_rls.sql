-- Verify and ensure RLS UPDATE policy exists for inventory_products
-- This migration is idempotent and safe to run multiple times

-- Ensure RLS is enabled
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

-- Drop existing update policies to recreate cleanly
DROP POLICY IF EXISTS "authenticated_update_inventory_products" ON public.inventory_products;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.inventory_products;

-- Create UPDATE policy allowing authenticated users to update rows belonging to their client
CREATE POLICY "authenticated_update_inventory_products" ON public.inventory_products
  FOR UPDATE TO authenticated 
  USING (client_id = get_user_client_id()) 
  WITH CHECK (client_id = get_user_client_id());

-- Also ensure SELECT, INSERT, DELETE policies are in place (idempotent)
DROP POLICY IF EXISTS "authenticated_select_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_select_inventory_products" ON public.inventory_products
  FOR SELECT TO authenticated USING (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_insert_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_insert_inventory_products" ON public.inventory_products
  FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_delete_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_delete_inventory_products" ON public.inventory_products
  FOR DELETE TO authenticated USING (client_id = get_user_client_id());
