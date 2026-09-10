-- Migration: Create audit_ai_reports table to persist deterministic AI audit analysis reports
-- Timestamp: 2026-09-10T13:16:11.758Z (version 20260910131611)

CREATE TABLE IF NOT EXISTS public.audit_ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  audit_type TEXT NOT NULL,
  audit_id UUID REFERENCES public.audits(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  ranking JSONB NOT NULL DEFAULT '[]'::jsonb,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  period_label TEXT,
  total_executions INTEGER NOT NULL DEFAULT 0,
  conformity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_ai_reports_client_id ON public.audit_ai_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_ai_reports_audit_type ON public.audit_ai_reports(client_id, audit_type);
CREATE INDEX IF NOT EXISTS idx_audit_ai_reports_created_at ON public.audit_ai_reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_ai_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "tenant_isolation_audit_ai_reports_select" ON public.audit_ai_reports;
CREATE POLICY "tenant_isolation_audit_ai_reports_select" ON public.audit_ai_reports
  FOR SELECT TO authenticated
  USING (
    (get_user_role() = 'Master'::text)
    OR (client_id = get_user_client_id())
  );

DROP POLICY IF EXISTS "tenant_isolation_audit_ai_reports_insert" ON public.audit_ai_reports;
CREATE POLICY "tenant_isolation_audit_ai_reports_insert" ON public.audit_ai_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    (get_user_role() = 'Master'::text)
    OR (client_id = get_user_client_id())
  );

DROP POLICY IF EXISTS "tenant_isolation_audit_ai_reports_update" ON public.audit_ai_reports;
CREATE POLICY "tenant_isolation_audit_ai_reports_update" ON public.audit_ai_reports
  FOR UPDATE TO authenticated
  USING (
    (get_user_role() = 'Master'::text)
    OR (client_id = get_user_client_id())
  )
  WITH CHECK (
    (get_user_role() = 'Master'::text)
    OR (client_id = get_user_client_id())
  );

DROP POLICY IF EXISTS "tenant_isolation_audit_ai_reports_delete" ON public.audit_ai_reports;
CREATE POLICY "tenant_isolation_audit_ai_reports_delete" ON public.audit_ai_reports
  FOR DELETE TO authenticated
  USING (
    (get_user_role() = 'Master'::text)
    OR (client_id = get_user_client_id())
  );
