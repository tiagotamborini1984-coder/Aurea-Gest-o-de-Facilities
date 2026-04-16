CREATE TABLE IF NOT EXISTS public.budget_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES public.budget_cost_centers(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
    reference_month DATE NOT NULL,
    budgeted_amount NUMERIC NOT NULL DEFAULT 0,
    realized_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, cost_center_id, account_id, reference_month)
);

ALTER TABLE public.budget_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_budget_cost_centers" ON public.budget_cost_centers;
CREATE POLICY "tenant_isolation_budget_cost_centers" ON public.budget_cost_centers
    FOR ALL TO authenticated
    USING ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()))
    WITH CHECK ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()));

DROP POLICY IF EXISTS "tenant_isolation_budget_accounts" ON public.budget_accounts;
CREATE POLICY "tenant_isolation_budget_accounts" ON public.budget_accounts
    FOR ALL TO authenticated
    USING ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()))
    WITH CHECK ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()));

DROP POLICY IF EXISTS "tenant_isolation_budget_entries" ON public.budget_entries;
CREATE POLICY "tenant_isolation_budget_entries" ON public.budget_entries
    FOR ALL TO authenticated
    USING ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()))
    WITH CHECK ((public.get_user_role() = 'Master'::text) OR (client_id = public.get_user_client_id()));
