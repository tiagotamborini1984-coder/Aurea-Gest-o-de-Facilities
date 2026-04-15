ALTER TABLE public.property_reservations
ADD COLUMN IF NOT EXISTS bed_number INT NOT NULL DEFAULT 1;
