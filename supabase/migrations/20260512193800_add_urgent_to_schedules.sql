ALTER TABLE public.cleaning_gardening_schedules ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE;
