-- Jobs de verificação de lista de presença no momento do ANEXO
-- (antes de existir o registro employee_training_records, p.ex. novo colaborador)

CREATE TABLE IF NOT EXISTS public.training_verification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  document_url TEXT NOT NULL,
  training_name TEXT NOT NULL DEFAULT '',
  employee_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'analyzing',
  notes TEXT,
  signed_name TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.training_verification_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on training_verification_jobs"
  ON public.training_verification_jobs FOR ALL TO authenticated USING (true);