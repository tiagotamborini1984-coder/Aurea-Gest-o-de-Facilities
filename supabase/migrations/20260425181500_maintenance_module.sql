DO $MIGRATION$
BEGIN

-- Create new tables for Gestão da Manutenção

CREATE TABLE IF NOT EXISTS public.maintenance_sublocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  sublocation_id UUID REFERENCES public.maintenance_sublocations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sla_hours NUMERIC NOT NULL DEFAULT 24,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Reativo', -- 'Proativo' or 'Reativo'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  step TEXT NOT NULL DEFAULT 'Aberto', -- 'Aberto', 'Planejado', 'Em Execução', 'Concluído', 'Encerrado'
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  sublocation_id UUID REFERENCES public.maintenance_sublocations(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.maintenance_assets(id) ON DELETE SET NULL,
  type_id UUID REFERENCES public.maintenance_types(id) ON DELETE SET NULL,
  priority_id UUID REFERENCES public.maintenance_priorities(id) ON DELETE SET NULL,
  status_id UUID REFERENCES public.maintenance_statuses(id) ON DELETE SET NULL,
  requester_name TEXT,
  requester_email TEXT,
  description TEXT NOT NULL,
  photos JSONB DEFAULT '[]'::jsonb,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  closure_notes TEXT,
  closure_photos JSONB DEFAULT '[]'::jsonb,
  origin TEXT NOT NULL DEFAULT 'Manual', -- 'Manual', 'Portal', 'Preventiva'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_tickets_ticket_number_idx ON public.maintenance_tickets (client_id, ticket_number);

CREATE TABLE IF NOT EXISTS public.maintenance_preventive_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  asset_id UUID REFERENCES public.maintenance_assets(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  type_id UUID REFERENCES public.maintenance_types(id) ON DELETE SET NULL,
  priority_id UUID REFERENCES public.maintenance_priorities(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'Mensal', -- 'Diária', 'Semanal', 'Mensal', 'Semestral', 'Anual'
  start_date DATE NOT NULL,
  last_generated_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.maintenance_sublocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_preventive_plans ENABLE ROW LEVEL SECURITY;

END $MIGRATION$;

-- Setup RLS Policies (Idempotent)

DROP POLICY IF EXISTS "tenant_isolation_maintenance_sublocations" ON public.maintenance_sublocations;
CREATE POLICY "tenant_isolation_maintenance_sublocations" ON public.maintenance_sublocations 
  FOR ALL TO authenticated USING (get_user_role() = 'Master' OR client_id = get_user_client_id()) 
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_maintenance_assets" ON public.maintenance_assets;
CREATE POLICY "tenant_isolation_maintenance_assets" ON public.maintenance_assets 
  FOR ALL TO authenticated USING (get_user_role() = 'Master' OR client_id = get_user_client_id()) 
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_maintenance_priorities" ON public.maintenance_priorities;
CREATE POLICY "tenant_isolation_maintenance_priorities" ON public.maintenance_priorities 
  FOR ALL TO authenticated USING (get_user_role() = 'Master' OR client_id = get_user_client_id()) 
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_maintenance_types" ON public.maintenance_types;
CREATE POLICY "tenant_isolation_maintenance_types" ON public.maintenance_types 
  FOR ALL TO authenticated USING (get_user_role() = 'Master' OR client_id = get_user_client_id()) 
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_maintenance_statuses" ON public.maintenance_statuses;
CREATE POLICY "tenant_isolation_maintenance_statuses" ON public.maintenance_statuses 
  FOR ALL TO authenticated USING (get_user_role() = 'Master' OR client_id = get_user_client_id()) 
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_maintenance_tickets" ON public.maintenance_tickets;
CREATE POLICY "tenant_isolation_maintenance_tickets" ON public.maintenance_tickets 
  FOR ALL TO authenticated USING (get_user_role() = 'Master' OR client_id = get_user_client_id()) 
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_maintenance_preventive_plans" ON public.maintenance_preventive_plans;
CREATE POLICY "tenant_isolation_maintenance_preventive_plans" ON public.maintenance_preventive_plans 
  FOR ALL TO authenticated USING (get_user_role() = 'Master' OR client_id = get_user_client_id()) 
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

-- Public API functions for Portal

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
    'plants', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name)), '[]'::jsonb) FROM public.plants WHERE client_id = v_client_id),
    'locations', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id)), '[]'::jsonb) FROM public.locations WHERE client_id = v_client_id),
    'sublocations', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'location_id', location_id)), '[]'::jsonb) FROM public.maintenance_sublocations WHERE client_id = v_client_id),
    'assets', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'plant_id', plant_id, 'location_id', location_id, 'sublocation_id', sublocation_id)), '[]'::jsonb) FROM public.maintenance_assets WHERE client_id = v_client_id AND status = 'Ativo')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_maintenance_ticket(
  p_client_id UUID,
  p_plant_id UUID,
  p_location_id UUID,
  p_sublocation_id UUID,
  p_asset_id UUID,
  p_requester_name TEXT,
  p_requester_email TEXT,
  p_description TEXT,
  p_photos JSONB
)
RETURNS JSONB
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
  -- Get initial status
  SELECT id INTO v_status_id FROM public.maintenance_statuses WHERE client_id = p_client_id ORDER BY order_index ASC LIMIT 1;
  
  -- Generate Ticket Number
  v_year := to_char(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq FROM public.maintenance_tickets WHERE client_id = p_client_id AND ticket_number LIKE 'MAN-' || v_year || '-%';
  v_ticket_number := 'MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO public.maintenance_tickets (
    ticket_number, client_id, plant_id, location_id, sublocation_id, asset_id, status_id,
    requester_name, requester_email, description, photos, origin
  ) VALUES (
    v_ticket_number, p_client_id, p_plant_id, p_location_id, p_sublocation_id, p_asset_id, v_status_id,
    p_requester_name, p_requester_email, p_description, p_photos, 'Portal'
  ) RETURNING id INTO v_ticket_id;

  RETURN jsonb_build_object('success', true, 'ticket_number', v_ticket_number, 'id', v_ticket_id);
END;
$$;
