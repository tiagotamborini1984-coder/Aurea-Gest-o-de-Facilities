ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS checklist_responses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS parent_ticket_id UUID REFERENCES public.maintenance_tickets(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.maintenance_plan_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.maintenance_preventive_plans(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.maintenance_plan_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_maintenance_plan_checklist_items" ON public.maintenance_plan_checklist_items;
CREATE POLICY "tenant_isolation_maintenance_plan_checklist_items" ON public.maintenance_plan_checklist_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_preventive_plans
      WHERE id = plan_id AND ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_preventive_plans
      WHERE id = plan_id AND ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()))
    )
  );

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_maintenance_plan_checklist_items_plan_id ON public.maintenance_plan_checklist_items(plan_id);
