-- Ensure RLS policies are complete for plants, ppe_items, and ppe_loans
-- Allow authenticated users to SELECT plants for their client_id
DROP POLICY IF EXISTS "authenticated_select_plants" ON public.plants;
CREATE POLICY "authenticated_select_plants" ON public.plants
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

-- Ensure ppe_items RLS
ALTER TABLE public.ppe_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_ppe_items" ON public.ppe_items;
CREATE POLICY "tenant_isolation_ppe_items" ON public.ppe_items
  FOR ALL TO authenticated USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  ) WITH CHECK (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

-- Ensure ppe_loans RLS
ALTER TABLE public.ppe_loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_ppe_loans" ON public.ppe_loans;
CREATE POLICY "tenant_isolation_ppe_loans" ON public.ppe_loans
  FOR ALL TO authenticated USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  ) WITH CHECK (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

DROP POLICY IF EXISTS "admin_delete_ppe_loans" ON public.ppe_loans;
CREATE POLICY "admin_delete_ppe_loans" ON public.ppe_loans
  FOR DELETE TO authenticated USING (
    public.get_user_role() IN ('Master', 'Administrador')
  );
