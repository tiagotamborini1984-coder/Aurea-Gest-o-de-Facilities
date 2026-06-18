-- Drop functions to recreate cleanly
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, text, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, date);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, uuid[], text);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, character varying, uuid[]);

CREATE OR REPLACE FUNCTION public.get_attendance_employees(
    p_plant_id UUID,
    p_reference_month VARCHAR,
    p_staff_log_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS SETOF public.employees AS $BODY$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (
        COALESCE(NULLIF(TRIM(registration_number), ''), name),
        plant_id
    ) *
    FROM public.employees
    WHERE plant_id = p_plant_id
    ORDER BY
        COALESCE(NULLIF(TRIM(registration_number), ''), name),
        plant_id,
        CASE WHEN id = ANY(p_staff_log_ids) THEN 0 ELSE 1 END,
        CASE WHEN status = 'Ativo' THEN 0 ELSE 1 END,
        created_at DESC;
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_attendance_employees(
    p_plant_id UUID,
    p_date DATE
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    company_name TEXT,
    function_id UUID,
    location_id UUID,
    status TEXT,
    log_id UUID,
    log_status BOOLEAN
) AS $BODY$
BEGIN
    RETURN QUERY
    WITH unique_employees AS (
        SELECT DISTINCT ON (
            COALESCE(NULLIF(TRIM(e.registration_number), ''), e.name),
            e.plant_id
        )
            e.id,
            e.name,
            e.company_name,
            e.function_id,
            e.location_id,
            e.status
        FROM public.employees e
        WHERE e.plant_id = p_plant_id
        ORDER BY
            COALESCE(NULLIF(TRIM(e.registration_number), ''), e.name),
            e.plant_id,
            CASE WHEN e.status = 'Ativo' THEN 0 ELSE 1 END,
            e.created_at DESC
    )
    SELECT
        ue.id,
        ue.name,
        ue.company_name,
        ue.function_id,
        ue.location_id,
        ue.status,
        dl.id AS log_id,
        dl.status AS log_status
    FROM unique_employees ue
    LEFT JOIN (
        SELECT DISTINCT ON (reference_id, plant_id, date, type)
            id, reference_id, plant_id, date, status
        FROM public.daily_logs
        WHERE type = 'staff'
        ORDER BY reference_id, plant_id, date, type, created_at DESC
    ) dl
        ON dl.reference_id = ue.id
        AND dl.plant_id = p_plant_id
        AND dl.date = p_date;
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;

DO $BODY$
DECLARE
  new_user_id uuid;
BEGIN
  -- 1. Deduplicate daily_logs
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY client_id, plant_id, reference_id, date, type 
             ORDER BY created_at DESC
           ) as row_num
    FROM daily_logs
  )
  DELETE FROM daily_logs
  WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

  -- 2. Drop existing constraint if it exists (ignoring errors if it's an index)
  BEGIN
    ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_date_type_reference_id_key;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Also try dropping as an index if it wasn't a constraint
  DROP INDEX IF EXISTS daily_logs_date_type_reference_id_key;
  
  -- 3. Add the unique constraint
  BEGIN
    ALTER TABLE daily_logs ADD CONSTRAINT daily_logs_unique_record UNIQUE (client_id, plant_id, reference_id, date, type);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Assume it already exists if it fails
  END;

  -- 4. Auth Seed
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
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'Administrador', 'Admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $BODY$;
