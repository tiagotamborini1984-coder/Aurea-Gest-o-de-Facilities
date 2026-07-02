-- Clean up empty supply_code values (convert to NULL)
UPDATE public.inventory_products SET supply_code = NULL WHERE supply_code = '';

-- Remove duplicate (client_id, supply_code) rows where supply_code IS NOT NULL
-- Keep the most recently created row (largest created_at)
DELETE FROM public.inventory_products a
USING public.inventory_products b
WHERE a.client_id = b.client_id
  AND a.supply_code IS NOT NULL
  AND a.supply_code = b.supply_code
  AND a.created_at < b.created_at;

-- Create unique index for upsert (ON CONFLICT) support
-- PostgreSQL allows multiple NULL values in unique indexes, so products without supply_code won't conflict
CREATE UNIQUE INDEX IF NOT EXISTS inventory_products_client_supply_code_key
ON public.inventory_products (client_id, supply_code);
