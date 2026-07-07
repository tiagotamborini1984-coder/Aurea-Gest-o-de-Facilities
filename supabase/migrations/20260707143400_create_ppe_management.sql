CREATE TABLE IF NOT EXISTS public.ppe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ca_number TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ppe_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  ppe_id UUID NOT NULL REFERENCES public.ppe_items(id) ON DELETE CASCADE,
  person_type TEXT NOT NULL DEFAULT 'collaborator' CHECK (person_type IN ('collaborator', 'visitor')),
  collaborator_id UUID REFERENCES public.org_collaborators(id) ON DELETE SET NULL,
  visitor_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  loan_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  return_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Emprestado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ppe_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_ppe_items" ON public.ppe_items;
CREATE POLICY "tenant_isolation_ppe_items" ON public.ppe_items
  FOR ALL TO authenticated USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  ) WITH CHECK (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

ALTER TABLE public.ppe_loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_ppe_loans" ON public.ppe_loans;
CREATE POLICY "tenant_isolation_ppe_loans" ON public.ppe_loans
  FOR ALL TO authenticated USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  ) WITH CHECK (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

CREATE OR REPLACE FUNCTION public.sync_ppe_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT current_stock INTO v_current_stock FROM public.ppe_items WHERE id = NEW.ppe_id;
    IF v_current_stock IS NULL OR v_current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para este EPI';
    END IF;
    UPDATE public.ppe_items
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.ppe_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'Emprestado' AND NEW.status = 'Devolvido' THEN
    UPDATE public.ppe_items
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.ppe_id;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_ppe_loan_insert ON public.ppe_loans;
CREATE TRIGGER on_ppe_loan_insert
  AFTER INSERT ON public.ppe_loans
  FOR EACH ROW EXECUTE FUNCTION public.sync_ppe_stock();

DROP TRIGGER IF EXISTS on_ppe_loan_return ON public.ppe_loans;
CREATE TRIGGER on_ppe_loan_return
  AFTER UPDATE OF status ON public.ppe_loans
  FOR EACH ROW EXECUTE FUNCTION public.sync_ppe_stock();

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lptamborini@hotmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'lptamborini@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Master"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'Master', 'Master')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
