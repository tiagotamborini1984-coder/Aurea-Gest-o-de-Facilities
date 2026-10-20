-- Agente de Conferência de Lista de Presença (Aurea)
-- Campos para guardar o resultado da conferência por IA da lista de presença
-- anexada ao registro de treinamento do colaborador.

ALTER TABLE public.employee_training_records
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verification_signed_name TEXT,
  ADD COLUMN IF NOT EXISTS verification_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Índice para listagens que filtram por status de verificação
CREATE INDEX IF NOT EXISTS idx_etr_verification_status
  ON public.employee_training_records (verification_status);

COMMENT ON COLUMN public.employee_training_records.verification_status IS
  'Resultado da conferência IA da lista de presença: pending | verified | rejected | failed';