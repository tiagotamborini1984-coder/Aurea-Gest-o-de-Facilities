-- Fix RLS policies for cleaning_gardening_areas to respect plant authorization strictly
DROP POLICY IF EXISTS "authenticated_select_areas" ON public.cleaning_gardening_areas;
DROP POLICY IF EXISTS "authenticated_insert_areas" ON public.cleaning_gardening_areas;
DROP POLICY IF EXISTS "authenticated_update_areas" ON public.cleaning_gardening_areas;
DROP POLICY IF EXISTS "authenticated_delete_areas" ON public.cleaning_gardening_areas;

DROP POLICY IF EXISTS "plant_isolation_cleaning_gardening_areas" ON public.cleaning_gardening_areas;
CREATE POLICY "plant_isolation_cleaning_gardening_areas" ON public.cleaning_gardening_areas
  FOR ALL TO authenticated
  USING (
    ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) 
    AND is_plant_authorized(plant_id)
  )
  WITH CHECK (
    ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) 
    AND is_plant_authorized(plant_id)
  );

-- Fix RLS policies for plants to respect plant authorization on SELECT
DROP POLICY IF EXISTS "authenticated_select_plants" ON public.plants;
CREATE POLICY "authenticated_select_plants" ON public.plants
  FOR SELECT TO authenticated
  USING (
    ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) 
    AND is_plant_authorized(id)
  );
