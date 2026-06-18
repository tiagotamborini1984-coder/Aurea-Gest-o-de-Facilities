DO $$
BEGIN
  -- Deduplicate daily_logs keeping the most recent one
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER(
             PARTITION BY client_id, plant_id, reference_id, date, type
             ORDER BY created_at DESC
           ) as row_num
    FROM public.daily_logs
  )
  DELETE FROM public.daily_logs
  WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

  -- Drop existing unique constraints/indexes on daily_logs that might conflict
  ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_date_type_reference_id_key;
  DROP INDEX IF EXISTS daily_logs_date_type_reference_id_key;
  ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_client_plant_ref_date_type_key;
  
  -- Add new constraint matching the exact upsert signature used in the frontend
  ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_client_plant_ref_date_type_key UNIQUE (client_id, plant_id, reference_id, date, type);

END $$;

CREATE OR REPLACE FUNCTION get_attendance_employees(
  p_plant_id uuid,
  p_reference_month date,
  p_staff_log_ids uuid[] DEFAULT '{}'
)
RETURNS SETOF public.employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (e.id) e.*
  FROM public.employees e
  WHERE e.plant_id = p_plant_id
    AND (
      e.status = 'Ativo'
      OR (e.status = 'Inativo' AND e.reference_month >= p_reference_month)
      OR e.id = ANY(p_staff_log_ids)
    )
  ORDER BY e.id, e.created_at DESC;
END;
$;

CREATE OR REPLACE FUNCTION get_attendance_employees(
  p_client_id uuid,
  p_plant_ids uuid[],
  p_reference_month date
)
RETURNS SETOF public.employees
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (e.id) e.*
  FROM public.employees e
  WHERE e.client_id = p_client_id
    AND e.plant_id = ANY(p_plant_ids)
    AND (
      e.status = 'Ativo'
      OR (e.status = 'Inativo' AND e.reference_month >= p_reference_month)
    )
  ORDER BY e.id, e.created_at DESC;
END;
$;

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
      '{"name": "Manager"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, role)
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'Manager', 'Administrador')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
