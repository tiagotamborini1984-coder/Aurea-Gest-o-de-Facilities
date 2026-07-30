-- Final comprehensive inventory visibility fix
-- Ensures ALL products are visible in the catalog
-- Idempotent: safe to run multiple times

-- 1. Set is_active = true for ALL products where NULL or false
UPDATE public.inventory_products
SET is_active = true, updated_at = COALESCE(updated_at, NOW())
WHERE is_active IS DISTINCT FROM true;

-- 2. Fix products with NULL client_id — assign to the first client
UPDATE public.inventory_products
SET client_id = (SELECT id FROM public.clients ORDER BY created_at LIMIT 1)
WHERE client_id IS NULL;

-- 3. Clean category values: remove invisible characters, normalize spaces
UPDATE public.inventory_products
SET category = public.clean_category_name(category)
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM public.clean_category_name(category);

-- Set empty/whitespace-only categories to NULL
UPDATE public.inventory_products
SET category = NULL
WHERE category IS NOT NULL AND TRIM(category) = '';

-- 4. Match product categories to existing inventory_categories exactly
UPDATE public.inventory_products p
SET category = c.name, updated_at = NOW()
FROM public.inventory_categories c
WHERE p.category IS NOT NULL
  AND p.client_id IS NOT DISTINCT FROM c.client_id
  AND public.normalize_category_text(p.category) = public.normalize_category_text(c.name)
  AND p.category IS DISTINCT FROM c.name;

-- 5. Drop all conflicting triggers (from previous migrations)
DROP TRIGGER IF EXISTS trg_ensure_inventory_product_active ON public.inventory_products;
DROP TRIGGER IF EXISTS trg_normalize_inventory_product_category ON public.inventory_products;
DROP TRIGGER IF EXISTS trg_normalize_inventory_category ON public.inventory_products;

-- 6. Recreate ensure_inventory_product_active trigger
CREATE OR REPLACE FUNCTION public.ensure_inventory_product_active()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_active IS NULL THEN
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_inventory_product_active
  BEFORE INSERT OR UPDATE ON public.inventory_products
  FOR EACH ROW EXECUTE FUNCTION public.ensure_inventory_product_active();

-- 7. Recreate normalize_inventory_product_category trigger (single, clean version)
CREATE OR REPLACE FUNCTION public.normalize_inventory_product_category()
RETURNS trigger AS $$
DECLARE
  cleaned_category text;
  matched_name text;
BEGIN
  IF NEW.category IS NOT NULL THEN
    cleaned_category := public.clean_category_name(NEW.category);

    IF cleaned_category = '' OR cleaned_category IS NULL THEN
      NEW.category := NULL;
    ELSE
      SELECT c.name INTO matched_name
      FROM public.inventory_categories c
      WHERE c.client_id IS NOT DISTINCT FROM NEW.client_id
        AND public.normalize_category_text(c.name) = public.normalize_category_text(cleaned_category)
      LIMIT 1;

      IF matched_name IS NOT NULL THEN
        NEW.category := matched_name;
      ELSE
        NEW.category := cleaned_category;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_inventory_product_category
  BEFORE INSERT OR UPDATE OF category ON public.inventory_products
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_inventory_product_category();

-- 8. Ensure RLS policies are correct and complete
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_select_inventory_products" ON public.inventory_products
  FOR SELECT TO authenticated
  USING (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_insert_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_insert_inventory_products" ON public.inventory_products
  FOR INSERT TO authenticated
  WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_update_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_update_inventory_products" ON public.inventory_products
  FOR UPDATE TO authenticated
  USING (client_id = get_user_client_id())
  WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_delete_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_delete_inventory_products" ON public.inventory_products
  FOR DELETE TO authenticated
  USING (client_id = get_user_client_id());

-- 9. Create RPC function for post-import normalization (callable from edge functions and frontend)
CREATE OR REPLACE FUNCTION public.normalize_client_inventory_categories(p_client_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.inventory_products
  SET is_active = true, updated_at = NOW()
  WHERE client_id = p_client_id AND is_active IS DISTINCT FROM true;

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Diagnostic report
DO $$
DECLARE
  v_total integer;
  v_active integer;
  v_null_client integer;
  v_null_category integer;
  v_dirty_category integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.inventory_products;
  SELECT COUNT(*) INTO v_active FROM public.inventory_products WHERE is_active = true;
  SELECT COUNT(*) INTO v_null_client FROM public.inventory_products WHERE client_id IS NULL;
  SELECT COUNT(*) INTO v_null_category FROM public.inventory_products WHERE category IS NULL;
  SELECT COUNT(*) INTO v_dirty_category FROM public.inventory_products
  WHERE category IS NOT NULL AND category IS DISTINCT FROM public.clean_category_name(category);

  RAISE NOTICE '===== FINAL INVENTORY VISIBILITY REPORT =====';
  RAISE NOTICE 'Total products:       %', v_total;
  RAISE NOTICE 'Active (visible):     %', v_active;
  RAISE NOTICE 'NULL client_id:       %', v_null_client;
  RAISE NOTICE 'NULL category:        %', v_null_category;
  RAISE NOTICE 'Dirty categories:     %', v_dirty_category;
  RAISE NOTICE '=============================================';
END $$;
