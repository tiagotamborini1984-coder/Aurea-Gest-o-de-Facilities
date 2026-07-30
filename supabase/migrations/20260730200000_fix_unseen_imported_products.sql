-- Fix unseen imported products: normalize supply_code, fs_code, categories, is_active
-- Idempotent: safe to run multiple times

-- 1. Ensure is_active = true for all products
UPDATE public.inventory_products
SET is_active = true, updated_at = COALESCE(updated_at, NOW())
WHERE is_active IS DISTINCT FROM true;

-- 2. Fix null client_id
UPDATE public.inventory_products
SET client_id = (SELECT id FROM public.clients ORDER BY created_at LIMIT 1)
WHERE client_id IS NULL;

-- 3. Resolve supply_code duplicates per client (keep most recent, null the rest)
WITH duplicates AS (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY client_id, TRIM(supply_code)
      ORDER BY created_at DESC, updated_at DESC
    ) as rn
    FROM public.inventory_products
    WHERE supply_code IS NOT NULL AND client_id IS NOT NULL
  ) t WHERE rn > 1
)
UPDATE public.inventory_products
SET supply_code = NULL, updated_at = NOW()
WHERE id IN (SELECT id FROM duplicates);

-- 4. Trim supply_code
UPDATE public.inventory_products
SET supply_code = TRIM(supply_code), updated_at = NOW()
WHERE supply_code IS NOT NULL AND supply_code IS DISTINCT FROM TRIM(supply_code);

-- 5. Resolve fs_code duplicates per client
WITH duplicates AS (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY client_id, TRIM(fs_code)
      ORDER BY created_at DESC, updated_at DESC
    ) as rn
    FROM public.inventory_products
    WHERE fs_code IS NOT NULL AND client_id IS NOT NULL
  ) t WHERE rn > 1
)
UPDATE public.inventory_products
SET fs_code = NULL, updated_at = NOW()
WHERE id IN (SELECT id FROM duplicates);

-- 6. Trim fs_code
UPDATE public.inventory_products
SET fs_code = TRIM(fs_code), updated_at = NOW()
WHERE fs_code IS NOT NULL AND fs_code IS DISTINCT FROM TRIM(fs_code);

-- 7. Clean categories
UPDATE public.inventory_products
SET category = public.clean_category_name(category), updated_at = NOW()
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM public.clean_category_name(category);

UPDATE public.inventory_products
SET category = NULL, updated_at = NOW()
WHERE category IS NOT NULL AND TRIM(category) = '';

-- 8. Match categories to inventory_categories
UPDATE public.inventory_products p
SET category = c.name, updated_at = NOW()
FROM public.inventory_categories c
WHERE p.category IS NOT NULL
  AND p.client_id IS NOT DISTINCT FROM c.client_id
  AND public.normalize_category_text(p.category) = public.normalize_category_text(c.name)
  AND p.category IS DISTINCT FROM c.name;

-- 9. Set unmatched categories to NULL (shows in "Sem Categoria" tab)
UPDATE public.inventory_products p
SET category = NULL, updated_at = NOW()
WHERE p.category IS NOT NULL
  AND TRIM(p.category) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory_categories c
    WHERE c.client_id IS NOT DISTINCT FROM p.client_id
    AND public.normalize_category_text(c.name) = public.normalize_category_text(p.category)
  );

-- 10. Enhanced RPC with supply_code/fs_code normalization
CREATE OR REPLACE FUNCTION public.normalize_client_inventory_categories(p_client_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.inventory_products
  SET is_active = true, updated_at = NOW()
  WHERE client_id = p_client_id AND is_active IS DISTINCT FROM true;

  UPDATE public.inventory_products
  SET supply_code = TRIM(supply_code), updated_at = NOW()
  WHERE client_id = p_client_id
    AND supply_code IS NOT NULL
    AND supply_code IS DISTINCT FROM TRIM(supply_code);

  UPDATE public.inventory_products
  SET fs_code = TRIM(fs_code), updated_at = NOW()
  WHERE client_id = p_client_id
    AND fs_code IS NOT NULL
    AND fs_code IS DISTINCT FROM TRIM(fs_code);

  UPDATE public.inventory_products
  SET category = public.clean_category_name(category), updated_at = NOW()
  WHERE client_id = p_client_id
    AND category IS NOT NULL
    AND category IS DISTINCT FROM public.clean_category_name(category);

  UPDATE public.inventory_products
  SET category = NULL, updated_at = NOW()
  WHERE client_id = p_client_id
    AND category IS NOT NULL AND TRIM(category) = '';

  UPDATE public.inventory_products p
  SET category = c.name, updated_at = NOW()
  FROM public.inventory_categories c
  WHERE p.client_id = p_client_id
    AND p.category IS NOT NULL
    AND c.client_id = p_client_id
    AND public.normalize_category_text(p.category) = public.normalize_category_text(c.name)
    AND p.category IS DISTINCT FROM c.name;

  UPDATE public.inventory_products p
  SET category = NULL, updated_at = NOW()
  WHERE p.client_id = p_client_id
    AND p.category IS NOT NULL
    AND TRIM(p.category) <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.inventory_categories c
      WHERE c.client_id = p_client_id
      AND public.normalize_category_text(c.name) = public.normalize_category_text(p.category)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Ensure RLS policies are correct
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

-- 12. Diagnostic report
DO $$
DECLARE
  v_total integer;
  v_active integer;
  v_null_client integer;
  v_null_category integer;
  v_dirty_supply integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.inventory_products;
  SELECT COUNT(*) INTO v_active FROM public.inventory_products WHERE is_active = true;
  SELECT COUNT(*) INTO v_null_client FROM public.inventory_products WHERE client_id IS NULL;
  SELECT COUNT(*) INTO v_null_category FROM public.inventory_products WHERE category IS NULL;
  SELECT COUNT(*) INTO v_dirty_supply FROM public.inventory_products
  WHERE supply_code IS NOT NULL AND supply_code IS DISTINCT FROM TRIM(supply_code);

  RAISE NOTICE '===== UNSEEN PRODUCTS FIX REPORT =====';
  RAISE NOTICE 'Total products:       %', v_total;
  RAISE NOTICE 'Active (visible):     %', v_active;
  RAISE NOTICE 'NULL client_id:       %', v_null_client;
  RAISE NOTICE 'NULL category:        %', v_null_category;
  RAISE NOTICE 'Dirty supply_code:    %', v_dirty_supply;
  RAISE NOTICE '=======================================';
END $$;
