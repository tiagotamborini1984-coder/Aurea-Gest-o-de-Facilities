ALTER TABLE public.cleaning_gardening_schedules 
ADD COLUMN IF NOT EXISTS end_time TIME WITHOUT TIME ZONE;

UPDATE public.cleaning_gardening_schedules 
SET end_time = (start_time::time + interval '1 hour')::time
WHERE end_time IS NULL;
