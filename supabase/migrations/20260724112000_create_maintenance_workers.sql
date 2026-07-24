CREATE TABLE IF NOT EXISTS public.maintenance_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  discipline TEXT NOT NULL CHECK (
    discipline IN (
      'Manutentor',
      'Pedreiro',
      'Eletricista',
      'Pintor',
      'Auxiliar de Manutenção',
      'Auxiliar de Facilities'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.maintenance_workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_maintenance_workers" ON public.maintenance_workers;
CREATE POLICY "tenant_isolation_maintenance_workers" ON public.maintenance_workers
  FOR ALL TO authenticated
  USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  )
  WITH CHECK (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

CREATE INDEX IF NOT EXISTS idx_maintenance_workers_client_id ON public.maintenance_workers(client_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_workers_plant_id ON public.maintenance_workers(plant_id);
