-- Add client_id column as nullable first
ALTER TABLE public.locations 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Backfill client_id from associated plants
UPDATE public.locations l
SET client_id = p.client_id
FROM public.plants p
WHERE l.plant_id = p.id;

-- Now that all existing rows have a client_id, enforce NOT NULL
ALTER TABLE public.locations 
ALTER COLUMN client_id SET NOT NULL;
