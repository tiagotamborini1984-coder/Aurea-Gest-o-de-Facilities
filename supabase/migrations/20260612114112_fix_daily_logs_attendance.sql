DO $$
BEGIN
  -- 1. Deduplicate daily_logs if there are duplicates for (date, type, reference_id)
  -- keeping the most recently inserted one
  DELETE FROM public.daily_logs a
  USING public.daily_logs b
  WHERE a.date = b.date
    AND a.type = b.type
    AND a.reference_id = b.reference_id
    AND a.created_at < b.created_at;

  -- 2. Add the unique constraint to support UPSERT safely
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_logs_date_type_reference_id_key'
  ) THEN
    ALTER TABLE public.daily_logs 
    ADD CONSTRAINT daily_logs_date_type_reference_id_key UNIQUE (date, type, reference_id);
  END IF;

  -- 3. Fix the RLS Policy for plant isolation on daily_logs
  DROP POLICY IF EXISTS "plant_isolation_daily_logs" ON public.daily_logs;
  
  CREATE POLICY "plant_isolation_daily_logs" ON public.daily_logs
    FOR ALL
    TO authenticated
    USING (public.is_plant_authorized(plant_id))
    WITH CHECK (public.is_plant_authorized(plant_id));
END $$;
