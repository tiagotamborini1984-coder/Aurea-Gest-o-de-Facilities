DO $MIGRATION$
BEGIN
  -- RLS policies for plants for anon role to select if client matches aurea-facility-management
  DROP POLICY IF EXISTS "anon_select_plants_public" ON public.plants;
  CREATE POLICY "anon_select_plants_public" ON public.plants
    FOR SELECT TO anon USING (
      client_id IN (SELECT id FROM public.clients WHERE url_slug = 'aurea-facility-management' OR status = 'Ativo')
    );

  -- RLS policies for maintenance_areas for anon role
  DROP POLICY IF EXISTS "anon_select_maintenance_areas_public" ON public.maintenance_areas;
  CREATE POLICY "anon_select_maintenance_areas_public" ON public.maintenance_areas
    FOR SELECT TO anon USING (
      client_id IN (SELECT id FROM public.clients WHERE url_slug = 'aurea-facility-management' OR status = 'Ativo')
    );
END $MIGRATION$;

DO $SEED$
DECLARE
  v_client_id UUID;
  v_plant_id UUID;
BEGIN
  SELECT id INTO v_client_id FROM public.clients WHERE url_slug = 'aurea-facility-management';

  IF v_client_id IS NOT NULL THEN
    -- Seed Planta Principal
    IF NOT EXISTS (SELECT 1 FROM public.plants WHERE client_id = v_client_id AND name = 'Planta Principal') THEN
      INSERT INTO public.plants (client_id, name, code, city)
      VALUES (v_client_id, 'Planta Principal', 'PP-01', 'São Paulo')
      RETURNING id INTO v_plant_id;
    ELSE
      SELECT id INTO v_plant_id FROM public.plants WHERE client_id = v_client_id AND name = 'Planta Principal' LIMIT 1;
    END IF;

    -- Seed Área de Produção
    IF NOT EXISTS (SELECT 1 FROM public.maintenance_areas WHERE client_id = v_client_id AND plant_id = v_plant_id AND name = 'Área de Produção') THEN
      INSERT INTO public.maintenance_areas (client_id, plant_id, name)
      VALUES (v_client_id, v_plant_id, 'Área de Produção');
    END IF;
  END IF;
END $SEED$;
