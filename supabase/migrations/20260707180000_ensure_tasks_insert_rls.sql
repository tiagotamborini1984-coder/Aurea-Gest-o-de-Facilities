-- Ensure RLS INSERT policy on tasks table allows authenticated users
-- to insert tasks for their own client_id

DROP POLICY IF EXISTS "authenticated_insert_tasks" ON public.tasks;

CREATE POLICY "authenticated_insert_tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.get_user_role() = 'Master'::text)
    OR
    (client_id = public.get_user_client_id())
  );
