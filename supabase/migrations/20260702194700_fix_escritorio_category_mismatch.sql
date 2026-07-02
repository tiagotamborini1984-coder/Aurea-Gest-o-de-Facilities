-- Fix mismatch between inventory_categories.name and inventory_products.category
-- The categories table was seeded with 'Escritorio' (no accent) but products
-- were normalized to 'Escritório' (with accent), causing the Office tab to be empty.

-- Step 1: Fix the category name in inventory_categories to match products
UPDATE public.inventory_categories
SET name = 'Escritório'
WHERE name = 'Escritorio';

UPDATE public.inventory_categories
SET name = 'Limpeza'
WHERE name ILIKE 'limpez%';

UPDATE public.inventory_categories
SET name = 'Higiene'
WHERE name ILIKE 'higien%';

-- Step 2: Normalize product categories to match inventory_categories names exactly
UPDATE public.inventory_products
SET category = 'Escritório'
WHERE category ILIKE 'escritorio'
   OR category ILIKE 'escritório';

UPDATE public.inventory_products
SET category = 'Limpeza'
WHERE category ILIKE 'limpez%'
   OR category = 'Produtos de Limpeza e Higiene';

UPDATE public.inventory_products
SET category = 'Higiene'
WHERE category ILIKE 'higien%';

-- Step 3: Set any NULL or empty categories to 'Limpeza' as default
UPDATE public.inventory_products
SET category = 'Limpeza'
WHERE category IS NULL OR category = '';

-- Step 4: Re-seed default categories with correct accented names for any client missing them
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM public.clients LOOP
    INSERT INTO public.inventory_categories (client_id, name)
    VALUES
      (c.id, 'Limpeza'),
      (c.id, 'Higiene'),
      (c.id, 'Escritório')
    ON CONFLICT (client_id, name) DO NOTHING;
  END LOOP;
END $$;
