-- Adiciona coluna de reference_month para snapshot de colaboradores
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS reference_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE);
