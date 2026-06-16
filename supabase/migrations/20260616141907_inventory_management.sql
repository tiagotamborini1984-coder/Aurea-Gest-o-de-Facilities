-- Setup buckets
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('product-images', 'product-images', true) 
  ON CONFLICT DO NOTHING;

  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('product-documents', 'product-documents', true) 
  ON CONFLICT DO NOTHING;
END $$;

-- storage policies for product-images
DROP POLICY IF EXISTS "Public access to product-images" ON storage.objects;
CREATE POLICY "Public access to product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated insert to product-images" ON storage.objects;
CREATE POLICY "Authenticated insert to product-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated update to product-images" ON storage.objects;
CREATE POLICY "Authenticated update to product-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

-- storage policies for product-documents
DROP POLICY IF EXISTS "Public access to product-documents" ON storage.objects;
CREATE POLICY "Public access to product-documents" ON storage.objects FOR SELECT USING (bucket_id = 'product-documents');

DROP POLICY IF EXISTS "Authenticated insert to product-documents" ON storage.objects;
CREATE POLICY "Authenticated insert to product-documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-documents');

DROP POLICY IF EXISTS "Authenticated update to product-documents" ON storage.objects;
CREATE POLICY "Authenticated update to product-documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-documents');

-- Tables
CREATE TABLE IF NOT EXISTS public.maintenance_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_of_measure TEXT,
  image_url TEXT,
  sds_url TEXT,
  current_stock NUMERIC DEFAULT 0,
  minimum_stock NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID REFERENCES public.plants(id) ON DELETE RESTRICT,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  area_id UUID REFERENCES public.maintenance_areas(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovado', 'Entregue', 'Rejeitado')),
  sap_reservation_number TEXT,
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.inventory_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.inventory_requests(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.inventory_products(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL
);

-- Trigger for stock decrement
CREATE OR REPLACE FUNCTION public.process_inventory_request()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'Entregue' AND NEW.status = 'Entregue' THEN
    -- decrement stock
    UPDATE public.inventory_products p
    SET current_stock = p.current_stock - i.quantity
    FROM public.inventory_request_items i
    WHERE i.request_id = NEW.id AND p.id = i.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_inventory_request_delivered ON public.inventory_requests;
CREATE TRIGGER on_inventory_request_delivered
  AFTER UPDATE OF status ON public.inventory_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.process_inventory_request();

-- RLS
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_products_select" ON public.inventory_products;
CREATE POLICY "inventory_products_select" ON public.inventory_products FOR SELECT USING (true);
DROP POLICY IF EXISTS "inventory_products_all" ON public.inventory_products;
CREATE POLICY "inventory_products_all" ON public.inventory_products FOR ALL USING (true);

ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_requests_select" ON public.inventory_requests;
CREATE POLICY "inventory_requests_select" ON public.inventory_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "inventory_requests_all" ON public.inventory_requests;
CREATE POLICY "inventory_requests_all" ON public.inventory_requests FOR ALL USING (true);

ALTER TABLE public.inventory_request_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_request_items_select" ON public.inventory_request_items;
CREATE POLICY "inventory_request_items_select" ON public.inventory_request_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "inventory_request_items_all" ON public.inventory_request_items;
CREATE POLICY "inventory_request_items_all" ON public.inventory_request_items FOR ALL USING (true);

ALTER TABLE public.maintenance_areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_areas_select" ON public.maintenance_areas;
CREATE POLICY "maintenance_areas_select" ON public.maintenance_areas FOR SELECT USING (true);
DROP POLICY IF EXISTS "maintenance_areas_all" ON public.maintenance_areas;
CREATE POLICY "maintenance_areas_all" ON public.maintenance_areas FOR ALL USING (true);
