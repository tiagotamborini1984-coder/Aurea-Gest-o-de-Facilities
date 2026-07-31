-- Normalize inventory_products.category: trim whitespace, remove invisible chars,
-- match to existing category names, and set unmatched/null/empty to NULL.
-- Idempotent: safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Step 1: Remove zero-width and invisible Unicode characters
UPDATE public.inventory_products
SET category = REGEXP_REPLACE(category, E'[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]', '', 'g')
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM REGEXP_REPLACE(category, E'[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]', '', 'g');

-- Step 2: Replace control characters with space
UPDATE public.inventory_products
SET category = REGEXP_REPLACE(category, '[[:cntrl:]]', ' ', 'g')
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM REGEXP_REPLACE(category, '[[:cntrl:]]', ' ', 'g');

-- Step 3: Replace Unicode whitespace variants with ASCII space
UPDATE public.inventory_products
SET category = REGEXP_REPLACE(category, E'[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]', ' ', 'g')
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM REGEXP_REPLACE(category, E'[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]', ' ', 'g');

-- Step 4: Collapse multiple spaces and trim
UPDATE public.inventory_products
SET category = BTRIM(REGEXP_REPLACE(category, '\s+', ' ', 'g'))
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM BTRIM(REGEXP_REPLACE(category, '\s+', ' ', 'g'));

-- Step 5: Convert empty strings to NULL
UPDATE public.inventory_products
SET category = NULL
WHERE category IS NOT NULL AND BTRIM(category) = '';

-- Step 6: Match to existing category names (case/accent insensitive)
UPDATE public.inventory_products p
SET category = c.name
FROM public.inventory_categories c
WHERE p.category IS NOT NULL
  AND p.client_id IS NOT DISTINCT FROM c.client_id
  AND LOWER(unaccent(p.category)) = LOWER(unaccent(c.name))
  AND p.category IS DISTINCT FROM c.name;

-- Step 7: Set category to NULL if it doesn't match any existing category
UPDATE public.inventory_products p
SET category = NULL
WHERE p.category IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.inventory_categories c
    WHERE p.client_id IS NOT DISTINCT FROM c.client_id
      AND LOWER(unaccent(p.category)) = LOWER(unaccent(c.name))
  );

-- Step 8: Ensure all products have is_active set (default true for NULL)
UPDATE public.inventory_products
SET is_active = true
WHERE is_active IS NULL;
