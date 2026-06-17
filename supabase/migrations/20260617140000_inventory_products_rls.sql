-- Enable RLS on inventory_products
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

-- Add default value for client_id to ensure tenant isolation
ALTER TABLE public.inventory_products 
  ALTER COLUMN client_id SET DEFAULT get_user_client_id();

-- Recreate policies for tenant isolation
DROP POLICY IF EXISTS "authenticated_select_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_select_inventory_products" ON public.inventory_products
  FOR SELECT TO authenticated USING (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_insert_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_insert_inventory_products" ON public.inventory_products
  FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_update_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_update_inventory_products" ON public.inventory_products
  FOR UPDATE TO authenticated USING (client_id = get_user_client_id()) WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "authenticated_delete_inventory_products" ON public.inventory_products;
CREATE POLICY "authenticated_delete_inventory_products" ON public.inventory_products
  FOR DELETE TO authenticated USING (client_id = get_user_client_id());

-- Seed data for testing
DO $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Get the first client to associate the seed products
  SELECT id INTO v_client_id FROM public.clients LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    INSERT INTO public.inventory_products (
      id, 
      client_id, 
      name, 
      description, 
      category, 
      unit_of_measure, 
      current_stock, 
      minimum_stock
    )
    VALUES 
      ('10000000-0000-4000-a000-000000000001'::uuid, v_client_id, 'Detergente Multiuso', 'Detergente para limpeza geral', 'Limpeza', 'LT', 50, 10),
      ('10000000-0000-4000-a000-000000000002'::uuid, v_client_id, 'Lâmpada LED 10W', 'Lâmpada branca 10W', 'Manutenção', 'UN', 100, 20),
      ('10000000-0000-4000-a000-000000000003'::uuid, v_client_id, 'Filtro de Ar AC', 'Filtro para ar condicionado split', 'Manutenção', 'UN', 30, 5)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
