ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Geral',
  frequency TEXT NOT NULL DEFAULT 'Única',
  start_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  evidence_required BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  assignee_id UUID NOT NULL REFERENCES public.profiles(id),
  plant_id UUID NOT NULL REFERENCES public.plants(id),
  status TEXT NOT NULL DEFAULT 'Pendente',
  realization_date DATE,
  participants TEXT,
  final_score NUMERIC,
  max_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_execution_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.audit_executions(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.audit_actions(id) ON DELETE CASCADE,
  score INT,
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_execution_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_audits" ON public.audits;
CREATE POLICY "authenticated_all_audits" ON public.audits 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_audit_actions" ON public.audit_actions;
CREATE POLICY "authenticated_all_audit_actions" ON public.audit_actions 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_audit_executions" ON public.audit_executions;
CREATE POLICY "authenticated_all_audit_executions" ON public.audit_executions 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_audit_execution_answers" ON public.audit_execution_answers;
CREATE POLICY "authenticated_all_audit_execution_answers" ON public.audit_execution_answers 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

