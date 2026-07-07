-- Add is_active column to inventory_products for soft delete (archiving)
ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Ensure existing rows have is_active = true
UPDATE public.inventory_products
SET is_active = true
WHERE is_active IS NULL;

-- Ensure RLS allows authenticated users to update is_active
-- The existing UPDATE policy already covers all columns, but let's make sure it's in place
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_update_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_update_inventory_products" ON public.inventory_products
  FOR UPDATE TO authenticated
  USING (client_id = get_user_client_id())
  WITH CHECK (client_id = get_user_client_id());
