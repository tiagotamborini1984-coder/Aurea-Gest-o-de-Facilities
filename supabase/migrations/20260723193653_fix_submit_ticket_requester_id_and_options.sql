-- Update get_maintenance_public_options to include secondary_color
CREATE OR REPLACE FUNCTION public.get_maintenance_public_options(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM public.clients WHERE url_slug = p_slug AND status = 'Ativo';

  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'client', jsonb_build_object(
      'id', v_client_id, 'name', v_client_name, 'logo_url', v_logo_url,
      'primary_color', v_primary_color, 'secondary_color', v_secondary_color
    ),
    'plants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name))
      FROM public.plants WHERE client_id = v_client_id
    ), '[]'::jsonb),
    'areas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id))
      FROM public.maintenance_areas WHERE client_id = v_client_id
    ), '[]'::jsonb),
    'sublocations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'area_id', area_id))
      FROM public.maintenance_sublocations WHERE client_id = v_client_id
    ), '[]'::jsonb),
    'assets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id, 'area_id', area_id, 'sublocation_id', sublocation_id))
      FROM public.maintenance_assets WHERE client_id = v_client_id AND status = 'Ativo'
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_maintenance_public_options(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_maintenance_public_options(TEXT) TO authenticated;

-- Recreate submit_maintenance_ticket with p_requester_id parameter
DROP FUNCTION IF EXISTS public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text, uuid);

CREATE OR REPLACE FUNCTION public.submit_maintenance_ticket(
  p_client_id UUID,
  p_plant_id UUID,
  p_area_id UUID DEFAULT NULL,
  p_sublocation_id UUID DEFAULT NULL,
  p_asset_id UUID DEFAULT NULL,
  p_requester_name TEXT DEFAULT NULL,
  p_requester_email TEXT DEFAULT NULL,
  p_description TEXT DEFAULT '',
  p_photos JSONB DEFAULT '[]'::jsonb,
  p_origin TEXT DEFAULT 'public',
  p_requester_id UUID DEFAULT NULL
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
    requester_name, requester_email, description, photos, origin, requester_id, reported_at
  ) VALUES (
    v_ticket_number, p_client_id, p_plant_id, p_area_id, p_sublocation_id, p_asset_id, v_status_id,
    p_requester_name, p_requester_email, p_description, COALESCE(p_photos, '[]'::jsonb),
    COALESCE(p_origin, 'public'), p_requester_id, NOW()
  ) RETURNING id INTO v_ticket_id;

  RETURN jsonb_build_object('success', true, 'ticket_number', v_ticket_number, 'id', v_ticket_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_maintenance_ticket(UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_maintenance_ticket(UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, UUID) TO authenticated;
