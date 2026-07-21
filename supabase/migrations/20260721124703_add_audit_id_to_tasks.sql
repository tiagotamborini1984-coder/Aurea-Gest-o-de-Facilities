ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS audit_id UUID REFERENCES public.audits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_audit_id ON public.tasks(audit_id);
