-- SaaS features for Aurea
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS plan_type TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.is_client_active()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_role text;
  v_client_id uuid;
  v_status text;
BEGIN
  SELECT role, client_id INTO v_role, v_client_id FROM public.profiles WHERE id = auth.uid();
  IF v_role = 'Master' THEN
    RETURN true;
  END IF;
  IF v_client_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT status INTO v_status FROM public.clients WHERE id = v_client_id;
  RETURN v_status = 'Ativo';
END;
$function$;

-- Update policies for accidents
DROP POLICY IF EXISTS "plant_isolation_accidents" ON public.accidents;
CREATE POLICY "plant_isolation_accidents" ON public.accidents
  FOR ALL TO authenticated
  USING (
    public.is_client_active() AND 
    (((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id())) AND public.is_plant_authorized(plant_id))
  )
  WITH CHECK (
    public.is_client_active() AND 
    (((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id())) AND public.is_plant_authorized(plant_id))
  );

-- Update policies for tasks
DROP POLICY IF EXISTS "authenticated_select_tasks" ON public.tasks;
CREATE POLICY "authenticated_select_tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    public.is_client_active() AND 
    ((public.get_user_role() = 'Master'::text) OR ((client_id = public.get_user_client_id()) AND (public.is_plant_authorized(plant_id) OR (requester_id = auth.uid()) OR (assignee_id = auth.uid()))))
  );

DROP POLICY IF EXISTS "authenticated_insert_tasks" ON public.tasks;
CREATE POLICY "authenticated_insert_tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_client_active() AND 
    ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()))
  );

DROP POLICY IF EXISTS "authenticated_update_tasks" ON public.tasks;
CREATE POLICY "authenticated_update_tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_client_active() AND 
    ((public.get_user_role() = 'Master'::text) OR ((client_id = public.get_user_client_id()) AND (public.is_plant_authorized(plant_id) OR (requester_id = auth.uid()) OR (assignee_id = auth.uid()))))
  )
  WITH CHECK (
    public.is_client_active() AND 
    ((public.get_user_role() = 'Master'::text) OR ((client_id = public.get_user_client_id()) AND (public.is_plant_authorized(plant_id) OR (requester_id = auth.uid()) OR (assignee_id = auth.uid()))))
  );

DROP POLICY IF EXISTS "authenticated_delete_tasks" ON public.tasks;
CREATE POLICY "authenticated_delete_tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    public.is_client_active() AND 
    ((public.get_user_role() = 'Master'::text) OR ((client_id = public.get_user_client_id()) AND public.is_plant_authorized(plant_id)))
  );

-- Update policies for maintenance_tickets
DROP POLICY IF EXISTS "tenant_isolation_maintenance_tickets" ON public.maintenance_tickets;
CREATE POLICY "tenant_isolation_maintenance_tickets" ON public.maintenance_tickets
  FOR ALL TO authenticated
  USING (
    public.is_client_active() AND 
    ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()))
  )
  WITH CHECK (
    public.is_client_active() AND 
    ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()))
  );

-- Seed initial master user
DO $DO$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lptamborini@hotmail.com') THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'lptamborini@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Master Admin"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, role)
    VALUES (v_user_id, 'lptamborini@hotmail.com', 'Master Admin', 'Master')
    ON CONFLICT (id) DO UPDATE SET role = 'Master';
  END IF;
END $DO$;
