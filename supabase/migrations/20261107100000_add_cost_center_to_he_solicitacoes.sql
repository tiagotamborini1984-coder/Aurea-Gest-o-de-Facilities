-- Migration: Centro de Custo pagador nas Solicitações de Horas Extras
-- Totalmente ADITIVA (sem DELETE/DROP/UPDATE em massa), seguindo regra permanente do projeto.
-- Adiciona coluna opcional cost_center_id (FK para budget_cost_centers) em horas_extras_solicitacoes.
-- Nenhuma política ou dado existente é alterado: a coluna nasce NULLABLE, sem NOT NULL,
-- e sem default — solicitações antigas permanecem válidas e visíveis.

-- 1. Coluna nova (idempotente)
ALTER TABLE public.horas_extras_solicitacoes
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.budget_cost_centers(id) ON DELETE SET NULL;

-- 2. Índice para consultas por centro de custo (idempotente)
CREATE INDEX IF NOT EXISTS idx_he_solicitacoes_cost_center
  ON public.horas_extras_solicitacoes (cost_center_id);

-- 3. Comentário de documentação (idempotente, sem efeito sobre dados)
COMMENT ON COLUMN public.horas_extras_solicitacoes.cost_center_id IS
  'Centro de Custo pagador da hora extra (obrigatório no formulário; opcional no banco para preservar registros anteriores).';
