-- Comprehensive inventory visibility fix
-- Ensures ALL products are visible in the catalog

-- 1. Normalize is_active: set all NULL/false to true
UPDATE public.inventory_products
SET is_active = true
WHERE is_active IS DISTINCT FROM true;

-- 2. Clean category: remove hidden characters, normalize spaces, trim
UPDATE public.inventory_products
SET category = REGEXP_REPLACE(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      category,
      '[\u200B-\u200F\uFEFF\u00AD\u0000-\u001F\u007F-\u009F]', '', 'g'
    ),
    '[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]', ' ', 'g'
  ),
  '\s+', ' ', 'g'
)
WHERE category IS NOT NULL;

UPDATE public.inventory_products
SET category = TRIM(category)
WHERE category IS NOT NULL AND category IS DISTINCT FROM TRIM(category);

UPDATE public.inventory_products
SET category = NULL
WHERE category IS NOT NULL AND TRIM(category) = '';

-- 3. Standardize categories to match inventory_categories exactly
UPDATE public.inventory_products p
SET category = c.name
FROM public.inventory_categories c
WHERE p.category IS NOT NULL
  AND TRIM(LOWER(p.category)) = TRIM(LOWER(c.name))
  AND p.category <> c.name;

-- 4. Ensure trigger to keep is_active from being NULL
CREATE OR REPLACE FUNCTION public.ensure_inventory_product_active()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_active IS NULL THEN
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_inventory_product_active ON public.inventory_products;
CREATE TRIGGER trg_ensure_inventory_product_active
  BEFORE INSERT OR UPDATE ON public.inventory_products
  FOR EACH ROW EXECUTE FUNCTION public.ensure_inventory_product_active();

-- 5. Normalize category trigger (clean on insert/update)
CREATE OR REPLACE FUNCTION public.normalize_inventory_product_category()
RETURNS trigger AS $$
BEGIN
  IF NEW.category IS NOT NULL THEN
    NEW.category := TRIM(REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(NEW.category,
          '[\u200B-\u200F\uFEFF\u00AD\u0000-\u001F\u007F-\u009F]', '', 'g'
        ),
        '[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    ));
    IF NEW.category = '' THEN
      NEW.category := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_inventory_product_category ON public.inventory_products;
CREATE TRIGGER trg_normalize_inventory_product_category
  BEFORE INSERT OR UPDATE ON public.inventory_products
  FOR EACH ROW EXECUTE FUNCTION public.normalize_inventory_product_category();

-- 6. RLS policies: ensure correct and handle edge cases
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_select_inventory_products" ON public.inventory_products
  FOR SELECT TO authenticated
  USING (client_id = get_user_client_id() OR client_id IS NULL);

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
