-- 1. Create table
CREATE TABLE IF NOT EXISTS public.sector_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  expiration_date DATE NOT NULL,
  alert_lead_days INTEGER NOT NULL DEFAULT 30,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.sector_documents ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for sector_documents
DROP POLICY IF EXISTS "sector_documents_select" ON public.sector_documents;
CREATE POLICY "sector_documents_select" ON public.sector_documents
  FOR SELECT TO authenticated
  USING (
    public.is_client_active() AND (
      (public.get_user_role() = 'Master') OR 
      (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id))
    )
  );

DROP POLICY IF EXISTS "sector_documents_insert" ON public.sector_documents;
CREATE POLICY "sector_documents_insert" ON public.sector_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_client_active() AND (
      (public.get_user_role() = 'Master') OR 
      (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id))
    )
  );

DROP POLICY IF EXISTS "sector_documents_update" ON public.sector_documents;
CREATE POLICY "sector_documents_update" ON public.sector_documents
  FOR UPDATE TO authenticated
  USING (
    public.is_client_active() AND (
      (public.get_user_role() = 'Master') OR 
      (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id))
    )
  )
  WITH CHECK (
    public.is_client_active() AND (
      (public.get_user_role() = 'Master') OR 
      (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id))
    )
  );

DROP POLICY IF EXISTS "sector_documents_delete" ON public.sector_documents;
CREATE POLICY "sector_documents_delete" ON public.sector_documents
  FOR DELETE TO authenticated
  USING (
    public.is_client_active() AND (
      (public.get_user_role() = 'Master') OR 
      (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id))
    )
  );

-- 4. Create trigger for audit logs
DROP TRIGGER IF EXISTS audit_sector_documents ON public.sector_documents;
CREATE TRIGGER audit_sector_documents
  AFTER INSERT OR DELETE OR UPDATE ON public.sector_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

-- 5. Create storage bucket "documents"
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Policies for "documents" bucket
DROP POLICY IF EXISTS "documents_bucket_select" ON storage.objects;
CREATE POLICY "documents_bucket_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_insert" ON storage.objects;
CREATE POLICY "documents_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_update" ON storage.objects;
CREATE POLICY "documents_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_delete" ON storage.objects;
CREATE POLICY "documents_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents');
