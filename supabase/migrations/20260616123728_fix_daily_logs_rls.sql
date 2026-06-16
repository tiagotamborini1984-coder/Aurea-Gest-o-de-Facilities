-- Fix daily_logs RLS policy to ensure history is correctly visible based on authorized plants
DROP POLICY IF EXISTS "daily_logs_select" ON public.daily_logs;

CREATE POLICY "daily_logs_select" ON public.daily_logs
  FOR SELECT TO authenticated
  USING (
    (client_id = public.get_user_client_id() OR public.get_user_role() = 'Master')
    AND public.is_plant_authorized(plant_id)
  );
