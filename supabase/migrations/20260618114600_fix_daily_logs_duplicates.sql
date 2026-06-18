DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed user
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
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, role)
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'Admin', 'Admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Clean duplicates in daily_logs
  DELETE FROM public.daily_logs
  WHERE id IN (
    SELECT id
    FROM (
      SELECT id,
      ROW_NUMBER() OVER (PARTITION BY client_id, plant_id, reference_id, date, type ORDER BY created_at DESC) as rnum
      FROM public.daily_logs
    ) t
    WHERE t.rnum > 1
  );

  -- Drop existing unique constraint/index if any
  ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_date_type_reference_id_key;
  DROP INDEX IF EXISTS daily_logs_date_type_reference_id_key;
  ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_client_plant_ref_date_type_key;
  DROP INDEX IF EXISTS daily_logs_client_plant_ref_date_type_key;

  -- Add the new unique constraint
  ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_client_plant_ref_date_type_key UNIQUE (client_id, plant_id, reference_id, date, type);

END $$;

-- Overload 1: (uuid, text, uuid[]) -> RETURNS TABLE ...
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id uuid,
  p_reference_month text,
  p_staff_log_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS TABLE (
  id uuid,
  name text,
  company_name text,
  function_id uuid,
  status text,
  registration_number text,
  reference_month date,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (e.id)
    e.id,
    e.name,
    e.company_name,
    e.function_id,
    e.status,
    e.registration_number,
    e.reference_month,
    e.created_at
  FROM public.employees e
  WHERE e.plant_id = p_plant_id
    AND (
      e.status = 'Ativo'
      OR (e.status = 'Inativo' AND e.reference_month > p_reference_month::date)
      OR (p_staff_log_ids IS NOT NULL AND e.id = ANY(p_staff_log_ids))
    )
  ORDER BY e.id, e.created_at DESC;
END;
$function$;

-- Overload 2: (uuid, date) -> RETURNS TABLE ...
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id uuid,
  p_date date
)
RETURNS TABLE (
  id uuid,
  name text,
  company_name text,
  function_id uuid,
  location_id uuid,
  status text,
  log_id uuid,
  log_status boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (e.id)
    e.id,
    e.name,
    e.company_name,
    e.function_id,
    e.location_id,
    e.status,
    l.id AS log_id,
    l.status AS log_status
  FROM public.employees e
  LEFT JOIN public.daily_logs l 
    ON l.reference_id = e.id 
   AND l.plant_id = e.plant_id 
   AND l.date = p_date 
   AND l.type = 'staff'
  WHERE e.plant_id = p_plant_id
    AND e.status = 'Ativo'
  ORDER BY e.id, l.created_at DESC;
END;
$function$;

-- Overload 3: (uuid, uuid[], text) -> RETURNS SETOF employees
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_client_id uuid,
  p_plant_ids uuid[] DEFAULT NULL::uuid[],
  p_reference_month text DEFAULT NULL::text
)
RETURNS SETOF employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (e.id) e.*
  FROM public.employees e
  WHERE e.client_id = p_client_id
    AND (p_plant_ids IS NULL OR e.plant_id = ANY(p_plant_ids))
    AND (p_reference_month IS NULL OR e.reference_month = p_reference_month::date)
  ORDER BY e.id, e.created_at DESC;
END;
$function$;

-- Overload 4: (uuid, character varying, uuid[]) -> RETURNS SETOF employees
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id uuid,
  p_reference_month character varying,
  p_staff_log_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS SETOF employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (e.id) e.*
  FROM public.employees e
  WHERE e.plant_id = p_plant_id
    AND (
      e.status = 'Ativo'
      OR (e.status = 'Inativo' AND e.reference_month > p_reference_month::date)
      OR (p_staff_log_ids IS NOT NULL AND e.id = ANY(p_staff_log_ids))
    )
  ORDER BY e.id, e.created_at DESC;
END;
$function$;
