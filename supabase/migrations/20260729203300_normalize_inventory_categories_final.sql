-- Normalize inventory_products.category: trim, collapse internal spaces, fix accents, match inventory_categories, NULL if no match
-- Idempotent migration safe to run multiple times

-- 1. Trim leading/trailing whitespace and collapse multiple internal spaces into single space
UPDATE public.inventory_products
SET category = BTRIM(REGEXP_REPLACE(category, '\s+', ' ', 'g'))
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM BTRIM(REGEXP_REPLACE(category, '\s+', ' ', 'g'));

-- 2. Convert empty strings or whitespace-only values to NULL
UPDATE public.inventory_products
SET category = NULL
WHERE category IS NOT NULL AND BTRIM(category) = '';

-- 3. Standardize each product's category to the exact name from inventory_categories
--    using accent-insensitive and case-insensitive comparison
UPDATE public.inventory_products p
SET category = c.name
FROM public.inventory_categories c
WHERE p.category IS NOT NULL
  AND p.client_id = c.client_id
  AND LOWER(TRANSLATE(
        p.category,
        'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
      )) = LOWER(TRANSLATE(
        c.name,
        'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
      ))
  AND p.category <> c.name;

-- 4. Set category to NULL for products whose normalized category does not match
--    any existing inventory_categories name (accent-insensitive, case-insensitive)
UPDATE public.inventory_products p
SET category = NULL
WHERE p.category IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.inventory_categories c
    WHERE p.client_id = c.client_id
      AND LOWER(TRANSLATE(
            p.category,
            'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
          )) = LOWER(TRANSLATE(
            c.name,
            'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
          ))
  );

-- 5. Final cleanup: trim again after all updates
UPDATE public.inventory_products
SET category = BTRIM(category)
WHERE category IS NOT NULL
  AND category IS DISTINCT FROM BTRIM(category);
