-- Fix: Repoint inventory_request_items references before dedup deletes
-- Previous migrations (20260702203500, 20260702204000) failed because
-- inventory_products rows referenced by inventory_request_items cannot be deleted.

-- Normalize empty string supply_code and fs_code to NULL
UPDATE public.inventory_products SET supply_code = NULL WHERE supply_code = '';
UPDATE public.inventory_products SET fs_code = NULL WHERE fs_code = '';

-- =============================================================
-- Step 1: Repoint inventory_request_items for (client_id, supply_code) duplicates
-- =============================================================
DO $$
DECLARE
  keeper_id uuid;
  loser_id uuid;
BEGIN
  FOR keeper_id, loser_id IN
    SELECT
      keeper.id AS keeper_id,
      loser.id AS loser_id
    FROM public.inventory_products loser
    JOIN public.inventory_products keeper
      ON loser.client_id = keeper.client_id
     AND loser.supply_code = keeper.supply_code
     AND loser.supply_code IS NOT NULL
     AND keeper.created_at > loser.created_at
  LOOP
    UPDATE public.inventory_request_items
      SET product_id = keeper_id
      WHERE product_id = loser_id;
  END LOOP;
END $$;

-- =============================================================
-- Step 2: Repoint inventory_request_items for (client_id, fs_code) duplicates
-- =============================================================
DO $$
DECLARE
  keeper_id uuid;
  loser_id uuid;
BEGIN
  FOR keeper_id, loser_id IN
    SELECT
      keeper.id AS keeper_id,
      loser.id AS loser_id
    FROM public.inventory_products loser
    JOIN public.inventory_products keeper
      ON loser.client_id = keeper.client_id
     AND loser.fs_code = keeper.fs_code
     AND loser.fs_code IS NOT NULL
     AND keeper.created_at > loser.created_at
  LOOP
    UPDATE public.inventory_request_items
      SET product_id = keeper_id
      WHERE product_id = loser_id;
  END LOOP;
END $$;

-- =============================================================
-- Step 3: Now safe to delete duplicates by (client_id, supply_code)
--         Keep the most recently created row (largest created_at)
-- =============================================================
DELETE FROM public.inventory_products p
WHERE p.supply_code IS NOT NULL
  AND p.ctid NOT IN (
    SELECT MIN(ctid) FROM public.inventory_products
    WHERE supply_code IS NOT NULL
    GROUP BY client_id, supply_code
  );

-- =============================================================
-- Step 4: Delete duplicates by (client_id, fs_code)
--         Keep the most recently created row (largest created_at)
-- =============================================================
DELETE FROM public.inventory_products p
WHERE p.fs_code IS NOT NULL
  AND p.ctid NOT IN (
    SELECT MIN(ctid) FROM public.inventory_products
    WHERE fs_code IS NOT NULL
    GROUP BY client_id, fs_code
  );

-- =============================================================
-- Step 5: Create unique indexes to support ON CONFLICT upsert
-- =============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_products_client_supply_code
ON public.inventory_products (client_id, supply_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_products_client_fs_code
ON public.inventory_products (client_id, fs_code);
