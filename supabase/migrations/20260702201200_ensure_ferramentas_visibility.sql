-- Ensure Ferramentas catalog visibility: data integrity, category sync, RLS, and client_id consistency
-- Idempotent: safe to run multiple times

-- Step 1: Ensure "Ferramentas" category exists for ALL clients
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM public.clients LOOP
    INSERT INTO public.inventory_categories (client_id, name)
    VALUES (c.id, 'Ferramentas')
    ON CONFLICT (client_id, name) DO NOTHING;
  END LOOP;
END $$;

-- Step 2: Normalize product categories — any product with category ILIKE 'ferramentas' 
-- gets the exact string 'Ferramentas'
UPDATE public.inventory_products
SET category = 'Ferramentas'
WHERE category ILIKE 'ferramentas'
  AND category != 'Ferramentas';

-- Step 3: Ensure all Ferramentas products have a non-null client_id
-- If client_id is NULL, assign to the first client (safety net)
UPDATE public.inventory_products
SET client_id = (SELECT id FROM public.clients ORDER BY created_at LIMIT 1)
WHERE category = 'Ferramentas'
  AND client_id IS NULL;

-- Step 4: Verify RLS policies on inventory_products
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_select_inventory_products" ON public.inventory_products
  FOR SELECT TO authenticated USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_insert_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_insert_inventory_products" ON public.inventory_products
  FOR INSERT TO authenticated WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_update_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_update_inventory_products" ON public.inventory_products
  FOR UPDATE TO authenticated USING (client_id = public.get_user_client_id()) WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_delete_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_delete_inventory_products" ON public.inventory_products
  FOR DELETE TO authenticated USING (client_id = public.get_user_client_id());

-- Step 5: Verify RLS policies on inventory_categories
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_inventory_categories" ON public.inventory_categories;
CREATE POLICY "authenticated_select_inventory_categories" ON public.inventory_categories
  FOR SELECT TO authenticated USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_insert_inventory_categories" ON public.inventory_categories;
CREATE POLICY "authenticated_insert_inventory_categories" ON public.inventory_categories
  FOR INSERT TO authenticated WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_update_inventory_categories" ON public.inventory_categories;
CREATE POLICY "authenticated_update_inventory_categories" ON public.inventory_categories
  FOR UPDATE TO authenticated USING (client_id = public.get_user_client_id()) WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "authenticated_delete_inventory_categories" ON public.inventory_categories;
CREATE POLICY "authenticated_delete_inventory_categories" ON public.inventory_categories
  FOR DELETE TO authenticated USING (client_id = public.get_user_client_id());

-- Step 6: RLS policies on inventory_requests and inventory_request_items
ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_requests_select" ON public.inventory_requests;
CREATE POLICY "inventory_requests_select" ON public.inventory_requests
  FOR SELECT TO authenticated USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "inventory_requests_all" ON public.inventory_requests;
CREATE POLICY "inventory_requests_all" ON public.inventory_requests
  FOR ALL TO authenticated USING (client_id = public.get_user_client_id()) WITH CHECK (client_id = public.get_user_client_id());

ALTER TABLE public.inventory_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_request_items_select" ON public.inventory_request_items;
CREATE POLICY "inventory_request_items_select" ON public.inventory_request_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_request_items_all" ON public.inventory_request_items;
CREATE POLICY "inventory_request_items_all" ON public.inventory_request_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Step 7: Informational count
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.inventory_products
  WHERE category = 'Ferramentas';
  
  RAISE NOTICE 'Total products with category "Ferramentas": %', v_count;
END $$;
