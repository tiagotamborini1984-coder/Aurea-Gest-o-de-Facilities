-- Migration ADITIVA: campo de texto livre para o Centro de Custo pagador das
-- solicitações de Horas Extras de Terceiros (formato 1111aaa — 4 números + 3 letras).
-- Nada destrutivo: a coluna cost_center_id (FK budget_cost_centers) é mantida intacta,
-- preservando o histórico dos registros antigos.

ALTER TABLE public.horas_extras_solicitacoes
  ADD COLUMN IF NOT EXISTS cost_center_text TEXT;

COMMENT ON COLUMN public.horas_extras_solicitacoes.cost_center_text IS
  'Centro de Custo pagador digitado no formato 1111aaa (4 numeros + 3 letras). Usado quando o campo e digitado manualmente no formulario de Solicitacao HE.';

-- Defesa extra no banco: só aceita texto no formato 1111aaa (ou nulo).
ALTER TABLE public.horas_extras_solicitacoes
  DROP CONSTRAINT IF EXISTS he_solicitacoes_cost_center_text_format;

ALTER TABLE public.horas_extras_solicitacoes
  ADD CONSTRAINT he_solicitacoes_cost_center_text_format
  CHECK (cost_center_text IS NULL OR cost_center_text ~ '^[0-9]{4}[A-Za-z]{3}$');
