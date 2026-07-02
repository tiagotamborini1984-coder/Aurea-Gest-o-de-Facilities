-- Fix: Set-based dedup that repoints FK references before deleting,
-- and uses a consistent keeper rule (MAX(created_at)) for both repoint and delete.
-- Idempotent: safe to run even if prior migrations partially applied.

-- Step 0: Normalize empty strings to NULL (idempotent)
UPDATE public.inventory_products SET supply_code = NULL WHERE supply_code = '';
UPDATE public.inventory_products SET fs_code = NULL WHERE fs_code = '';

-- =============================================================
-- Step 1: Repoint inventory_request_items for (client_id, supply_code) duplicates
-- Keeper = row with MAX(created_at) per group
-- =============================================================
WITH dupes AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, supply_code
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.inventory_products
  WHERE supply_code IS NOT NULL
),
keepers AS (
  SELECT id AS keeper_id, client_id, supply_code
  FROM dupes WHERE rn = 1
),
losers AS (
  SELECT id AS loser_id, client_id, supply_code
  FROM dupes WHERE rn > 1
)
UPDATE public.inventory_request_items iri
SET product_id = k.keeper_id
FROM losers l
JOIN keepers k ON l.client_id = k.client_id AND l.supply_code = k.supply_code
WHERE iri.product_id = l.loser_id;

-- Step 2: Delete supply_code duplicates (losers only)
WITH dupes AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, supply_code
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.inventory_products
  WHERE supply_code IS NOT NULL
)
DELETE FROM public.inventory_products
WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- =============================================================
-- Step 3: Repoint inventory_request_items for (client_id, fs_code) duplicates
-- =============================================================
WITH dupes AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, fs_code
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.inventory_products
  WHERE fs_code IS NOT NULL
),
keepers AS (
  SELECT id AS keeper_id, client_id, fs_code
  FROM dupes WHERE rn = 1
),
losers AS (
  SELECT id AS loser_id, client_id, fs_code
  FROM dupes WHERE rn > 1
)
UPDATE public.inventory_request_items iri
SET product_id = k.keeper_id
FROM losers l
JOIN keepers k ON l.client_id = k.client_id AND l.fs_code = k.fs_code
WHERE iri.product_id = l.loser_id;

-- Step 4: Delete fs_code duplicates (losers only)
WITH dupes AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, fs_code
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.inventory_products
  WHERE fs_code IS NOT NULL
)
DELETE FROM public.inventory_products
WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- =============================================================
-- Step 5: Create unique indexes for ON CONFLICT upsert support
-- =============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_products_client_supply_code
ON public.inventory_products (client_id, supply_code)
WHERE supply_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_products_client_fs_code
ON public.inventory_products (client_id, fs_code)
WHERE fs_code IS NOT NULL;
