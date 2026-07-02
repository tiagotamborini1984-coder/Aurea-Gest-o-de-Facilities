-- Redistribute products from combined category into separate "Limpeza" and "Higiene" categories
-- Products previously marked as "Produtos de Limpeza e Higiene" default to "Limpeza"
UPDATE public.inventory_products
SET category = 'Limpeza'
WHERE category = 'Produtos de Limpeza e Higiene';

-- Also normalize any empty or null categories to 'Limpeza'
UPDATE public.inventory_products
SET category = 'Limpeza'
WHERE category IS NULL OR category = '';
