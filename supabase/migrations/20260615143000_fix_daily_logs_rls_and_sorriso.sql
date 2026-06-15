-- Fix daily_logs policies
DROP POLICY IF EXISTS "daily_logs_insert" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_update" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_select" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_delete" ON public.daily_logs;

-- ensure profiles has authorized_plants
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS authorized_plants JSONB DEFAULT '[]'::jsonb;

-- ensure daily_logs constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_date_type_reference_id_key'
  ) THEN
    ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_date_type_reference_id_key UNIQUE (date, type, reference_id);
  END IF;
END $$;

-- function to get user client id
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS UUID AS $$
DECLARE
  v_client_id UUID;
BEGIN
  SELECT client_id INTO v_client_id FROM public.profiles WHERE id = auth.uid();
  RETURN v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- function to check if plant is authorized
CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_plant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plants JSONB;
  v_is_admin BOOLEAN;
BEGIN
  SELECT authorized_plants, is_admin INTO v_plants, v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  IF v_plants IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_plants ? p_plant_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set client_id trigger
CREATE OR REPLACE FUNCTION public.set_daily_log_client_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Always ensure the client_id matches the user's client_id to prevent RLS mismatches
  NEW.client_id := public.get_user_client_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_daily_log_client_id ON public.daily_logs;
CREATE TRIGGER ensure_daily_log_client_id
  BEFORE INSERT OR UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_daily_log_client_id();

-- Recreate policies for daily_logs
CREATE POLICY "daily_logs_select" ON public.daily_logs
  FOR SELECT TO authenticated 
  USING (
    client_id = public.get_user_client_id()
    AND public.is_plant_authorized(plant_id)
  );

CREATE POLICY "daily_logs_insert" ON public.daily_logs
  FOR INSERT TO authenticated 
  WITH CHECK (
    client_id = public.get_user_client_id()
    AND public.is_plant_authorized(plant_id)
  );

CREATE POLICY "daily_logs_update" ON public.daily_logs
  FOR UPDATE TO authenticated 
  USING (
    client_id = public.get_user_client_id()
    AND public.is_plant_authorized(plant_id)
  )
  WITH CHECK (
    client_id = public.get_user_client_id()
    AND public.is_plant_authorized(plant_id)
  );

CREATE POLICY "daily_logs_delete" ON public.daily_logs
  FOR DELETE TO authenticated 
  USING (
    client_id = public.get_user_client_id()
    AND public.is_plant_authorized(plant_id)
  );

-- Trigger for audit_daily_logs
CREATE OR REPLACE FUNCTION public.audit_daily_logs_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
    VALUES (
      NEW.client_id, 
      auth.uid(), 
      'Inclusão', 
      'Registro de presença ' || NEW.status::text || ' para ' || NEW.type || ' ID ' || NEW.reference_id::text || ' na data ' || NEW.date::text || ' (Planta: ' || NEW.plant_id::text || ')'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
    VALUES (
      NEW.client_id, 
      auth.uid(), 
      'Atualização', 
      'Registro de presença ' || NEW.status::text || ' para ' || NEW.type || ' ID ' || NEW.reference_id::text || ' na data ' || NEW.date::text || ' (Planta: ' || NEW.plant_id::text || ')'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_daily_logs ON public.daily_logs;
CREATE TRIGGER audit_daily_logs
  AFTER INSERT OR UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_daily_logs_fn();

-- Fix Sorriso plant & permissions
DO $$
DECLARE
  v_client_id UUID;
  v_sorriso_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the master client or first client
  SELECT id INTO v_client_id FROM public.clients LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    -- Check if Sorriso exists
    SELECT id INTO v_sorriso_id FROM public.plants WHERE name ILIKE '%Sorriso%' LIMIT 1;
    
    IF v_sorriso_id IS NULL THEN
      -- Create Sorriso
      v_sorriso_id := gen_random_uuid();
      INSERT INTO public.plants (id, name, client_id, status)
      VALUES (v_sorriso_id, 'Sorriso', v_client_id, 'Ativo');
    ELSE
      -- Fix client_id of Sorriso
      UPDATE public.plants SET client_id = v_client_id WHERE id = v_sorriso_id;
    END IF;

    -- Add Sorriso to all users of that client so they can access it (seed data adjustment)
    FOR v_user_id IN SELECT id FROM public.profiles WHERE client_id = v_client_id LOOP
      UPDATE public.profiles
      SET authorized_plants = CASE 
        WHEN authorized_plants IS NULL THEN jsonb_build_array(v_sorriso_id::text)
        WHEN NOT authorized_plants ? v_sorriso_id::text THEN authorized_plants || to_jsonb(v_sorriso_id::text)
        ELSE authorized_plants
      END
      WHERE id = v_user_id;
    END LOOP;
  END IF;
END $$;
