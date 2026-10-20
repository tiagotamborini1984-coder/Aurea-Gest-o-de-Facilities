-- Migration: audit_question_categories
-- Allows users to freely create, edit, activate/deactivate, and delete audit question categories per tenant/client.
-- Adds category_id foreign key to audit_actions.

CREATE TABLE IF NOT EXISTS public.audit_question_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique name per client
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_question_categories_client_name 
  ON public.audit_question_categories(client_id, LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_audit_question_categories_client_id 
  ON public.audit_question_categories(client_id);

-- Add category_id to audit_actions
ALTER TABLE public.audit_actions 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.audit_question_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_actions_category_id 
  ON public.audit_actions(category_id);

-- Enable RLS
ALTER TABLE public.audit_question_categories ENABLE ROW LEVEL SECURITY;

-- Policies for audit_question_categories
DROP POLICY IF EXISTS "tenant_isolation_audit_question_categories_select" ON public.audit_question_categories;
CREATE POLICY "tenant_isolation_audit_question_categories_select" ON public.audit_question_categories
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_audit_question_categories_insert" ON public.audit_question_categories;
CREATE POLICY "tenant_isolation_audit_question_categories_insert" ON public.audit_question_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_audit_question_categories_update" ON public.audit_question_categories;
CREATE POLICY "tenant_isolation_audit_question_categories_update" ON public.audit_question_categories
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  )
  WITH CHECK (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_audit_question_categories_delete" ON public.audit_question_categories;
CREATE POLICY "tenant_isolation_audit_question_categories_delete" ON public.audit_question_categories
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );
