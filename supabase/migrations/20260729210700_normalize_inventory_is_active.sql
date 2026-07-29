-- Normalize is_active for all inventory products so they appear in the catalog
-- This migration sets is_active = true for all products where it is false or NULL,
-- ensuring every product is visible in the catalog listing and category tabs.

UPDATE public.inventory_products
SET is_active = true
WHERE is_active IS DISTINCT FROM true;

-- Also add a trigger to ensure is_active is never set to NULL on insert or update
CREATE OR REPLACE FUNCTION public.ensure_inventory_product_active()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_active IS NULL THEN
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_inventory_product_active ON public.inventory_products;
CREATE TRIGGER trg_ensure_inventory_product_active
  BEFORE INSERT OR UPDATE ON public.inventory_products
  FOR EACH ROW EXECUTE FUNCTION public.ensure_inventory_product_active();
