-- 1. Modify plants SELECT policy to allow seeing all plants for the client
DROP POLICY IF EXISTS "authenticated_select_plants" ON public.plants;
CREATE POLICY "authenticated_select_plants" ON public.plants
  FOR SELECT TO authenticated 
  USING (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())));

-- 2. Modify accidents policies to separate INSERT from SELECT/UPDATE/DELETE
DROP POLICY IF EXISTS "plant_isolation_accidents" ON public.accidents;

-- Allow SELECT only if authorized in the plant
DROP POLICY IF EXISTS "accidents_select" ON public.accidents;
CREATE POLICY "accidents_select" ON public.accidents
  FOR SELECT TO authenticated 
  USING (is_client_active() AND (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id)));

-- Allow INSERT for any plant belonging to the client (to support cross-plant reporting)
DROP POLICY IF EXISTS "accidents_insert" ON public.accidents;
CREATE POLICY "accidents_insert" ON public.accidents
  FOR INSERT TO authenticated 
  WITH CHECK (is_client_active() AND ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())));

-- Allow UPDATE only if authorized in the plant
DROP POLICY IF EXISTS "accidents_update" ON public.accidents;
CREATE POLICY "accidents_update" ON public.accidents
  FOR UPDATE TO authenticated 
  USING (is_client_active() AND (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id)))
  WITH CHECK (is_client_active() AND (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id)));

-- Allow DELETE only if authorized in the plant
DROP POLICY IF EXISTS "accidents_delete" ON public.accidents;
CREATE POLICY "accidents_delete" ON public.accidents
  FOR DELETE TO authenticated 
  USING (is_client_active() AND (((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) AND is_plant_authorized(plant_id)));
