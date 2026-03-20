ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS advance_notice_days INT DEFAULT 0;

ALTER TABLE public.audit_execution_answers ADD COLUMN IF NOT EXISTS observations TEXT;

CREATE TABLE IF NOT EXISTS public.audit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_audit_assignments" ON public.audit_assignments;
CREATE POLICY "authenticated_all_audit_assignments" ON public.audit_assignments 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
