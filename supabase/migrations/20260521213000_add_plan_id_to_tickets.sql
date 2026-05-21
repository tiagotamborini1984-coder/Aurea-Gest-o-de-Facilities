ALTER TABLE public.maintenance_tickets 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.maintenance_preventive_plans(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "tenant_isolation_maintenance_tickets" ON public.maintenance_tickets;
CREATE POLICY "tenant_isolation_maintenance_tickets" ON public.maintenance_tickets
FOR ALL TO authenticated
USING (
  is_client_active() AND 
  (
    (get_user_role() = 'Master') OR 
    (client_id = get_user_client_id() AND is_plant_authorized(plant_id))
  )
)
WITH CHECK (
  is_client_active() AND 
  (
    (get_user_role() = 'Master') OR 
    (client_id = get_user_client_id() AND is_plant_authorized(plant_id))
  )
);

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
      '{"name": "LP Tamborini"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, role, client_id)
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'LP Tamborini', 'Master', NULL)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
