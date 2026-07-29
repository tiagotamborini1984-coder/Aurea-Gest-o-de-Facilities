-- Normalize inventory product categories: trim whitespace, convert empty strings to NULL, and standardize category names
-- Idempotent migration safe to execute multiple times

-- 1. Trim leading and trailing spaces from category column
UPDATE public.inventory_products
SET category = TRIM(category)
WHERE category IS NOT NULL AND category IS DISTINCT FROM TRIM(category);

-- 2. Convert empty strings or whitespace-only category values to NULL
UPDATE public.inventory_products
SET category = NULL
WHERE category IS NOT NULL AND TRIM(category) = '';

-- 3. Standardize product categories to match exact names in inventory_categories where normalized strings match
UPDATE public.inventory_products p
SET category = c.name
FROM public.inventory_categories c
WHERE p.category IS NOT NULL
  AND TRIM(LOWER(p.category)) = TRIM(LOWER(c.name))
  AND p.category <> c.name;
