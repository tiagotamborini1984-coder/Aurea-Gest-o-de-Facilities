-- 1. Seed user for immediate login capability
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
      '{"name": "Admin"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, role)
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'Administrador', 'Master')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 2. Populate registration_number for existing employees (Migration for legacy data)
DO $$
DECLARE
  r RECORD;
  v_seq INT;
BEGIN
  FOR r IN SELECT id, client_id, name, company_name FROM public.employees WHERE registration_number IS NULL ORDER BY created_at ASC LOOP
    -- Try to inherit from an existing record of the same person
    SELECT registration_number INTO r.registration_number
    FROM public.employees
    WHERE client_id = r.client_id
      AND lower(trim(name)) = lower(trim(r.name))
      AND lower(trim(company_name)) = lower(trim(r.company_name))
      AND registration_number IS NOT NULL
    LIMIT 1;

    -- Generate new if none found
    IF r.registration_number IS NULL THEN
      SELECT COALESCE(MAX(SUBSTRING(registration_number FROM 'REG-([0-9]+)')::INT), 0) + 1 INTO v_seq
      FROM public.employees
      WHERE client_id = r.client_id AND registration_number LIKE 'REG-%';
      
      r.registration_number := 'REG-' || LPAD(v_seq::TEXT, 5, '0');
    END IF;

    UPDATE public.employees SET registration_number = r.registration_number WHERE id = r.id;
  END LOOP;
END $$;

-- 3. Safety trigger for audit_actions null ID to prevent application errors
CREATE OR REPLACE FUNCTION public.set_audit_action_id_if_null()
RETURNS trigger AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_audit_action_id ON public.audit_actions;
CREATE TRIGGER ensure_audit_action_id
  BEFORE INSERT ON public.audit_actions
  FOR EACH ROW
  WHEN (NEW.id IS NULL)
  EXECUTE FUNCTION public.set_audit_action_id_if_null();
