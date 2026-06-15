-- Ensure unique constraint exists for UPSERT to work properly
DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_date_type_reference_id_key'
  ) THEN
    -- Clean up exact duplicates keeping the most recently updated one
    DELETE FROM public.daily_logs a
    USING public.daily_logs b
    WHERE a.id < b.id
      AND a.date = b.date
      AND a.type = b.type
      AND a.reference_id = b.reference_id;

    ALTER TABLE public.daily_logs
      ADD CONSTRAINT daily_logs_date_type_reference_id_key
      UNIQUE (date, type, reference_id);
  END IF;
END $constraint$;

-- Audit Logs implementation
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT,
  record_id UUID,
  action TEXT,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.log_audit_action()
RETURNS trigger AS $func$
BEGIN
  INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    row_to_json(OLD),
    row_to_json(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_daily_logs ON public.daily_logs;
CREATE TRIGGER trigger_audit_daily_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

-- Helper function for RLS
CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_plant_id UUID)
RETURNS BOOLEAN AS $func$
DECLARE
  v_is_admin BOOLEAN;
  v_authorized_plants UUID[];
BEGIN
  SELECT is_admin, authorized_plants INTO v_is_admin, v_authorized_plants
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  IF p_plant_id = ANY(v_authorized_plants) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
EXCEPTION WHEN OTHERS THEN
  -- Fallback if authorized_plants is not UUID[]
  RETURN FALSE;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for daily_logs
DO $policies$
BEGIN
  DROP POLICY IF EXISTS "daily_logs_insert" ON public.daily_logs;
  DROP POLICY IF EXISTS "daily_logs_update" ON public.daily_logs;
  DROP POLICY IF EXISTS "daily_logs_delete" ON public.daily_logs;

  CREATE POLICY "daily_logs_insert" ON public.daily_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_plant_authorized(plant_id));

  CREATE POLICY "daily_logs_update" ON public.daily_logs
    FOR UPDATE TO authenticated
    USING (public.is_plant_authorized(plant_id));

  CREATE POLICY "daily_logs_delete" ON public.daily_logs
    FOR DELETE TO authenticated
    USING (public.is_plant_authorized(plant_id));
END $policies$;

-- Seed User
DO $seed$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lptamborini@hotmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'lptamborini@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "LP Tamborini"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, is_admin)
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'LP Tamborini', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $seed$;
