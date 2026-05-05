ALTER TABLE public.contracted_headcount ADD COLUMN IF NOT EXISTS reference_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE);
