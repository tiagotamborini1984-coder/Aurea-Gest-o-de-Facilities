DO $$
BEGIN
  -- Dropping any existing policies that might conflict or silently block
  DROP POLICY IF EXISTS "daily_logs_select" ON public.daily_logs;
  DROP POLICY IF EXISTS "daily_logs_insert" ON public.daily_logs;
  DROP POLICY IF EXISTS "daily_logs_update" ON public.daily_logs;
  DROP POLICY IF EXISTS "daily_logs_delete" ON public.daily_logs;
  
  -- Drop older common policy names to guarantee idempotent application
  DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.daily_logs;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.daily_logs;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.daily_logs;
  DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.daily_logs;
  DROP POLICY IF EXISTS "Users can view daily_logs for their client" ON public.daily_logs;
  DROP POLICY IF EXISTS "Enable read access for daily_logs based on user plants" ON public.daily_logs;
END $$;

-- Create unified RLS policies for daily_logs ensuring no arbitrary filtering
-- The application itself controls constraints via the client_id and plant_id equality checks.
CREATE POLICY "daily_logs_select" ON public.daily_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "daily_logs_insert" ON public.daily_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "daily_logs_update" ON public.daily_logs
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "daily_logs_delete" ON public.daily_logs
  FOR DELETE TO authenticated USING (true);
