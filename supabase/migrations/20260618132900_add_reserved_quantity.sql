DO $$
BEGIN
  ALTER TABLE public.inventory_request_items ADD COLUMN IF NOT EXISTS reserved_quantity numeric;
END $$;
