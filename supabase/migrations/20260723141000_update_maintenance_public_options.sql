CREATE OR REPLACE FUNCTION public.get_maintenance_public_options(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_client_name TEXT;
  v_logo_url TEXT;
  v_primary_color TEXT;
  v_result JSONB;
BEGIN
  SELECT id, name, logo_url, primary_color INTO v_client_id, v_client_name, v_logo_url, v_primary_color 
  FROM public.clients WHERE url_slug = p_slug AND status = 'Ativo';
  
  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'client', jsonb_build_object('id', v_client_id, 'name', v_client_name, 'logo_url', v_logo_url, 'primary_color', v_primary_color),
    'plants', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM public.plants WHERE client_id = v_client_id), '[]'::jsonb),
    'locations', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id)) FROM public.locations WHERE client_id = v_client_id), '[]'::jsonb),
    'areas', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id)) FROM public.maintenance_areas WHERE client_id = v_client_id), '[]'::jsonb),
    'sublocations', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'location_id', location_id, 'area_id', area_id)) FROM public.maintenance_sublocations WHERE client_id = v_client_id), '[]'::jsonb),
    'assets', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id, 'location_id', location_id, 'sublocation_id', sublocation_id, 'area_id', area_id)) FROM public.maintenance_assets WHERE client_id = v_client_id AND status = 'Ativo'), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
