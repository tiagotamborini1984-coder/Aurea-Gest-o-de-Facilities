DO $$
BEGIN
  -- Clean up any remaining duplicate daily_logs entries
  -- Keep the most recently created one per (client_id, plant_id, reference_id, date, type)
  -- This ensures data integrity for dates like 14/07, 17/07, and 21/07
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY client_id, plant_id, reference_id, date, type
             ORDER BY created_at DESC
           ) as row_num
    FROM public.daily_logs
  )
  DELETE FROM public.daily_logs
  WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

  -- Ensure the unique constraint exists to prevent future duplicates
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_unique_record'
  ) THEN
    ALTER TABLE public.daily_logs
      ADD CONSTRAINT daily_logs_unique_record
      UNIQUE (client_id, plant_id, reference_id, date, type);
  END IF;
END $$;
