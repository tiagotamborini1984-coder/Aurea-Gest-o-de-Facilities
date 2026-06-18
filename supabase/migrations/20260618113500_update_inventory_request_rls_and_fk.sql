DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_request_items_request_id_fkey'
    AND table_schema = 'public'
    AND table_name = 'inventory_request_items'
  ) THEN
    ALTER TABLE public.inventory_request_items DROP CONSTRAINT inventory_request_items_request_id_fkey;
  END IF;
END $$;

ALTER TABLE public.inventory_request_items
ADD CONSTRAINT inventory_request_items_request_id_fkey
FOREIGN KEY (request_id)
REFERENCES public.inventory_requests(id)
ON DELETE CASCADE;

DROP POLICY IF EXISTS "inventory_requests_delete_requester" ON public.inventory_requests;
CREATE POLICY "inventory_requests_delete_requester" ON public.inventory_requests
FOR DELETE TO authenticated
USING (requester_id = auth.uid() AND status = 'Pendente');

DROP POLICY IF EXISTS "inventory_request_items_delete_requester" ON public.inventory_request_items;
CREATE POLICY "inventory_request_items_delete_requester" ON public.inventory_request_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inventory_requests
    WHERE id = inventory_request_items.request_id
    AND requester_id = auth.uid()
    AND status = 'Pendente'
  )
);
