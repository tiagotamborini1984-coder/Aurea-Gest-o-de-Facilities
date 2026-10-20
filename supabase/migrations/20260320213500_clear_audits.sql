-- Migration neutralizada para evitar perda de dados.
-- Originalmente continha: DELETE FROM public.audits;
-- Essa deleção incondicional causava cascata destrutiva em audit_executions, audit_actions,
-- audit_execution_answers e audit_assignments, além de desvincular tasks (ON DELETE SET NULL).
-- Neutralizada definitivamente para ser idempotente e 100% segura.
DO $$
BEGIN
  -- Nenhuma operação destrutiva permitida
  NULL;
END $$;
