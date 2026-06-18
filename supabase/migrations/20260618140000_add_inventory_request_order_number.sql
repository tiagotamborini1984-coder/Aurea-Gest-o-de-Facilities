-- 1. Add column
ALTER TABLE public.inventory_requests ADD COLUMN IF NOT EXISTS order_number TEXT;

-- 2. Create sequence
CREATE SEQUENCE IF NOT EXISTS inventory_requests_order_number_seq;

-- 3. Create function to set order number
CREATE OR REPLACE FUNCTION set_inventory_request_number()
RETURNS trigger AS $proc$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'REQ-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || lpad(nextval('inventory_requests_order_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$proc$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS inventory_requests_order_number_trigger ON public.inventory_requests;
CREATE TRIGGER inventory_requests_order_number_trigger
  BEFORE INSERT ON public.inventory_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_inventory_request_number();

-- 5. Backfill existing records safely
DO $do$
DECLARE
  req RECORD;
BEGIN
  FOR req IN SELECT id, created_at FROM public.inventory_requests WHERE order_number IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.inventory_requests
    SET order_number = 'REQ-' || to_char(req.created_at, 'YYYYMM') || '-' || lpad(nextval('inventory_requests_order_number_seq')::text, 4, '0')
    WHERE id = req.id;
  END LOOP;
END $do$;
