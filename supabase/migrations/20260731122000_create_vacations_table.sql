CREATE TABLE IF NOT EXISTS public.vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.org_collaborators(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'approved', 'completed', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_vacations" ON public.vacations;
CREATE POLICY "tenant_isolation_vacations" ON public.vacations
  FOR ALL TO authenticated USING (
    (public.get_user_role() = 'Master' OR client_id = public.get_user_client_id())
    AND public.is_plant_authorized(plant_id)
  ) WITH CHECK (
    (public.get_user_role() = 'Master' OR client_id = public.get_user_client_id())
    AND public.is_plant_authorized(plant_id)
  );

CREATE INDEX IF NOT EXISTS idx_vacations_client_plant ON public.vacations(client_id, plant_id);
CREATE INDEX IF NOT EXISTS idx_vacations_collaborator ON public.vacations(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON public.vacations(status);
CREATE INDEX IF NOT EXISTS idx_vacations_dates ON public.vacations(start_date, end_date);

CREATE OR REPLACE FUNCTION public.update_vacations_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vacations_updated_at ON public.vacations;
CREATE TRIGGER trg_vacations_updated_at
  BEFORE UPDATE ON public.vacations
  FOR EACH ROW EXECUTE FUNCTION public.update_vacations_updated_at();

DO $$
BEGIN
  UPDATE public.clients
  SET modules = modules || to_jsonb('Férias'::text)
  WHERE NOT modules @> to_jsonb('Férias'::text);
END $$;
