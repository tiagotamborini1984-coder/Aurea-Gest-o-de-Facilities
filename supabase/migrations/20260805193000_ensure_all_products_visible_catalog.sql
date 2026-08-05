-- Ensure ALL inventory products are visible in the Product Catalog
-- Fixes: is_active = false/NULL, client_id = NULL, category mismatches
-- Idempotent: safe to run multiple times
-- Does NOT delete, duplicate, or rename any existing product

-- 1. Set is_active = true for ALL products where it is not true
UPDATE public.inventory_products
SET is_active = true, updated_at = COALESCE(updated_at, NOW())
WHERE is_active IS DISTINCT FROM true;

-- 2. Fix products with NULL client_id — assign to the first client (oldest)
UPDATE public.inventory_products
SET client_id = (SELECT id FROM public.clients ORDER BY created_at LIMIT 1)
WHERE client_id IS NULL;

-- 3. Clean category values: remove invisible characters, normalize spaces
UPDATE public.inventory_products
SET category = public.clean_category_name(category), updated_at = NOW()
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM public.clean_category_name(category);

UPDATE public.inventory_products
SET category = NULL, updated_at = NOW()
WHERE category IS NOT NULL AND TRIM(category) = '';

-- 4. Match product categories to existing inventory_categories exactly
UPDATE public.inventory_products p
SET category = c.name, updated_at = NOW()
FROM public.inventory_categories c
WHERE p.category IS NOT NULL
  AND p.client_id IS NOT DISTINCT FROM c.client_id
  AND public.normalize_category_text(p.category) = public.normalize_category_text(c.name)
  AND p.category IS DISTINCT FROM c.name;

-- 5. Ensure RLS policies allow authenticated users to see their client's products
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

-- 6. Validate fix using the diagnostic view
DO $$
DECLARE
  v_total integer;
  v_active integer;
  v_null_client integer;
  v_null_category integer;
  v_hidden_inactive integer;
  v_hidden_no_client integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.inventory_products;
  SELECT COUNT(*) INTO v_active FROM public.inventory_products WHERE is_active = true;
  SELECT COUNT(*) INTO v_null_client FROM public.inventory_products WHERE client_id IS NULL;
  SELECT COUNT(*) INTO v_null_category FROM public.inventory_products WHERE category IS NULL;
  SELECT COUNT(*) INTO v_hidden_inactive FROM public.inventory_products WHERE is_active IS NOT TRUE;
  SELECT COUNT(*) INTO v_hidden_no_client FROM public.inventory_products WHERE client_id IS NULL;

  RAISE NOTICE '===== CATALOG VISIBILITY FIX REPORT =====';
  RAISE NOTICE 'Total products:         %', v_total;
  RAISE NOTICE 'Active (is_active=true): %', v_active;
  RAISE NOTICE 'NULL client_id:         %', v_null_client;
  RAISE NOTICE 'NULL category:          %', v_null_category;
  RAISE NOTICE 'Hidden (inactive):      %', v_hidden_inactive;
  RAISE NOTICE 'Hidden (no client):     %', v_hidden_no_client;
  RAISE NOTICE '===========================================';
END $$;
