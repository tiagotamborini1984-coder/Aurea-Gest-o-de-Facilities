-- 1. Allow anon to read active clients for public slug lookup
DROP POLICY IF EXISTS "anon_select_clients_public" ON public.clients;
CREATE POLICY "anon_select_clients_public" ON public.clients
  FOR SELECT TO anon USING (status = 'Ativo');

-- 2. Grant execute on public functions to anon role
GRANT EXECUTE ON FUNCTION public.get_maintenance_public_options(text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text) TO anon;

-- 3. Update submit_maintenance_ticket to accept and use p_origin parameter
DROP FUNCTION IF EXISTS public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text);

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
