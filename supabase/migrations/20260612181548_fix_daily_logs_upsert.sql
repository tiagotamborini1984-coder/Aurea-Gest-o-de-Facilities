-- 1. Remove duplicate records keeping the latest one
DO $$
BEGIN
  DELETE FROM public.daily_logs
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY date, type, reference_id ORDER BY created_at DESC) as row_num
      FROM public.daily_logs
    ) t
    WHERE t.row_num > 1
  );
END $$;

-- 2. Add unique constraint for idempotent upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_date_type_reference_id_key'
  ) THEN
    ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_date_type_reference_id_key UNIQUE (date, type, reference_id);
  END IF;
END $$;

-- 3. Set Default for client_id to retrieve it automatically
ALTER TABLE public.daily_logs ALTER COLUMN client_id SET DEFAULT public.get_user_client_id();

-- 4. Ensure RLS Policy enforces plant isolation and client_id validation
DROP POLICY IF EXISTS "plant_isolation_daily_logs" ON public.daily_logs;
CREATE POLICY "plant_isolation_daily_logs" ON public.daily_logs
  FOR ALL TO authenticated
  USING (
    public.is_plant_authorized(plant_id) 
    AND client_id = public.get_user_client_id()
  )
  WITH CHECK (
    public.is_plant_authorized(plant_id) 
    AND client_id = public.get_user_client_id()
  );

-- 5. Create Audit Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_audit_daily_logs()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    v_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  INSERT INTO public.audit_logs (action_type, client_id, user_id, details)
  VALUES (
    TG_OP,
    COALESCE(NEW.client_id, OLD.client_id),
    v_user_id,
    'Daily Log ' || TG_OP || ' for reference ' || COALESCE(NEW.reference_id, OLD.reference_id) || ' on date ' || COALESCE(NEW.date, OLD.date)::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Audit Trigger to daily_logs
DROP TRIGGER IF EXISTS audit_daily_logs ON public.daily_logs;
CREATE TRIGGER audit_daily_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_daily_logs();
