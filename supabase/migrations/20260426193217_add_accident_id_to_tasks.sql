ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS accident_id UUID REFERENCES public.accidents(id) ON DELETE SET NULL;
