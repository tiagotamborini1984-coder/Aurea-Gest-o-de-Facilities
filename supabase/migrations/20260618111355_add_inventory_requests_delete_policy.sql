DO $$
BEGIN
  DROP POLICY IF EXISTS "inventory_requests_delete_admin" ON public.inventory_requests;
  CREATE POLICY "inventory_requests_delete_admin" ON public.inventory_requests
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND lower(profiles.role) = 'admin'
      )
    );

  DROP POLICY IF EXISTS "inventory_request_items_delete_admin" ON public.inventory_request_items;
  CREATE POLICY "inventory_request_items_delete_admin" ON public.inventory_request_items
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND lower(profiles.role) = 'admin'
      )
    );
END $$;
