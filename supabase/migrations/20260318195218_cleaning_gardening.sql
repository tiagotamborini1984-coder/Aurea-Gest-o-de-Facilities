-- Create cleaning and gardening areas table
CREATE TABLE public.cleaning_gardening_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('cleaning', 'gardening')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create schedules table
CREATE TABLE public.cleaning_gardening_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.cleaning_gardening_areas(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  start_time TIME NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Realizado', 'Não Realizado')),
  evidence_url TEXT,
  justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.cleaning_gardening_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select_areas" ON public.cleaning_gardening_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_areas" ON public.cleaning_gardening_areas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_areas" ON public.cleaning_gardening_areas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_areas" ON public.cleaning_gardening_areas FOR DELETE TO authenticated USING (true);

ALTER TABLE public.cleaning_gardening_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select_schedules" ON public.cleaning_gardening_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_schedules" ON public.cleaning_gardening_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_schedules" ON public.cleaning_gardening_schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_schedules" ON public.cleaning_gardening_schedules FOR DELETE TO authenticated USING (true);

-- Triggers for Audit Log
CREATE TRIGGER audit_cleaning_gardening_areas 
  AFTER INSERT OR DELETE OR UPDATE ON public.cleaning_gardening_areas 
  FOR EACH ROW EXECUTE FUNCTION log_audit_action();

CREATE TRIGGER audit_cleaning_gardening_schedules 
  AFTER INSERT OR DELETE OR UPDATE ON public.cleaning_gardening_schedules 
  FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- Storage Bucket for Evidence
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cleaning-evidence', 'cleaning-evidence', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "cleaning_public_access" ON storage.objects;
DROP POLICY IF EXISTS "cleaning_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "cleaning_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "cleaning_auth_delete" ON storage.objects;

CREATE POLICY "cleaning_public_access" ON storage.objects FOR SELECT USING (bucket_id = 'cleaning-evidence');
CREATE POLICY "cleaning_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cleaning-evidence');
CREATE POLICY "cleaning_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'cleaning-evidence');
CREATE POLICY "cleaning_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cleaning-evidence');
