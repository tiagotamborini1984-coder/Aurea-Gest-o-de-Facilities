-- Normalize inventory_products categories to support Limpeza, Higiene, and Escritório tabs
-- Idempotent: safe to run multiple times, no data loss

-- Step 1: Normalize legacy combined category to 'Limpeza'
UPDATE public.inventory_products
SET category = 'Limpeza'
WHERE category = 'Produtos de Limpeza e Higiene';

-- Step 2: Detect hygiene products by name keywords (only for products currently categorized as 'Limpeza')
-- This restores products that may have been incorrectly lumped into 'Limpeza' during previous migrations
UPDATE public.inventory_products
SET category = 'Higiene'
WHERE category = 'Limpeza'
  AND (
    name ILIKE '%sabao%'
    OR name ILIKE '%sabonete%'
    OR name ILIKE '%shampoo%'
    OR name ILIKE '%condicionador%'
    OR name ILIKE '%pasta de dente%'
    OR name ILIKE '%escova de dente%'
    OR name ILIKE '%papel higienico%'
    OR name ILIKE '%higienico%'
    OR name ILIKE '%fralda%'
    OR name ILIKE '%absorvente%'
    OR name ILIKE '%algodao%'
    OR name ILIKE '%desodorante%'
    OR name ILIKE '%creme%'
    OR name ILIKE '%locao%'
    OR name ILIKE '%higiene%'
    OR name ILIKE '%cotonete%'
    OR name ILIKE '%lenço umedecido%'
    OR name ILIKE '%lenco umedecido%'
  );

-- Step 3: Detect office products by name keywords (only for products currently categorized as 'Limpeza')
-- This restores office products that may have been incorrectly lumped into 'Limpeza'
UPDATE public.inventory_products
SET category = 'Escritório'
WHERE category = 'Limpeza'
  AND (
    name ILIKE '%papel a4%'
    OR name ILIKE '%papel sulfite%'
    OR name ILIKE '%caneta%'
    OR name ILIKE '%lapis%'
    OR name ILIKE '%lapis%'
    OR name ILIKE '%borracha%'
    OR name ILIKE '%grampeador%'
    OR name ILIKE '%grampo%'
    OR name ILIKE '%clipe%'
    OR name ILIKE '%pasta%'
    OR name ILIKE '%ficha%'
    OR name ILIKE '%envelope%'
    OR name ILIKE '%etiqueta%'
    OR name ILIKE '%papelaria%'
    OR name ILIKE '%escritorio%'
    OR name ILIKE '%escritório%'
    OR name ILIKE '%toner%'
    OR name ILIKE '%cartucho%'
    OR name ILIKE '%pisante%'
    OR name ILIKE '%apagador%'
    OR name ILIKE '%corretivo%'
    OR name ILIKE '%marca texto%'
    OR name ILIKE '%marca-texto%'
    OR name ILIKE '%post-it%'
    OR name ILIKE '%postit%'
    OR name ILIKE '%col%'
  );

-- Step 4: Set any remaining NULL or empty categories to 'Limpeza' as default
UPDATE public.inventory_products
SET category = 'Limpeza'
WHERE category IS NULL OR category = '';

-- Step 5: Ensure products already categorized as 'Higiene' or 'Escritório' remain unchanged (no action needed)
-- This migration is idempotent and safe to re-run
