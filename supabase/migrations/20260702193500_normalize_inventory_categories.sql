-- Normalize inventory product categories to ensure proper tab separation
-- This migration is idempotent and safe to run multiple times

-- Products with the legacy combined category or NULL/empty go to 'Limpeza'
UPDATE public.inventory_products
SET category = 'Limpeza'
WHERE category IS NULL
   OR category = ''
   OR category = 'Produtos de Limpeza e Higiene';

-- Products already categorized as 'Higiene' or 'Escritório' remain unchanged
-- No destructive changes — only normalizes legacy/empty values
