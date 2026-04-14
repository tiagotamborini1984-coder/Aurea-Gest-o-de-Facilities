-- Update clients RLS policy to restrict Administrador to their own client
DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;

CREATE POLICY "tenant_isolation_clients" ON public.clients
  FOR ALL TO authenticated
  USING ((public.get_user_role() = 'Master'::text) OR (id = public.get_user_client_id()))
  WITH CHECK ((public.get_user_role() = 'Master'::text) OR (id = public.get_user_client_id()));
