-- RLS: allow anon to SELECT plants for active clients (idempotent)
DROP POLICY IF EXISTS "anon_select_plants_public" ON public.plants;
CREATE POLICY "anon_select_plants_public" ON public.plants
  FOR SELECT TO anon USING (
    client_id IN (SELECT id FROM public.clients WHERE status = 'Ativo')
  );

-- RLS: allow anon to SELECT maintenance_areas for active clients
DROP POLICY IF EXISTS "anon_select_maintenance_areas_public" ON public.maintenance_areas;
CREATE POLICY "anon_select_maintenance_areas_public" ON public.maintenance_areas
  FOR SELECT TO anon USING (
    client_id IN (SELECT id FROM public.clients WHERE status = 'Ativo')
  );

-- Recreate get_maintenance_public_options to include secondary_color
CREATE OR REPLACE FUNCTION public.get_maintenance_public_options(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  v_client_id UUID;
  v_client_name TEXT;
  v_logo_url TEXT;
  v_primary_color TEXT;
  v_secondary_color TEXT;
  v_result JSONB;
BEGIN
  SELECT id, name, logo_url, primary_color, secondary_color
  INTO v_client_id, v_client_name, v_logo_url, v_primary_color, v_secondary_color
  FROM public.clients
  WHERE url_slug = p_slug AND status = 'Ativo';

  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'client', jsonb_build_object(
      'id', v_client_id,
      'name', v_client_name,
      'logo_url', v_logo_url,
      'primary_color', v_primary_color,
      'secondary_color', v_secondary_color
    ),
    'plants', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name))
       FROM public.plants WHERE client_id = v_client_id),
      '[]'::jsonb
    ),
    'areas', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id))
       FROM public.maintenance_areas WHERE client_id = v_client_id),
      '[]'::jsonb
    )
  ) INTO v_result;

  RETURN v_result;
END;
$BODY$;

GRANT EXECUTE ON FUNCTION public.get_maintenance_public_options(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_maintenance_public_options(TEXT) TO authenticated;

-- Ensure Aurea client exists
INSERT INTO public.clients (name, url_slug, status, primary_color, secondary_color)
VALUES ('Aurea', 'aurea-facility-management', 'Ativo', '#1f2937', '#1e3a8a')
ON CONFLICT (url_slug) DO NOTHING;

-- Seed plant 1 (Matriz) if not exists
INSERT INTO public.plants (client_id, name, code, city)
SELECT c.id, 'Matriz', '001', 'São Paulo'
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.plants p WHERE p.client_id = c.id AND p.code = '001'
  );

-- Seed plant 2 (Filial Campinas) if not exists
INSERT INTO public.plants (client_id, name, code, city)
SELECT c.id, 'Filial Campinas', '002', 'Campinas'
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.plants p WHERE p.client_id = c.id AND p.code = '002'
  );

-- Seed areas for every Aurea plant that has none
INSERT INTO public.maintenance_areas (client_id, plant_id, name)
SELECT c.id, p.id, 'Geral'
FROM public.clients c
JOIN public.plants p ON p.client_id = c.id
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_areas ma
    WHERE ma.client_id = c.id AND ma.plant_id = p.id
  );

-- Seed an extra area "Produção" on Matriz (plant 001) for validation
INSERT INTO public.maintenance_areas (client_id, plant_id, name)
SELECT c.id, p.id, 'Produção'
FROM public.clients c
JOIN public.plants p ON p.client_id = c.id
WHERE c.url_slug = 'aurea-facility-management'
  AND p.code = '001'
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_areas ma
    WHERE ma.client_id = c.id AND ma.plant_id = p.id AND ma.name = 'Produção'
  );

-- Ensure at least one maintenance status exists for ticket creation
INSERT INTO public.maintenance_statuses (client_id, name, color, step, is_terminal, order_index)
SELECT c.id, 'Aberto', '#3b82f6', 'Aberto', false, 0
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_statuses ms WHERE ms.client_id = c.id
  );

INSERT INTO public.maintenance_statuses (client_id, name, color, step, is_terminal, order_index)
SELECT c.id, 'Em Execução', '#f59e0b', 'Em Execução', false, 1
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_statuses ms
    WHERE ms.client_id = c.id AND ms.step = 'Em Execução'
  );

INSERT INTO public.maintenance_statuses (client_id, name, color, step, is_terminal, order_index)
SELECT c.id, 'Concluído', '#22c55e', 'Concluído', true, 2
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_statuses ms
    WHERE ms.client_id = c.id AND ms.step = 'Concluído'
  );
