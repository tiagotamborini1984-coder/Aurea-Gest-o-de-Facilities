DO $$
BEGIN
    ALTER TABLE public.inventory_products DROP COLUMN IF EXISTS current_stock;
    ALTER TABLE public.inventory_products DROP COLUMN IF EXISTS minimum_stock;
END $$;
