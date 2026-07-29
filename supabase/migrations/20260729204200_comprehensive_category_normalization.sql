-- Comprehensive normalization of inventory_products.category
-- Handles: zero-width characters, non-breaking spaces, Unicode whitespace,
-- control characters, accent/case mismatches, and invisible characters
-- that previous migrations (unaccent, TRANSLATE) did not cover.
-- Idempotent: safe to run multiple times without data loss or duplicate violations.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Step 1: Remove zero-width and invisible Unicode characters
-- (zero-width space, zero-width non-joiner, zero-width joiner,
--  left-to-right/right-to-left marks, BOM, soft hyphen)
UPDATE public.inventory_products
SET category = REGEXP_REPLACE(category, E'[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]', '', 'g')
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM REGEXP_REPLACE(category, E'[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]', '', 'g');

-- Step 2: Replace all control characters (ASCII 0-31, 127) with regular space
UPDATE public.inventory_products
SET category = REGEXP_REPLACE(category, '[[:cntrl:]]', ' ', 'g')
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM REGEXP_REPLACE(category, '[[:cntrl:]]', ' ', 'g');

-- Step 3: Replace all Unicode whitespace variants with regular ASCII space
-- (non-breaking space, various Unicode spaces, line/paragraph separators)
UPDATE public.inventory_products
SET category = REGEXP_REPLACE(category, E'[\u00A0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000]', ' ', 'g')
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM REGEXP_REPLACE(category, E'[\u00A0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000]', ' ', 'g');

-- Step 4: Collapse multiple spaces into one and trim leading/trailing
UPDATE public.inventory_products
SET category = BTRIM(REGEXP_REPLACE(category, ' +', ' ', 'g'))
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM BTRIM(REGEXP_REPLACE(category, ' +', ' ', 'g'));

-- Step 5: Convert empty strings or whitespace-only values to NULL
UPDATE public.inventory_products
SET category = NULL
WHERE category IS NOT NULL AND BTRIM(category) = '';

-- Step 6: Match each product category to the exact name in inventory_categories
-- using accent-insensitive, case-insensitive comparison
UPDATE public.inventory_products p
SET category = c.name
FROM public.inventory_categories c
WHERE p.category IS NOT NULL
  AND p.client_id = c.client_id
  AND LOWER(unaccent(p.category)) = LOWER(unaccent(c.name))
  AND p.category IS DISTINCT FROM c.name;

-- Step 7: Set category to NULL for products whose normalized category
-- does not match any inventory_categories name
UPDATE public.inventory_products p
SET category = NULL
WHERE p.category IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.inventory_categories c
    WHERE p.client_id = c.client_id
      AND LOWER(unaccent(p.category)) = LOWER(unaccent(c.name))
  );

-- Step 8: Final trim after all updates
UPDATE public.inventory_products
SET category = BTRIM(category)
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM BTRIM(category);
