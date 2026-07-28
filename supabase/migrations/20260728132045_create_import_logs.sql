CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  module TEXT NOT NULL DEFAULT 'inventory',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_products INTEGER NOT NULL DEFAULT 0,
  inserted_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_type TEXT NOT NULL DEFAULT 'upsert'
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_logs_select" ON public.import_logs;
CREATE POLICY "import_logs_select" ON public.import_logs
  FOR SELECT TO authenticated USING (client_id = get_user_client_id());

DROP POLICY IF EXISTS "import_logs_insert" ON public.import_logs;
CREATE POLICY "import_logs_insert" ON public.import_logs
  FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "import_logs_delete" ON public.import_logs;
CREATE POLICY "import_logs_delete" ON public.import_logs
  FOR DELETE TO authenticated USING (
    client_id = get_user_client_id()
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'Master'
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_import_logs_client_id ON public.import_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON public.import_logs(created_at DESC);
