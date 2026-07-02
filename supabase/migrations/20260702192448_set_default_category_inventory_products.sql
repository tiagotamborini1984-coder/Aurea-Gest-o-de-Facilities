UPDATE public.inventory_products
SET category = 'Produtos de Limpeza e Higiene'
WHERE category IS NULL OR category = '';
