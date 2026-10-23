-- Facilita — snapshot das métricas do Dashboard do Gestor (Gestão de Terceiros)
-- O dashboard grava as métricas exibidas (mesmo número que o gestor vê); a Facilita lê esse snapshot.
-- RLS: leitura para todos autenticados do client; escrita via service role (Edge Function).

CREATE TABLE IF NOT EXISTS public.facilita_dashboard_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'dashboard_gestor',
  period_start DATE,
  period_end DATE,
  metrics JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS facilita_dashboard_snapshot_client_idx
  ON public.facilita_dashboard_snapshot(client_id, computed_at DESC);

ALTER TABLE public.facilita_dashboard_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_facilita_dashboard_snapshot" ON public.facilita_dashboard_snapshot;
CREATE POLICY "tenant_isolation_facilita_dashboard_snapshot" ON public.facilita_dashboard_snapshot
  FOR SELECT TO authenticated
  USING ((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id()));

DROP POLICY IF EXISTS "tenant_insert_facilita_dashboard_snapshot" ON public.facilita_dashboard_snapshot;
CREATE POLICY "tenant_insert_facilita_dashboard_snapshot" ON public.facilita_dashboard_snapshot
  FOR INSERT TO authenticated
  WITH CHECK ((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id()));