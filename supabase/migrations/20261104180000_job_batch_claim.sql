-- Claim de lote: garante que cada documento (por conteúdo) seja analisado UMA vez,
-- mesmo com vários pedidos simultâneos do mesmo dossiê.
ALTER TABLE public.training_verification_jobs
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS doc_hash text;

CREATE INDEX IF NOT EXISTS idx_tvj_claimed ON public.training_verification_jobs (claimed_at);
CREATE INDEX IF NOT EXISTS idx_tvj_status_created ON public.training_verification_jobs (status, created_at);
