DO $$
BEGIN
  -- Safe alter column to drop not null so sublocations can be created linked only to area_id
  ALTER TABLE public.maintenance_sublocations ALTER COLUMN location_id DROP NOT NULL;
END $$;
