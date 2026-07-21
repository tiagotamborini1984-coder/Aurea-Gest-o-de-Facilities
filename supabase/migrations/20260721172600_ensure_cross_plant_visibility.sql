-- Ensure RLS SELECT policy on plants allows authenticated users to see ALL plants within their client_id
-- This supports cross-plant task assignment for accident corrective actions

DROP POLICY IF EXISTS "authenticated_select_plants" ON public.plants;
CREATE POLICY "authenticated_select_plants" ON public.plants
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

-- Ensure tasks INSERT policy allows creating tasks for any plant within the client
DROP POLICY IF EXISTS "authenticated_insert_tasks" ON public.tasks;
CREATE POLICY "authenticated_insert_tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.get_user_role() = 'Master'::text)
    OR (client_id = public.get_user_client_id())
  );

-- Ensure tasks SELECT policy allows viewing tasks linked to accidents for the client
DROP POLICY IF EXISTS "authenticated_select_tasks" ON public.tasks;
CREATE POLICY "authenticated_select_tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    (public.get_user_role() = 'Master'::text)
    OR (
      client_id = public.get_user_client_id()
      AND (public.is_plant_authorized(plant_id) OR requester_id = auth.uid() OR assignee_id = auth.uid())
    )
  );

-- Ensure tasks UPDATE policy allows updating tasks linked to accidents
DROP POLICY IF EXISTS "authenticated_update_tasks" ON public.tasks;
CREATE POLICY "authenticated_update_tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    (public.get_user_role() = 'Master'::text)
    OR (
      client_id = public.get_user_client_id()
      AND (public.is_plant_authorized(plant_id) OR requester_id = auth.uid() OR assignee_id = auth.uid())
    )
  )
  WITH CHECK (
    (public.get_user_role() = 'Master'::text)
    OR (
      client_id = public.get_user_client_id()
      AND (public.is_plant_authorized(plant_id) OR requester_id = auth.uid() OR assignee_id = auth.uid())
    )
  );
