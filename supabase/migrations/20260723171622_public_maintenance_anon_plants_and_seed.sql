-- Allow anon to SELECT plants belonging to active clients (for public maintenance portal)
DROP POLICY IF EXISTS "anon_select_plants_public" ON public.plants;
CREATE POLICY "anon_select_plants_public" ON public.plants
  FOR SELECT TO anon USING (
    client_id IN (SELECT id FROM public.clients WHERE status = 'Ativo')
  );

-- Seed aurea client if not exists
INSERT INTO public.clients (name, url_slug, status, primary_color, secondary_color)
VALUES ('Aurea', 'aurea-facility-management', 'Ativo', '#1f2937', '#1e3a8a')
ON CONFLICT (url_slug) DO NOTHING;

-- Seed a plant for aurea client if no plant exists yet
INSERT INTO public.plants (client_id, name, code, city)
SELECT c.id, 'Matriz', '001', 'São Paulo'
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (SELECT 1 FROM public.plants p WHERE p.client_id = c.id)
LIMIT 1;
