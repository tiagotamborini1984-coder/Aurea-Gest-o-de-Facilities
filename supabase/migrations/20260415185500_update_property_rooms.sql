ALTER TABLE public.property_rooms
ADD COLUMN IF NOT EXISTS bed_type TEXT NOT NULL DEFAULT 'Solteiro',
ADD COLUMN IF NOT EXISTS has_bathroom BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS beds_quantity INT NOT NULL DEFAULT 1;

DO $DO$
BEGIN
  UPDATE public.property_rooms 
  SET beds_quantity = capacity 
  WHERE beds_quantity = 1 AND capacity > 1;
END $DO$;
