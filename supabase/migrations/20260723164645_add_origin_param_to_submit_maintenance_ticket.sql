-- Add p_origin parameter to submit_maintenance_ticket so callers can specify the ticket origin
DROP FUNCTION IF EXISTS public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.submit_maintenance_ticket(
  p_client_id uuid,
  p_plant_id uuid,
  p_area_id uuid,
  p_sublocation_id uuid,
  p_asset_id uuid,
  p_requester_name text,
  p_requester_email text,
  p_description text,
  p_photos jsonb,
  p_origin text DEFAULT 'Portal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_number TEXT;
  v_status_id UUID;
  v_ticket_id UUID;
  v_year TEXT;
  v_seq INT;
BEGIN
  SELECT id INTO v_status_id FROM public.maintenance_statuses WHERE client_id = p_client_id ORDER BY order_index ASC LIMIT 1;

  v_year := to_char(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq FROM public.maintenance_tickets WHERE client_id = p_client_id AND ticket_number LIKE 'MAN-' || v_year || '-%';
  v_ticket_number := 'MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO public.maintenance_tickets (
    ticket_number, client_id, plant_id, area_id, sublocation_id, asset_id, status_id,
    requester_name, requester_email, description, photos, origin
  ) VALUES (
    v_ticket_number, p_client_id, p_plant_id, p_area_id, p_sublocation_id, p_asset_id, v_status_id,
    p_requester_name, p_requester_email, p_description, p_photos, p_origin
  ) RETURNING id INTO v_ticket_id;

  RETURN jsonb_build_object('success', true, 'ticket_number', v_ticket_number, 'id', v_ticket_id);
END;
$$;
