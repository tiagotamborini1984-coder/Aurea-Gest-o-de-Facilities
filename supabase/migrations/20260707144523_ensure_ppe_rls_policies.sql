ALTER TABLE public.ppe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppe_loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_ppe_items" ON public.ppe_items;
CREATE POLICY "tenant_isolation_ppe_items" ON public.ppe_items
  FOR ALL TO authenticated USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  ) WITH CHECK (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_ppe_loans" ON public.ppe_loans;
CREATE POLICY "tenant_isolation_ppe_loans" ON public.ppe_loans
  FOR ALL TO authenticated USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  ) WITH CHECK (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );
