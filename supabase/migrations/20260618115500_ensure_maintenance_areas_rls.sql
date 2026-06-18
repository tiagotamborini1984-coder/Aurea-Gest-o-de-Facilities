DO $$
BEGIN
  -- Drop existing policies that might conflict
  DROP POLICY IF EXISTS "maintenance_areas_all" ON public.maintenance_areas;
  DROP POLICY IF EXISTS "maintenance_areas_select" ON public.maintenance_areas;
  DROP POLICY IF EXISTS "tenant_isolation_maintenance_areas" ON public.maintenance_areas;
  
  -- Create isolated policy for tenant
  CREATE POLICY "tenant_isolation_maintenance_areas" ON public.maintenance_areas
    FOR ALL TO authenticated
    USING (client_id = public.get_user_client_id())
    WITH CHECK (client_id = public.get_user_client_id());
END $$;
