-- Create maintenance_areas table independent from locations
CREATE TABLE IF NOT EXISTS public.maintenance_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fix RLS for maintenance_areas
ALTER TABLE public.maintenance_areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_maintenance_areas" ON public.maintenance_areas;
CREATE POLICY "tenant_isolation_maintenance_areas" ON public.maintenance_areas
    FOR ALL TO authenticated USING (get_user_role() = 'Master' OR client_id = get_user_client_id());

-- Add area_id references to maintenance tables
ALTER TABLE public.maintenance_sublocations ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.maintenance_areas(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_assets ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.maintenance_areas(id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.maintenance_areas(id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_preventive_plans ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.maintenance_areas(id) ON DELETE SET NULL;

-- Create Storage Bucket for Attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('maintenance_attachments', 'maintenance_attachments', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for Storage
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'maintenance_attachments');

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'maintenance_attachments');

DROP POLICY IF EXISTS "Anon Insert" ON storage.objects;
CREATE POLICY "Anon Insert" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'maintenance_attachments');

-- Update RPC to accept p_area_id and save photos array
DROP FUNCTION IF EXISTS public.submit_maintenance_ticket;
CREATE OR REPLACE FUNCTION public.submit_maintenance_ticket(
  p_client_id uuid, 
  p_plant_id uuid, 
  p_area_id uuid, 
  p_sublocation_id uuid, 
  p_asset_id uuid, 
  p_requester_name text, 
  p_requester_email text, 
  p_description text, 
  p_photos jsonb
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
    p_requester_name, p_requester_email, p_description, p_photos, 'Portal'
  ) RETURNING id INTO v_ticket_id;

  RETURN jsonb_build_object('success', true, 'ticket_number', v_ticket_number, 'id', v_ticket_id);
END;
$;

-- Update public options to expose areas instead of global locations
DROP FUNCTION IF EXISTS public.get_maintenance_public_options;
CREATE OR REPLACE FUNCTION public.get_maintenance_public_options(p_slug text)
RETURNS jsonb
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
    'plants', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name)), '[]'::jsonb) FROM public.plants WHERE client_id = v_client_id),
    'areas', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id)), '[]'::jsonb) FROM public.maintenance_areas WHERE client_id = v_client_id),
    'sublocations', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'area_id', area_id)), '[]'::jsonb) FROM public.maintenance_sublocations WHERE client_id = v_client_id),
    'assets', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id, 'area_id', area_id, 'sublocation_id', sublocation_id)), '[]'::jsonb) FROM public.maintenance_assets WHERE client_id = v_client_id AND status = 'Ativo')
  ) INTO v_result;

  RETURN v_result;
END;
$;
