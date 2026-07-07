CREATE TABLE IF NOT EXISTS public.plant_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  asset_number TEXT,
  description TEXT NOT NULL,
  usage_instructions TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Operando',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.plant_tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plant_tools_select" ON public.plant_tools;
CREATE POLICY "plant_tools_select" ON public.plant_tools
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Master'
    OR client_id = public.get_user_client_id()
  );

DROP POLICY IF EXISTS "plant_tools_insert" ON public.plant_tools;
CREATE POLICY "plant_tools_insert" ON public.plant_tools
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'Master'
    OR client_id = public.get_user_client_id()
  );

DROP POLICY IF EXISTS "plant_tools_update" ON public.plant_tools;
CREATE POLICY "plant_tools_update" ON public.plant_tools
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'Master'
    OR client_id = public.get_user_client_id()
  )
  WITH CHECK (
    public.get_user_role() = 'Master'
    OR client_id = public.get_user_client_id()
  );

DROP POLICY IF EXISTS "plant_tools_delete" ON public.plant_tools;
CREATE POLICY "plant_tools_delete" ON public.plant_tools
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'Master'
    OR client_id = public.get_user_client_id()
  );

CREATE OR REPLACE FUNCTION public.update_plant_tools_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_plant_tools_updated_at ON public.plant_tools;
CREATE TRIGGER trigger_plant_tools_updated_at
  BEFORE UPDATE ON public.plant_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_plant_tools_updated_at();

CREATE INDEX IF NOT EXISTS idx_plant_tools_client_id ON public.plant_tools(client_id);
CREATE INDEX IF NOT EXISTS idx_plant_tools_plant_id ON public.plant_tools(plant_id);
