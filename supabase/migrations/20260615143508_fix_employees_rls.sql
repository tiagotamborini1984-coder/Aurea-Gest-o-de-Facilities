DO $$
BEGIN
  -- We fix the employees policies as well just in case they referenced is_admin
  DROP POLICY IF EXISTS "employees_insert" ON public.employees;
  DROP POLICY IF EXISTS "employees_update" ON public.employees;
  DROP POLICY IF EXISTS "employees_delete" ON public.employees;

  CREATE POLICY "employees_insert" ON public.employees
    FOR INSERT TO authenticated WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.client_id = employees.client_id OR p.role = 'Master')
        AND (
          p.role IN ('Administrador', 'Master', 'Gestor')
          OR (p.authorized_plants IS NOT NULL AND (p.authorized_plants @> to_jsonb(employees.plant_id) OR p.authorized_plants @> to_jsonb(employees.plant_id::text)))
        )
      )
    );

  CREATE POLICY "employees_update" ON public.employees
    FOR UPDATE TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.client_id = employees.client_id OR p.role = 'Master')
        AND (
          p.role IN ('Administrador', 'Master', 'Gestor')
          OR (p.authorized_plants IS NOT NULL AND (p.authorized_plants @> to_jsonb(employees.plant_id) OR p.authorized_plants @> to_jsonb(employees.plant_id::text)))
        )
      )
    );

  CREATE POLICY "employees_delete" ON public.employees
    FOR DELETE TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.client_id = employees.client_id OR p.role = 'Master')
        AND (
          p.role IN ('Administrador', 'Master', 'Gestor')
          OR (p.authorized_plants IS NOT NULL AND (p.authorized_plants @> to_jsonb(employees.plant_id) OR p.authorized_plants @> to_jsonb(employees.plant_id::text)))
        )
      )
    );
END $$;
