-- Ensure public maintenance portal has correct RLS, grants, storage, and seed data

-- 1. RLS: anon can SELECT active clients (for slug lookup)
DROP POLICY IF EXISTS "anon_select_clients_public" ON public.clients;
CREATE POLICY "anon_select_clients_public" ON public.clients
  FOR SELECT TO anon USING (status = 'Ativo');

-- 2. RLS: anon can SELECT plants for active clients
DROP POLICY IF EXISTS "anon_select_plants_public" ON public.plants;
CREATE POLICY "anon_select_plants_public" ON public.plants
  FOR SELECT TO anon USING (
    client_id IN (SELECT id FROM public.clients WHERE status = 'Ativo')
  );

-- 3. RLS: anon can SELECT maintenance_areas for active clients
DROP POLICY IF EXISTS "anon_select_maintenance_areas_public" ON public.maintenance_areas;
CREATE POLICY "anon_select_maintenance_areas_public" ON public.maintenance_areas
  FOR SELECT TO anon USING (
    client_id IN (SELECT id FROM public.clients WHERE status = 'Ativo')
  );

-- 4. Ensure submit_maintenance_ticket function has correct signature with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.submit_maintenance_ticket(
  p_client_id UUID,
  p_plant_id UUID,
  p_area_id UUID,
  p_sublocation_id UUID,
  p_asset_id UUID,
  p_requester_name TEXT,
  p_requester_email TEXT,
  p_description TEXT,
  p_photos JSONB,
  p_origin TEXT DEFAULT 'Manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_number TEXT;
  v_status_id UUID;
  v_ticket_id UUID;
  v_year TEXT;
  v_seq INT;
BEGIN
  SELECT id INTO v_status_id FROM public.maintenance_statuses
  WHERE client_id = p_client_id ORDER BY order_index ASC LIMIT 1;

  v_year := to_char(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq FROM public.maintenance_tickets
  WHERE client_id = p_client_id AND ticket_number LIKE 'MAN-' || v_year || '-%';
  v_ticket_number := 'MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO public.maintenance_tickets (
    ticket_number, client_id, plant_id, area_id, sublocation_id, asset_id, status_id,
    requester_name, requester_email, description, photos, origin
  ) VALUES (
    v_ticket_number, p_client_id, p_plant_id, p_area_id, p_sublocation_id, p_asset_id, v_status_id,
    p_requester_name, p_requester_email, p_description, p_photos, COALESCE(p_origin, 'Manual')
  ) RETURNING id INTO v_ticket_id;

  RETURN jsonb_build_object('success', true, 'ticket_number', v_ticket_number, 'id', v_ticket_id);
END;
$$;

-- 5. Grant execute to anon so public form can submit tickets
GRANT EXECUTE ON FUNCTION public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text) TO anon;

-- 6. Ensure storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance_attachments', 'maintenance_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage policies for anon (read + upload photos)
DROP POLICY IF EXISTS "anon_select_maintenance_attachments" ON storage.objects;
CREATE POLICY "anon_select_maintenance_attachments" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'maintenance_attachments');

DROP POLICY IF EXISTS "anon_insert_maintenance_attachments" ON storage.objects;
CREATE POLICY "anon_insert_maintenance_attachments" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'maintenance_attachments');

-- 8. Idempotent seed: Aurea client
INSERT INTO public.clients (name, url_slug, status, primary_color, secondary_color)
VALUES ('Aurea', 'aurea-facility-management', 'Ativo', '#1f2937', '#1e3a8a')
ON CONFLICT (url_slug) DO NOTHING;

-- 9. Idempotent seed: plants
INSERT INTO public.plants (client_id, name, code, city)
SELECT c.id, 'Matriz', '001', 'São Paulo'
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.plants p WHERE p.client_id = c.id AND p.code = '001'
  );

INSERT INTO public.plants (client_id, name, code, city)
SELECT c.id, 'Filial Campinas', '002', 'Campinas'
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.plants p WHERE p.client_id = c.id AND p.code = '002'
  );

-- 10. Idempotent seed: maintenance areas for each plant
INSERT INTO public.maintenance_areas (client_id, plant_id, name)
SELECT c.id, p.id, 'Geral'
FROM public.clients c
JOIN public.plants p ON p.client_id = c.id
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_areas ma
    WHERE ma.client_id = c.id AND ma.plant_id = p.id
  );

-- 11. Idempotent seed: maintenance statuses
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
