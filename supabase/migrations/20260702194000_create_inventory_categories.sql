CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_categories_client_id_name_key
  ON public.inventory_categories (client_id, name);

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

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM public.clients LOOP
    INSERT INTO public.inventory_categories (client_id, name)
    VALUES
      (c.id, 'Limpeza'),
      (c.id, 'Higiene'),
      (c.id, 'Escritorio')
    ON CONFLICT (client_id, name) DO NOTHING;
  END LOOP;
END $$;
