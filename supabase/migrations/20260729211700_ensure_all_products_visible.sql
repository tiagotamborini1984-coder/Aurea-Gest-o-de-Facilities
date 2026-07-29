-- Ensure ALL inventory products are visible in the catalog
-- Fixes: is_active = false/NULL, client_id = NULL, RLS policies, aggressive category trigger
-- Idempotent: safe to run multiple times

-- 0. Define helper functions if they don't exist yet
CREATE OR REPLACE FUNCTION public.normalize_category_text(input text)
RETURNS text AS $$
BEGIN
  RETURN lower(trim(unaccent(input)));
EXCEPTION WHEN OTHERS THEN
  RETURN lower(trim(input));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.clean_category_name(input text)
RETURNS text AS $$
BEGIN
  RETURN trim(regexp_replace(input, '\s+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. Set is_active = true for ALL products
UPDATE public.inventory_products
SET is_active = true, updated_at = COALESCE(updated_at, NOW())
WHERE is_active IS DISTINCT FROM true;

-- 2. Fix products with NULL client_id — assign to the first client
UPDATE public.inventory_products
SET client_id = (SELECT id FROM public.clients ORDER BY created_at LIMIT 1)
WHERE client_id IS NULL;

-- 3. Recreate RLS policies to ensure proper tenant isolation
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_select_inventory_products" ON public.inventory_products
  FOR SELECT TO authenticated USING (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_insert_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_insert_inventory_products" ON public.inventory_products
  FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_update_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_update_inventory_products" ON public.inventory_products
  FOR UPDATE TO authenticated
  USING (client_id = get_user_client_id())
  WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_delete_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_delete_inventory_products" ON public.inventory_products
  FOR DELETE TO authenticated USING (client_id = get_user_client_id());

-- 4. Make the normalize_inventory_product_category trigger less aggressive
CREATE OR REPLACE FUNCTION public.normalize_inventory_product_category()
RETURNS TRIGGER AS $$
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

DROP TRIGGER IF EXISTS trg_normalize_inventory_category ON public.inventory_products;
CREATE TRIGGER trg_normalize_inventory_category
  BEFORE INSERT OR UPDATE OF category ON public.inventory_products
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_inventory_product_category();

-- 5. Normalize existing category values — re-clean and try to match
UPDATE public.inventory_products p
SET category = c.name, updated_at = NOW()
FROM public.inventory_categories c
WHERE p.category IS NOT NULL
  AND p.client_id IS NOT DISTINCT FROM c.client_id
  AND public.normalize_category_text(p.category) = public.normalize_category_text(c.name)
  AND p.category IS DISTINCT FROM c.name;

-- 6. Clean any remaining dirty category values
UPDATE public.inventory_products
SET category = public.clean_category_name(category)
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM public.clean_category_name(category);

-- 7. Diagnostic report
DO $$
DECLARE
  v_total integer;
  v_active integer;
  v_null_client integer;
  v_null_category integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.inventory_products;
  SELECT COUNT(*) INTO v_active FROM public.inventory_products WHERE is_active = true;
  SELECT COUNT(*) INTO v_null_client FROM public.inventory_products WHERE client_id IS NULL;
  SELECT COUNT(*) INTO v_null_category FROM public.inventory_products WHERE category IS NULL;

  RAISE NOTICE '===== INVENTORY VISIBILITY REPORT =====';
  RAISE NOTICE 'Total products:    %', v_total;
  RAISE NOTICE 'Active (visible):  %', v_active;
  RAISE NOTICE 'NULL client_id:    %', v_null_client;
  RAISE NOTICE 'NULL category:     %', v_null_category;
  RAISE NOTICE '=====================================';
END $$;
