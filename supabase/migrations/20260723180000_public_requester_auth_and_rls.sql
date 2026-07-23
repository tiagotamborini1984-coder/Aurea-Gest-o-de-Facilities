-- 1. Create requesters table for external users
CREATE TABLE IF NOT EXISTS public.requesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS on requesters
ALTER TABLE public.requesters ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for requesters (users can only access their own record)
DROP POLICY IF EXISTS "requester_select_own" ON public.requesters;
CREATE POLICY "requester_select_own" ON public.requesters
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "requester_insert_own" ON public.requesters;
CREATE POLICY "requester_insert_own" ON public.requesters
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "requester_update_own" ON public.requesters;
CREATE POLICY "requester_update_own" ON public.requesters
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. Allow authenticated requesters to SELECT their own maintenance tickets by email
DROP POLICY IF EXISTS "requester_select_own_tickets" ON public.maintenance_tickets;
CREATE POLICY "requester_select_own_tickets" ON public.maintenance_tickets
  FOR SELECT TO authenticated USING (
    requester_email = auth.jwt() ->> 'email'
  );

-- 5. Ensure anon can select maintenance_areas for active clients
DROP POLICY IF EXISTS "anon_select_maintenance_areas_public" ON public.maintenance_areas;
CREATE POLICY "anon_select_maintenance_areas_public" ON public.maintenance_areas
  FOR SELECT TO anon USING (
    client_id IN (SELECT id FROM public.clients WHERE status = 'Ativo')
  );

-- 6. Update handle_new_user to include name and role from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'Operacional')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Create trigger to auto-insert into requesters when a Solicitante signs up
CREATE OR REPLACE FUNCTION public.handle_new_requester()
RETURNS trigger AS $$
BEGIN
  IF NEW.raw_user_meta_data ->> 'role' = 'Solicitante' THEN
    INSERT INTO public.requesters (user_id, name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
      NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_requester ON auth.users;
CREATE TRIGGER on_auth_user_created_requester
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_requester();

-- 8. Grant anon execute on public functions (idempotent)
GRANT EXECUTE ON FUNCTION public.get_maintenance_public_options(text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text) TO anon;
