-- Migration for Gestão de Terceiros

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Operacional',
  accessible_menus JSONB DEFAULT '[]'::jsonb,
  authorized_plants JSONB DEFAULT '[]'::jsonb,
  force_password_change BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  function_id UUID REFERENCES public.functions(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.contracted_headcount (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('colaborador', 'equipamento')),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  function_id UUID REFERENCES public.functions(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.goals_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('staff', 'equipment')),
  reference_id UUID NOT NULL,
  status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, type, reference_id)
);

CREATE TABLE public.monthly_goals_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals_book(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plant_id, goal_id, reference_month)
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Enablement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracted_headcount ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_goals_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated full access on profiles" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on plants" ON public.plants FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on locations" ON public.locations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on functions" ON public.functions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on employees" ON public.employees FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on equipment" ON public.equipment FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on contracted_headcount" ON public.contracted_headcount FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on goals_book" ON public.goals_book FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on daily_logs" ON public.daily_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on monthly_goals_data" ON public.monthly_goals_data FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true);

-- Trigger for Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'Operacional');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed the Master User Profile and a Demo Client
DO $$
DECLARE
  master_user_id UUID;
  demo_client_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.clients (id, name, url_slug, admin_name, primary_color, secondary_color, modules)
  VALUES (demo_client_id, 'Demo Corp', 'demo-corp', 'Master Admin', '#1e3a8a', '#0ea5e9', '["Gestão de Terceiros"]')
  ON CONFLICT (url_slug) DO NOTHING;
  
  SELECT id INTO master_user_id FROM auth.users WHERE email = 'admin@aurea.com' LIMIT 1;
  IF master_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, name, role, client_id) 
    VALUES (master_user_id, 'admin@aurea.com', 'Master User', 'Master', demo_client_id)
    ON CONFLICT (id) DO UPDATE SET role = 'Master', client_id = demo_client_id;
  END IF;
END $$;
