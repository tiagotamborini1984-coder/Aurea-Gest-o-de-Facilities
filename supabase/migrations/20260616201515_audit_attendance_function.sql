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

    INSERT INTO public.profiles (id, email, name, is_admin)
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'LP Tamborini', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_attendance_employees(p_plant_id UUID, p_date DATE)
RETURNS TABLE (
    id UUID,
    name TEXT,
    company_name TEXT,
    function_id UUID,
    location_id UUID,
    status TEXT,
    log_status BOOLEAN,
    log_id UUID
) AS $$
BEGIN
    IF NOT public.is_plant_authorized(p_plant_id) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT DISTINCT ON (e.id)
        e.id,
        e.name,
        e.company_name,
        e.function_id,
        e.location_id,
        e.status,
        l.status as log_status,
        l.id as log_id
    FROM public.employees e
    LEFT JOIN public.daily_logs l 
        ON l.reference_id = e.id 
        AND l.type = 'staff' 
        AND l.date::DATE = p_date
    WHERE e.plant_id = p_plant_id
      AND COALESCE(e.status, '') != 'Inativo'
    ORDER BY e.id, l.status DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
