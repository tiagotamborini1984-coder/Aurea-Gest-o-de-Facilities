-- ============================================================
-- Diagnostic & Fix: Inventory Product Visibility
-- ============================================================

-- 1. FIX: Set is_active = true for ALL products where it is false or NULL
UPDATE public.inventory_products
SET is_active = true, updated_at = COALESCE(updated_at, NOW())
WHERE is_active IS DISTINCT FROM true;

-- 2. FIX: Update trigger to force is_active = true on INSERT,
--    and only set to true on UPDATE if NULL (preserves archive capability)
CREATE OR REPLACE FUNCTION public.ensure_inventory_product_active()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.is_active := true;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_active IS NULL THEN
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_inventory_product_active ON public.inventory_products;
CREATE TRIGGER trg_ensure_inventory_product_active
  BEFORE INSERT OR UPDATE ON public.inventory_products
  FOR EACH ROW EXECUTE FUNCTION public.ensure_inventory_product_active();

-- 3. FIX: Normalize product categories to match inventory_categories exactly
--    This fixes whitespace, accent, and casing mismatches that cause
--    products to appear in "Sem Categoria" instead of their proper tab
UPDATE public.inventory_products p
SET category = ic.name, updated_at = NOW()
FROM public.inventory_categories ic
WHERE p.client_id = ic.client_id
  AND p.category IS NOT NULL
  AND TRIM(p.category) != ''
  AND p.category != ic.name
  AND unaccent(LOWER(TRIM(REGEXP_REPLACE(p.category, '\s+', ' ', 'g')))) =
      unaccent(LOWER(TRIM(REGEXP_REPLACE(ic.name, '\s+', ' ', 'g'))));

-- 4. DIAGNOSTIC: Create a view that shows every product and its visibility status
--    Admins can query this to find products hidden from the catalog
DROP VIEW IF EXISTS public.v_inventory_product_diagnostics;
CREATE VIEW public.v_inventory_product_diagnostics AS
SELECT
  p.id,
  p.name,
  p.fs_code,
  p.supply_code,
  p.category AS product_category,
  p.is_active,
  p.client_id,
  c.name AS client_name,
  p.unit_of_measure,
  p.item_value,
  p.created_at,
  p.updated_at,
  CASE
    WHEN p.is_active IS NOT TRUE THEN 'HIDDEN_INACTIVE'
    WHEN p.client_id IS NULL THEN 'HIDDEN_NO_CLIENT'
    ELSE 'VISIBLE'
  END AS visibility_status,
  CASE
    WHEN p.is_active IS NOT TRUE THEN
      'Product hidden because is_active = ' || COALESCE(p.is_active::text, 'NULL') ||
      '. Catalog query: SELECT * FROM inventory_products WHERE client_id = ''' ||
      COALESCE(p.client_id::text, 'NULL') || ''' AND (is_active = true OR is_active IS NULL)'
    WHEN p.client_id IS NULL THEN
      'Product hidden because client_id is NULL. RLS policy requires client_id = get_user_client_id().'
    ELSE 'Product is visible in catalog.'
  END AS diagnostic_message
FROM public.inventory_products p
LEFT JOIN public.clients c ON c.id = p.client_id;

GRANT SELECT ON public.v_inventory_product_diagnostics TO authenticated;

-- 5. DIAGNOSTIC: Create a function that returns a summary report
CREATE OR REPLACE FUNCTION public.diagnose_inventory_visibility(p_client_id uuid)
RETURNS TABLE (
  total_products bigint,
  visible_products bigint,
  hidden_inactive bigint,
  hidden_no_client bigint,
  products_with_category bigint,
  products_without_category bigint,
  category_mismatches bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_products,
    COUNT(*) FILTER (WHERE is_active = true AND client_id IS NOT NULL)::bigint AS visible_products,
    COUNT(*) FILTER (WHERE is_active IS NOT TRUE)::bigint AS hidden_inactive,
    COUNT(*) FILTER (WHERE client_id IS NULL)::bigint AS hidden_no_client,
    COUNT(*) FILTER (WHERE category IS NOT NULL AND TRIM(category) != '')::bigint AS products_with_category,
    COUNT(*) FILTER (WHERE category IS NULL OR TRIM(category) = '')::bigint AS products_without_category,
    COUNT(*) FILTER (
      WHERE category IS NOT NULL AND TRIM(category) != ''
      AND NOT EXISTS (
        SELECT 1 FROM public.inventory_categories ic
        WHERE ic.client_id = p_client_id
        AND unaccent(LOWER(TRIM(REGEXP_REPLACE(ic.name, '\s+', ' ', 'g')))) =
            unaccent(LOWER(TRIM(REGEXP_REPLACE(p.category, '\s+', ' ', 'g'))))
      )
    )::bigint AS category_mismatches
  FROM public.inventory_products
  WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.diagnose_inventory_visibility(uuid) TO authenticated;
