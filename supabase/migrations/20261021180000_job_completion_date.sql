-- Data de conclusão extraída da lista de presença pelo agente (job avulso)
ALTER TABLE public.training_verification_jobs ADD COLUMN IF NOT EXISTS completion_date date;
