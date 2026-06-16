-- 1. Create or replace trigger to ensure registration_number consistency
CREATE OR REPLACE FUNCTION public.handle_employee_registration_number()
RETURNS trigger AS $$
BEGIN
    -- If registration_number is null or empty, check if there's another employee with the same name and plant
    IF NEW.registration_number IS NULL OR TRIM(NEW.registration_number) = '' THEN
        SELECT registration_number INTO NEW.registration_number
        FROM public.employees
        WHERE client_id = NEW.client_id
          AND plant_id = NEW.plant_id
          AND LOWER(TRIM(name)) = LOWER(TRIM(NEW.name))
          AND registration_number IS NOT NULL
          AND TRIM(registration_number) != ''
        ORDER BY updated_at DESC
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_employee_registration_number ON public.employees;
CREATE TRIGGER ensure_employee_registration_number
    BEFORE INSERT OR UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_employee_registration_number();

-- 2. Create or replace the get_attendance_employees function
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, uuid[], text);

CREATE OR REPLACE FUNCTION public.get_attendance_employees(
    p_client_id uuid,
    p_plant_ids uuid[] DEFAULT NULL,
    p_reference_month text DEFAULT NULL
)
RETURNS SETOF public.employees AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (
        e.plant_id,
        COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name)))
    )
        e.*
    FROM public.employees e
    WHERE e.client_id = p_client_id
      AND (p_plant_ids IS NULL OR e.plant_id = ANY(p_plant_ids))
      AND e.status = 'Ativo'
    ORDER BY
        e.plant_id,
        COALESCE(NULLIF(TRIM(e.registration_number), ''), LOWER(TRIM(e.name))),
        e.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Execute cleanup_duplicate_employees or manual cleanup
DO $$
BEGIN
    -- Check if cleanup_duplicate_employees function exists and execute it if it does
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_duplicate_employees') THEN
        EXECUTE 'SELECT public.cleanup_duplicate_employees()';
    ELSE
        -- Fallback manual cleanup: mark as 'Inativo' older duplicate active records
        UPDATE public.employees e1
        SET status = 'Inativo', 
            updated_at = NOW()
        WHERE e1.status = 'Ativo'
          AND EXISTS (
              SELECT 1
              FROM public.employees e2
              WHERE e2.client_id = e1.client_id
                AND e2.plant_id = e1.plant_id
                AND LOWER(TRIM(e2.name)) = LOWER(TRIM(e1.name))
                AND e2.status = 'Ativo'
                AND (e2.updated_at > e1.updated_at OR (e2.updated_at = e1.updated_at AND e2.id > e1.id))
          );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error during cleanup: %', SQLERRM;
END;
$$;
