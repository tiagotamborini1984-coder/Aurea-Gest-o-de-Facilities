-- 1. Relax plants SELECT policy
DROP POLICY IF EXISTS "plant_isolation_plants" ON public.plants;
DROP POLICY IF EXISTS "authenticated_select_plants" ON public.plants;
DROP POLICY IF EXISTS "authenticated_insert_plants" ON public.plants;
DROP POLICY IF EXISTS "authenticated_update_plants" ON public.plants;
DROP POLICY IF EXISTS "authenticated_delete_plants" ON public.plants;

CREATE POLICY "authenticated_select_plants" ON public.plants
  FOR SELECT TO authenticated
  USING ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()));

CREATE POLICY "authenticated_insert_plants" ON public.plants
  FOR INSERT TO authenticated
  WITH CHECK (((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id())) AND public.is_plant_authorized(id));

CREATE POLICY "authenticated_update_plants" ON public.plants
  FOR UPDATE TO authenticated
  USING (((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id())) AND public.is_plant_authorized(id))
  WITH CHECK (((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id())) AND public.is_plant_authorized(id));

CREATE POLICY "authenticated_delete_plants" ON public.plants
  FOR DELETE TO authenticated
  USING (((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id())) AND public.is_plant_authorized(id));

-- 2. Relax profiles SELECT policy
DROP POLICY IF EXISTS "profiles_select_client" ON public.profiles;
CREATE POLICY "profiles_select_client" ON public.profiles
  FOR SELECT TO authenticated
  USING ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()));

-- 3. Relax tasks INSERT and SELECT policy
DROP POLICY IF EXISTS "plant_isolation_tasks" ON public.tasks;
DROP POLICY IF EXISTS "authenticated_select_tasks" ON public.tasks;
DROP POLICY IF EXISTS "authenticated_insert_tasks" ON public.tasks;
DROP POLICY IF EXISTS "authenticated_update_tasks" ON public.tasks;
DROP POLICY IF EXISTS "authenticated_delete_tasks" ON public.tasks;

CREATE POLICY "authenticated_select_tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    (public.get_user_role() = 'Master'::text) 
    OR 
    (
      client_id = public.get_user_client_id() AND 
      (public.is_plant_authorized(plant_id) OR requester_id = auth.uid() OR assignee_id = auth.uid())
    )
  );

CREATE POLICY "authenticated_insert_tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.get_user_role() = 'Master'::text) 
    OR 
    (client_id = public.get_user_client_id())
  );

CREATE POLICY "authenticated_update_tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    (public.get_user_role() = 'Master'::text) 
    OR 
    (
      client_id = public.get_user_client_id() AND 
      (public.is_plant_authorized(plant_id) OR requester_id = auth.uid() OR assignee_id = auth.uid())
    )
  )
  WITH CHECK (
    (public.get_user_role() = 'Master'::text) 
    OR 
    (
      client_id = public.get_user_client_id() AND 
      (public.is_plant_authorized(plant_id) OR requester_id = auth.uid() OR assignee_id = auth.uid())
    )
  );

CREATE POLICY "authenticated_delete_tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    (public.get_user_role() = 'Master'::text) 
    OR 
    (
      client_id = public.get_user_client_id() AND 
      public.is_plant_authorized(plant_id)
    )
  );
