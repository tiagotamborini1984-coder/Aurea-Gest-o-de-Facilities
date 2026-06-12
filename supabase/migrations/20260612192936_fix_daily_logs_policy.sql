DO $$
BEGIN
  -- Drop the permissive policy if it exists to strictly enforce plant isolation
  DROP POLICY IF EXISTS "Allow authenticated full access on daily_logs" ON public.daily_logs;
  
  -- Drop any existing plant isolation policy before creating a new one
  DROP POLICY IF EXISTS "plant_isolation_daily_logs" ON public.daily_logs;
  
  -- Create the strict policy ensuring only users authorized for the plant can view/edit
  CREATE POLICY "plant_isolation_daily_logs" ON public.daily_logs
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
          p.role IN ('Master', 'Admin') 
          OR (p.authorized_plants IS NOT NULL AND jsonb_typeof(p.authorized_plants) = 'array' AND p.authorized_plants @> jsonb_build_array(daily_logs.plant_id::text))
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
          p.role IN ('Master', 'Admin') 
          OR (p.authorized_plants IS NOT NULL AND jsonb_typeof(p.authorized_plants) = 'array' AND p.authorized_plants @> jsonb_build_array(daily_logs.plant_id::text))
        )
      )
    );
END $$;
