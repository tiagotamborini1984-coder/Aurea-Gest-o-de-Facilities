DO $$
BEGIN
  ALTER TABLE public.inventory_products ADD COLUMN IF NOT EXISTS fs_code TEXT;
  ALTER TABLE public.inventory_products ADD COLUMN IF NOT EXISTS supply_code TEXT;
  ALTER TABLE public.inventory_products ADD COLUMN IF NOT EXISTS item_value NUMERIC DEFAULT 0;
END $$;
