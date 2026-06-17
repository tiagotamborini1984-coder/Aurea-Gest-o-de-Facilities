ALTER TABLE public.functions ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL;
ALTER TABLE public.functions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_functions_plant_id ON public.functions(plant_id);
CREATE INDEX IF NOT EXISTS idx_functions_location_id ON public.functions(location_id);
