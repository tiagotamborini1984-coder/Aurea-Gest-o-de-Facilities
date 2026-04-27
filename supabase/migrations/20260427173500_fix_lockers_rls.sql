-- Fix RLS for lockers to isolate by plant
DROP POLICY IF EXISTS "tenant_isolation_lockers" ON public.lockers;
DROP POLICY IF EXISTS "plant_isolation_lockers" ON public.lockers;
CREATE POLICY "plant_isolation_lockers" ON public.lockers
  FOR ALL TO authenticated USING (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id))
  WITH CHECK (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id));

-- Fix RLS for locker_occupations to isolate by plant (via the locker)
DROP POLICY IF EXISTS "tenant_isolation_locker_occupations" ON public.locker_occupations;
DROP POLICY IF EXISTS "plant_isolation_locker_occupations" ON public.locker_occupations;
CREATE POLICY "plant_isolation_locker_occupations" ON public.locker_occupations
  FOR ALL TO authenticated USING (
    ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND 
    is_plant_authorized((SELECT plant_id FROM public.lockers WHERE id = locker_id))
  )
  WITH CHECK (
    ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND 
    is_plant_authorized((SELECT plant_id FROM public.lockers WHERE id = locker_id))
  );
