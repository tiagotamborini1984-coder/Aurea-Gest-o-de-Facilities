-- Ensure authenticated users can SELECT plants belonging to their client_id
DROP POLICY IF EXISTS "authenticated_select_plants" ON public.plants;
CREATE POLICY "authenticated_select_plants" ON public.plants
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );
