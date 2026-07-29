-- Final comprehensive category normalization with diagnostic report
-- Handles: curly quotes, control characters, Unicode whitespace variants,
-- zero-width characters, and other edge cases not fully covered by previous migrations.
-- Includes: helper functions, data cleanup, trigger recreation, and diagnostic query.
-- Idempotent: safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- ===== Helper Functions =====

-- Removes invisible/control characters and normalizes whitespace (preserves case & accents)
CREATE OR REPLACE FUNCTION public.clean_category_name(input text)
RETURNS text AS $$
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  RETURN BTRIM(REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP REPLACE(
            REGEXP_REPLACE(input,
              E'[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]', '', 'g'),
            E'[\u0000-\u001F\u007F-\u009F]', '', 'g'),
          E'[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]', ' ', 'g'),
        E'[\u2018\u2019\u201A\u201B]', '''', 'g'),
      E'[\u201C\u201D\u201E\u201F]', '"', 'g'),
    '\s+', ' ', 'g')
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Full normalization for comparison: clean + unaccent + lowercase
CREATE OR REPLACE FUNCTION public.normalize_category_text(input text)
RETURNS text AS $$
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  RETURN LOWER(unaccent(public.clean_category_name(input)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===== Step 1: Clean inventory_categories names =====

UPDATE public.inventory_categories
SET name = public.clean_category_name(name)
WHERE name IS NOT NULL
  AND name IS DISTINCT FROM public.clean_category_name(name);

-- ===== Step 2: Clean inventory_products.category values =====

UPDATE public.inventory_products
SET category = public.clean_category_name(category)
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM public.clean_category_name(category);

-- Convert empty strings to NULL
UPDATE public.inventory_products
SET category = NULL
WHERE category IS NOT NULL AND BTRIM(category) = '';

-- ===== Step 3: Match products to canonical category names =====

UPDATE public.inventory_products p
SET category = c.name
FROM public.inventory_categories c
WHERE p.category IS NOT NULL
  AND p.client_id IS NOT DISTINCT FROM c.client_id
  AND public.normalize_category_text(p.category) = public.normalize_category_text(c.name)
  AND p.category IS DISTINCT FROM c.name;

-- ===== Step 4: Set unmatched categories to NULL =====

UPDATE public.inventory_products p
SET category = NULL
WHERE p.category IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.inventory_categories c
    WHERE p.client_id IS NOT DISTINCT FROM c.client_id
      AND public.normalize_category_text(p.category) = public.normalize_category_text(c.name)
  );

-- ===== Step 5: Recreate preventive trigger =====

CREATE OR REPLACE FUNCTION public.normalize_inventory_product_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category IS NOT NULL THEN
    NEW.category := public.clean_category_name(NEW.category);

    IF NEW.category = '' THEN
      NEW.category := NULL;
    ELSE
      SELECT c.name INTO NEW.category
      FROM public.inventory_categories c
      WHERE c.client_id IS NOT DISTINCT FROM NEW.client_id
        AND public.normalize_category_text(c.name) = public.normalize_category_text(NEW.category)
      LIMIT 1;

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

-- ===== Step 6: Diagnostic Report =====

DO $$
DECLARE
  mismatch_count integer;
  null_count integer;
  total_count integer;
  valid_count integer;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.inventory_products;
  SELECT COUNT(*) INTO null_count FROM public.inventory_products WHERE category IS NULL;

  SELECT COUNT(*) INTO mismatch_count
  FROM public.inventory_products p
  WHERE p.category IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.inventory_categories c
      WHERE p.client_id IS NOT DISTINCT FROM c.client_id
        AND public.normalize_category_text(p.category) = public.normalize_category_text(c.name)
    );

  valid_count := total_count - null_count - mismatch_count;

  RAISE NOTICE '========== CATEGORY DIAGNOSTIC REPORT ==========';
  RAISE NOTICE 'Total products:                  %', total_count;
  RAISE NOTICE 'Products with valid category:    %', valid_count;
  RAISE NOTICE 'Products with NULL category:     %', null_count;
  RAISE NOTICE 'Products with mismatched cat:    %', mismatch_count;

  IF mismatch_count = 0 THEN
    RAISE NOTICE 'Status: ✓ ZERO DIVERGENCE — All products have valid categories or NULL';
  ELSE
    RAISE NOTICE 'Status: ⚠ % product(s) still have mismatched categories', mismatch_count;
  END IF;
  RAISE NOTICE '================================================';

  -- List mismatched products (if any)
  IF mismatch_count > 0 THEN
    RAISE NOTICE '--- Mismatched products ---';
    FOR mismatch_count IN
      SELECT p.id FROM public.inventory_products p
      WHERE p.category IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.inventory_categories c
          WHERE p.client_id IS NOT DISTINCT FROM c.client_id
            AND public.normalize_category_text(p.category) = public.normalize_category_text(c.name)
        )
    LOOP
      RAISE NOTICE 'Mismatched product ID: %', mismatch_count;
    END LOOP;
  END IF;
END $$;
