CREATE TABLE IF NOT EXISTS public.plant_non_working_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS plant_non_working_days_plant_id_date_key ON public.plant_non_working_days(plant_id, date);

ALTER TABLE public.plant_non_working_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access on plant_non_working_days" ON public.plant_non_working_days;
CREATE POLICY "Allow authenticated full access on plant_non_working_days" ON public.plant_non_working_days
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS audit_plant_non_working_days ON public.plant_non_working_days;
CREATE TRIGGER audit_plant_non_working_days AFTER INSERT OR DELETE OR UPDATE ON public.plant_non_working_days FOR EACH ROW EXECUTE FUNCTION log_audit_action();
