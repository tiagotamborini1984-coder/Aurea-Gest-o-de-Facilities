-- Normalize empty string supply_code and fs_code to NULL
UPDATE public.inventory_products SET supply_code = NULL WHERE supply_code = '';
UPDATE public.inventory_products SET fs_code = NULL WHERE fs_code = '';

-- Step 1: Repoint inventory_request_items for supply_code duplicates
-- Keeper = row with MAX(created_at) per (client_id, supply_code) group
WITH ranked AS (
  SELECT id, client_id, supply_code,
    ROW_NUMBER() OVER (PARTITION BY client_id, supply_code ORDER BY created_at DESC, id DESC) AS rn
  FROM public.inventory_products
  WHERE supply_code IS NOT NULL
)
UPDATE public.inventory_request_items iri
SET product_id = keeper.id
FROM ranked loser
JOIN ranked keeper
  ON loser.client_id = keeper.client_id
 AND loser.supply_code = keeper.supply_code
 AND keeper.rn = 1
WHERE loser.rn > 1
  AND iri.product_id = loser.id;

-- Step 2: Repoint inventory_request_items for fs_code duplicates
WITH ranked AS (
  SELECT id, client_id, fs_code,
    ROW_NUMBER() OVER (PARTITION BY client_id, fs_code ORDER BY created_at DESC, id DESC) AS rn
  FROM public.inventory_products
  WHERE fs_code IS NOT NULL
)
UPDATE public.inventory_request_items iri
SET product_id = keeper.id
FROM ranked loser
JOIN ranked keeper
  ON loser.client_id = keeper.client_id
 AND loser.fs_code = keeper.fs_code
 AND keeper.rn = 1
WHERE loser.rn > 1
  AND iri.product_id = loser.id;

-- Step 3: Delete supply_code duplicates (keep rn = 1 = most recently created)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY client_id, supply_code ORDER BY created_at DESC, id DESC) AS rn
  FROM public.inventory_products
  WHERE supply_code IS NOT NULL
)
DELETE FROM public.inventory_products p
USING ranked r
WHERE p.id = r.id AND r.rn > 1;

-- Step 4: Delete fs_code duplicates (keep rn = 1 = most recently created)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY client_id, fs_code ORDER BY created_at DESC, id DESC) AS rn
  FROM public.inventory_products
  WHERE fs_code IS NOT NULL
)
DELETE FROM public.inventory_products p
USING ranked r
WHERE p.id = r.id AND r.rn > 1;

-- Step 5: Create unique indexes to support ON CONFLICT upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_products_client_supply_code
ON public.inventory_products (client_id, supply_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_products_client_fs_code
ON public.inventory_products (client_id, fs_code);
