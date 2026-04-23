-- Ensure storage bucket exists for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('org_photos', 'org_photos', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for public bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'org_photos');
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'org_photos');

-- Tables
CREATE TABLE IF NOT EXISTS public.org_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.org_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.org_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.org_units(id) ON DELETE SET NULL,
    function_id UUID REFERENCES public.org_functions(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES public.org_collaborators(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_flowcharts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_flowcharts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_org_units" ON public.org_units;
CREATE POLICY "tenant_isolation_org_units" ON public.org_units FOR ALL TO authenticated 
USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_org_functions" ON public.org_functions;
CREATE POLICY "tenant_isolation_org_functions" ON public.org_functions FOR ALL TO authenticated 
USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_org_collaborators" ON public.org_collaborators;
CREATE POLICY "tenant_isolation_org_collaborators" ON public.org_collaborators FOR ALL TO authenticated 
USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_process_flowcharts" ON public.process_flowcharts;
CREATE POLICY "tenant_isolation_process_flowcharts" ON public.process_flowcharts FOR ALL TO authenticated 
USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());
