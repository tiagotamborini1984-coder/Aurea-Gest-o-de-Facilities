-- Normalize inventory product categories: trim whitespace and set NULL for empty strings
-- Idempotent: safe to run multiple times

-- Set category to NULL where it is empty or whitespace-only
UPDATE public.inventory_products
SET category = NULL
WHERE category IS NOT NULL AND TRIM(category) = '';

-- Trim leading/trailing whitespace from category for all remaining rows
UPDATE public.inventory_products
SET category = TRIM(category)
WHERE category IS NOT NULL AND category IS DISTINCT FROM TRIM(category);
