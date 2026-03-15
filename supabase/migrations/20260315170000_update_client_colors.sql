-- Revert the default client colors to Graphite (Primary) and Deep Blue (Secondary)
UPDATE public.clients
SET primary_color = '#1f2937', secondary_color = '#1e3a8a';

ALTER TABLE public.clients ALTER COLUMN primary_color SET DEFAULT '#1f2937';
ALTER TABLE public.clients ALTER COLUMN secondary_color SET DEFAULT '#1e3a8a';
