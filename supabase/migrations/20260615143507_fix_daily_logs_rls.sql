DO $$
BEGIN
    -- Fix for the daily_logs RLS policies: replace is_admin references with role and authorized_plants checks
    DROP POLICY IF EXISTS "daily_logs_insert" ON public.daily_logs;
    DROP POLICY IF EXISTS "daily_logs_update" ON public.daily_logs;
    DROP POLICY IF EXISTS "daily_logs_select" ON public.daily_logs;
    DROP POLICY IF EXISTS "daily_logs_delete" ON public.daily_logs;

    -- Create select policy
    CREATE POLICY "daily_logs_select" ON public.daily_logs
      FOR SELECT TO authenticated USING (true);

    -- Create insert policy
    CREATE POLICY "daily_logs_insert" ON public.daily_logs
      FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND (p.client_id = daily_logs.client_id OR p.role = 'Master')
          AND (
            p.role IN ('Administrador', 'Master', 'Gestor')
            OR (
              p.authorized_plants IS NOT NULL 
              AND (
                p.authorized_plants @> to_jsonb(daily_logs.plant_id) 
                OR p.authorized_plants @> to_jsonb(daily_logs.plant_id::text)
              )
            )
          )
        )
      );

    -- Create update policy
    CREATE POLICY "daily_logs_update" ON public.daily_logs
      FOR UPDATE TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND (p.client_id = daily_logs.client_id OR p.role = 'Master')
          AND (
            p.role IN ('Administrador', 'Master', 'Gestor')
            OR (
              p.authorized_plants IS NOT NULL 
              AND (
                p.authorized_plants @> to_jsonb(daily_logs.plant_id) 
                OR p.authorized_plants @> to_jsonb(daily_logs.plant_id::text)
              )
            )
          )
        )
      );

    -- Create delete policy
    CREATE POLICY "daily_logs_delete" ON public.daily_logs
      FOR DELETE TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND (p.client_id = daily_logs.client_id OR p.role = 'Master')
          AND (
            p.role IN ('Administrador', 'Master', 'Gestor')
            OR (
              p.authorized_plants IS NOT NULL 
              AND (
                p.authorized_plants @> to_jsonb(daily_logs.plant_id) 
                OR p.authorized_plants @> to_jsonb(daily_logs.plant_id::text)
              )
            )
          )
        )
      );

    -- Fix plant_non_working_days policies as well to ensure consistency
    DROP POLICY IF EXISTS "plant_non_working_days_insert" ON public.plant_non_working_days;
    DROP POLICY IF EXISTS "plant_non_working_days_update" ON public.plant_non_working_days;
    DROP POLICY IF EXISTS "plant_non_working_days_delete" ON public.plant_non_working_days;

    CREATE POLICY "plant_non_working_days_insert" ON public.plant_non_working_days
      FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND (p.client_id = plant_non_working_days.client_id OR p.role = 'Master')
          AND (
            p.role IN ('Administrador', 'Master', 'Gestor')
            OR (
              p.authorized_plants IS NOT NULL 
              AND (
                p.authorized_plants @> to_jsonb(plant_non_working_days.plant_id) 
                OR p.authorized_plants @> to_jsonb(plant_non_working_days.plant_id::text)
              )
            )
          )
        )
      );

    CREATE POLICY "plant_non_working_days_delete" ON public.plant_non_working_days
      FOR DELETE TO authenticated USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND (p.client_id = plant_non_working_days.client_id OR p.role = 'Master')
          AND (
            p.role IN ('Administrador', 'Master', 'Gestor')
            OR (
              p.authorized_plants IS NOT NULL 
              AND (
                p.authorized_plants @> to_jsonb(plant_non_working_days.plant_id) 
                OR p.authorized_plants @> to_jsonb(plant_non_working_days.plant_id::text)
              )
            )
          )
        )
      );
END $$;

-- Safely recreate the check_duplicate_employee trigger to ensure it strictly checks employees
-- and doesn't interfere or throw silent rollbacks on daily_logs saves.
CREATE OR REPLACE FUNCTION public.check_duplicate_employee() RETURNS trigger AS $$
BEGIN
  IF NEW.registration_number IS NOT NULL AND NEW.registration_number != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.employees
      WHERE client_id = NEW.client_id
        AND plant_id = NEW.plant_id
        AND registration_number = NEW.registration_number
        AND reference_month = NEW.reference_month
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Colaborador com esta matrícula já existe neste mês e planta.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_duplicate_employee ON public.employees;
CREATE TRIGGER check_duplicate_employee
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.check_duplicate_employee();
