-- Normalize empty string supply_code and fs_code to NULL
UPDATE public.inventory_products SET supply_code = NULL WHERE supply_code = '';
UPDATE public.inventory_products SET fs_code = NULL WHERE fs_code = '';

-- Clean up duplicates by (client_id, supply_code) keeping one row per group
DELETE FROM public.inventory_products p
WHERE p.supply_code IS NOT NULL
  AND p.ctid NOT IN (
    SELECT MIN(ctid) FROM public.inventory_products
    WHERE supply_code IS NOT NULL
    GROUP BY client_id, supply_code
  );

-- Clean up duplicates by (client_id, fs_code) keeping one row per group
DELETE FROM public.inventory_products p
WHERE p.fs_code IS NOT NULL
  AND p.ctid NOT IN (
    SELECT MIN(ctid) FROM public.inventory_products
    WHERE fs_code IS NOT NULL
    GROUP BY client_id, fs_code
  );

-- Create unique indexes to support ON CONFLICT upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_products_client_supply_code
ON public.inventory_products (client_id, supply_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_products_client_fs_code
ON public.inventory_products (client_id, fs_code);
