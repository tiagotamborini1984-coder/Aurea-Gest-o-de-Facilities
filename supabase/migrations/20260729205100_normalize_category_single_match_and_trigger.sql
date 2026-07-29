-- Comprehensive normalization of inventory_products.category with single-match logic
-- plus a preventive trigger for future INSERT/UPDATE operations.
-- Idempotent: safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- ===== PART 1: Clean existing data =====

-- Step 1a: Remove zero-width and invisible Unicode characters
UPDATE public.inventory_products
SET category = REGEXP_REPLACE(category, E'[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]', '', 'g')
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM REGEXP_REPLACE(category, E'[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]', '', 'g');

-- Step 1b: Replace control characters with space
UPDATE public.inventory_products
SET category = REGEXP_REPLACE(category, '[[:cntrl:]]', ' ', 'g')
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM REGEXP_REPLACE(category, '[[:cntrl:]]', ' ', 'g');

-- Step 1c: Replace Unicode whitespace variants with ASCII space
UPDATE public.inventory_products
SET category = REGEXP_REPLACE(category, E'[\u00A0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000]', ' ', 'g')
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM REGEXP_REPLACE(category, E'[\u00A0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000]', ' ', 'g');

-- Step 1d: Collapse multiple spaces and trim
UPDATE public.inventory_products
SET category = BTRIM(REGEXP_REPLACE(category, '\s+', ' ', 'g'))
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM BTRIM(REGEXP_REPLACE(category, '\s+', ' ', 'g'));

-- Step 1e: Convert empty strings to NULL
UPDATE public.inventory_products
SET category = NULL
WHERE category IS NOT NULL AND BTRIM(category) = '';

-- ===== PART 2: Match to exact inventory_categories name (single match only) =====

-- Step 2a: For each product with a non-null category, find the normalized match
-- in inventory_categories. Only update if exactly ONE distinct category name matches.
WITH product_normalized AS (
  SELECT
    p.id AS product_id,
    p.client_id,
    LOWER(unaccent(p.category)) AS norm_category
  FROM public.inventory_products p
  WHERE p.category IS NOT NULL
),
category_normalized AS (
  SELECT DISTINCT
    c.client_id,
    c.name AS cat_name,
    LOWER(unaccent(c.name)) AS norm_cat_name
  FROM public.inventory_categories c
),
match_summary AS (
  SELECT
    pn.product_id,
    (
      SELECT cn.cat_name
      FROM category_normalized cn
      WHERE cn.client_id = pn.client_id
        AND cn.norm_cat_name = pn.norm_category
      LIMIT 1
    ) AS matched_name,
    (
      SELECT COUNT(DISTINCT cn.cat_name)
      FROM category_normalized cn
      WHERE cn.client_id = pn.client_id
        AND cn.norm_cat_name = pn.norm_category
    ) AS match_count
  FROM product_normalized pn
)
UPDATE public.inventory_products p
SET category = ms.matched_name
FROM match_summary ms
WHERE p.id = ms.product_id
  AND ms.match_count = 1
  AND p.category IS DISTINCT FROM ms.matched_name;

-- Step 2b: Set category to NULL for products whose normalized category
-- does not match ANY inventory_categories name (no false positives)
UPDATE public.inventory_products p
SET category = NULL
WHERE p.category IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.inventory_categories c
    WHERE p.client_id = c.client_id
      AND LOWER(unaccent(p.category)) = LOWER(unaccent(c.name))
  );

-- Step 2c: Final trim
UPDATE public.inventory_products
SET category = BTRIM(category)
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM BTRIM(category);

-- ===== PART 3: Preventive trigger for future INSERT/UPDATE =====

CREATE OR REPLACE FUNCTION public.normalize_inventory_product_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category IS NOT NULL THEN
    -- Remove zero-width and invisible characters
    NEW.category := REGEXP_REPLACE(NEW.category, E'[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]', '', 'g');
    -- Replace control characters with space
    NEW.category := REGEXP_REPLACE(NEW.category, '[[:cntrl:]]', ' ', 'g');
    -- Replace Unicode whitespace variants with ASCII space
    NEW.category := REGEXP_REPLACE(NEW.category, E'[\u00A0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000]', ' ', 'g');
    -- Collapse multiple spaces and trim
    NEW.category := BTRIM(REGEXP_REPLACE(NEW.category, '\s+', ' ', 'g'));

    -- Convert empty to NULL
    IF NEW.category = '' THEN
      NEW.category := NULL;
    ELSE
      -- Match to existing category name (accent-insensitive, case-insensitive)
      SELECT c.name INTO NEW.category
      FROM public.inventory_categories c
      WHERE c.client_id IS NOT DISTINCT FROM NEW.client_id
        AND LOWER(unaccent(c.name)) = LOWER(unaccent(NEW.category))
      LIMIT 1;

      -- If no match, set to NULL so product falls into "Sem Categoria"
      IF NOT FOUND THEN
        NEW.category := NULL;
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
