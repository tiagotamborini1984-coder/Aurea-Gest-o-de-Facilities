-- locker_collaborators
CREATE TABLE IF NOT EXISTS public.locker_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- lockers
CREATE TABLE IF NOT EXISTS public.lockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  identification TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- locker_occupations
CREATE TABLE IF NOT EXISTS public.locker_occupations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  locker_id UUID NOT NULL REFERENCES public.lockers(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.locker_collaborators(id) ON DELETE CASCADE,
  key_delivery_date DATE NOT NULL,
  return_date DATE,
  term_url TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.locker_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_locker_collaborators" ON public.locker_collaborators;
CREATE POLICY "tenant_isolation_locker_collaborators" ON public.locker_collaborators
  FOR ALL TO authenticated USING ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
  WITH CHECK ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()));

ALTER TABLE public.lockers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_lockers" ON public.lockers;
CREATE POLICY "tenant_isolation_lockers" ON public.lockers
  FOR ALL TO authenticated USING ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
  WITH CHECK ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()));

ALTER TABLE public.locker_occupations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_locker_occupations" ON public.locker_occupations;
CREATE POLICY "tenant_isolation_locker_occupations" ON public.locker_occupations
  FOR ALL TO authenticated USING ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
  WITH CHECK ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()));

CREATE UNIQUE INDEX IF NOT EXISTS one_active_locker_per_collab 
  ON public.locker_occupations (collaborator_id) WHERE status = 'Ativo';

-- Seed data for smooth onboarding
DO $$
DECLARE
  v_client_id uuid;
  v_plant_id uuid;
  v_collab_id uuid;
  v_locker_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients LIMIT 1;
  SELECT id INTO v_plant_id FROM public.plants WHERE client_id = v_client_id LIMIT 1;

  IF v_client_id IS NOT NULL AND v_plant_id IS NOT NULL THEN
    INSERT INTO public.locker_collaborators (client_id, name, document, phone)
    VALUES 
      (v_client_id, 'João Silva', '12345678900', '11999999999'),
      (v_client_id, 'Maria Souza', '09876543211', '11888888888')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.lockers (client_id, plant_id, location, identification, description)
    VALUES 
      (v_client_id, v_plant_id, 'Vestiário Masculino', 'L01', 'Locker superior'),
      (v_client_id, v_plant_id, 'Vestiário Masculino', 'L02', 'Locker inferior'),
      (v_client_id, v_plant_id, 'Vestiário Feminino', 'F01', 'Locker superior')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.locker_occupations (client_id, locker_id, collaborator_id, key_delivery_date, status)
    SELECT v_client_id, l.id, c.id, CURRENT_DATE, 'Ativo'
    FROM public.lockers l
    JOIN public.locker_collaborators c ON c.client_id = v_client_id
    WHERE l.identification = 'L01' AND c.name = 'João Silva'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
