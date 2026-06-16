-- Drop existing variations of the function to avoid ambiguous types
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, text, uuid[]);
DROP FUNCTION IF EXISTS public.get_attendance_employees(uuid, text, text[]);

-- Recreate the get_attendance_employees function with robust deduplication logic
CREATE OR REPLACE FUNCTION public.get_attendance_employees(
  p_plant_id uuid,
  p_reference_month text,
  p_staff_log_ids text[] DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  name text,
  company_name text,
  function_id uuid,
  status text,
  registration_number text,
  reference_month text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH ranked_employees AS (
    SELECT 
      e.id,
      e.name,
      e.company_name,
      e.function_id,
      e.status,
      e.registration_number,
      e.reference_month,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(e.name))
        ORDER BY 
          CASE WHEN e.reference_month = p_reference_month THEN 0 ELSE 1 END,
          CASE WHEN p_staff_log_ids IS NOT NULL AND e.id::text = ANY(p_staff_log_ids) THEN 0 ELSE 1 END,
          CASE WHEN e.status = 'Ativo' THEN 0 ELSE 1 END,
          e.updated_at DESC,
          e.created_at DESC
      ) as rn
    FROM public.employees e
    WHERE e.plant_id = p_plant_id
      AND (e.status = 'Ativo' OR (p_staff_log_ids IS NOT NULL AND e.id::text = ANY(p_staff_log_ids)))
  )
  SELECT 
    r.id,
    r.name,
    r.company_name,
    r.function_id,
    r.status,
    r.registration_number,
    r.reference_month
  FROM ranked_employees r
  WHERE r.rn = 1;
END;
$function$;

-- Cleanup script to remove existing duplicate employees in the database idempotently
DO $DO$
DECLARE
  dup_record RECORD;
  primary_id uuid;
BEGIN
  FOR dup_record IN (
    WITH duplicates AS (
      SELECT 
        id,
        name,
        plant_id,
        ROW_NUMBER() OVER (
          PARTITION BY plant_id, LOWER(TRIM(name))
          ORDER BY 
            CASE WHEN status = 'Ativo' THEN 0 ELSE 1 END,
            updated_at DESC,
            created_at DESC
        ) as rn
      FROM public.employees
    )
    SELECT id, name, plant_id
    FROM duplicates
    WHERE rn > 1
  ) LOOP
    -- Find the primary record that we will keep
    SELECT id INTO primary_id
    FROM public.employees
    WHERE plant_id = dup_record.plant_id 
      AND LOWER(TRIM(name)) = LOWER(TRIM(dup_record.name))
      AND id != dup_record.id
    ORDER BY 
      CASE WHEN status = 'Ativo' THEN 0 ELSE 1 END,
      updated_at DESC,
      created_at DESC
    LIMIT 1;

    IF primary_id IS NOT NULL THEN
      -- Safely reassign daily_logs
      BEGIN
        UPDATE public.daily_logs 
        SET reference_id = primary_id::text
        WHERE type = 'staff' AND reference_id = dup_record.id::text;
      EXCEPTION WHEN unique_violation THEN
        DELETE FROM public.daily_logs WHERE type = 'staff' AND reference_id = dup_record.id::text;
      END;

      -- Safely reassign employee_trainings
      BEGIN
        UPDATE public.employee_trainings
        SET employee_id = primary_id
        WHERE employee_id = dup_record.id;
      EXCEPTION WHEN unique_violation THEN
        DELETE FROM public.employee_trainings WHERE employee_id = dup_record.id;
      END;

      -- Safely reassign auditoria_assignments if it exists
      BEGIN
        UPDATE public.auditoria_assignments
        SET employee_id = primary_id
        WHERE employee_id = dup_record.id;
      EXCEPTION WHEN unique_violation THEN
        DELETE FROM public.auditoria_assignments WHERE employee_id = dup_record.id;
      WHEN undefined_table THEN
        NULL; -- Ignore if table doesn't exist
      END;

      -- Safely reassign locker_assignments if it exists
      BEGIN
        UPDATE public.locker_assignments
        SET employee_id = primary_id
        WHERE employee_id = dup_record.id;
      EXCEPTION WHEN unique_violation THEN
        DELETE FROM public.locker_assignments WHERE employee_id = dup_record.id;
      WHEN undefined_table THEN
        NULL;
      END;

      -- Finally delete the duplicate employee
      DELETE FROM public.employees WHERE id = dup_record.id;
    END IF;
  END LOOP;
END $DO$;
