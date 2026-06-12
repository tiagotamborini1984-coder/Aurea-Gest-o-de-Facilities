-- Ensure unique constraint exists for daily_logs upsert
CREATE UNIQUE INDEX IF NOT EXISTS daily_logs_date_type_reference_id_key ON public.daily_logs (date, type, reference_id);

-- Make is_plant_authorized more robust
CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_authorized_plants jsonb;
  v_role text;
  v_client_id uuid;
BEGIN
  -- Get user profile info
  SELECT authorized_plants, role, client_id INTO v_authorized_plants, v_role, v_client_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- Master has full access
  IF v_role = 'master' THEN
    RETURN true;
  END IF;

  -- Admin has access to all plants of their client
  IF v_role = 'admin' THEN
    IF EXISTS (SELECT 1 FROM public.plants WHERE id = p_id AND client_id = v_client_id) THEN
        RETURN true;
    END IF;
  END IF;

  -- Operator / User must have the plant in authorized_plants
  IF v_authorized_plants IS NOT NULL AND jsonb_typeof(v_authorized_plants) = 'array' THEN
    IF v_authorized_plants @> to_jsonb(p_id::text) OR v_authorized_plants @> to_jsonb(p_id) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- Fix policies for daily_logs
DROP POLICY IF EXISTS "Enable read access for authorized users" ON public.daily_logs;
DROP POLICY IF EXISTS "Enable insert for authorized users" ON public.daily_logs;
DROP POLICY IF EXISTS "Enable update for authorized users" ON public.daily_logs;
DROP POLICY IF EXISTS "Enable delete for authorized users" ON public.daily_logs;

CREATE POLICY "Enable read access for authorized users" ON public.daily_logs
    FOR SELECT TO authenticated
    USING (is_plant_authorized(plant_id));

CREATE POLICY "Enable insert for authorized users" ON public.daily_logs
    FOR INSERT TO authenticated
    WITH CHECK (is_plant_authorized(plant_id));

CREATE POLICY "Enable update for authorized users" ON public.daily_logs
    FOR UPDATE TO authenticated
    USING (is_plant_authorized(plant_id))
    WITH CHECK (is_plant_authorized(plant_id));

CREATE POLICY "Enable delete for authorized users" ON public.daily_logs
    FOR DELETE TO authenticated
    USING (is_plant_authorized(plant_id));

-- Fix policies for plant_non_working_days
DROP POLICY IF EXISTS "Enable read access for authorized users" ON public.plant_non_working_days;
DROP POLICY IF EXISTS "Enable insert for authorized users" ON public.plant_non_working_days;
DROP POLICY IF EXISTS "Enable update for authorized users" ON public.plant_non_working_days;
DROP POLICY IF EXISTS "Enable delete for authorized users" ON public.plant_non_working_days;

CREATE POLICY "Enable read access for authorized users" ON public.plant_non_working_days
    FOR SELECT TO authenticated
    USING (is_plant_authorized(plant_id));

CREATE POLICY "Enable insert for authorized users" ON public.plant_non_working_days
    FOR INSERT TO authenticated
    WITH CHECK (is_plant_authorized(plant_id));

CREATE POLICY "Enable update for authorized users" ON public.plant_non_working_days
    FOR UPDATE TO authenticated
    USING (is_plant_authorized(plant_id))
    WITH CHECK (is_plant_authorized(plant_id));

CREATE POLICY "Enable delete for authorized users" ON public.plant_non_working_days
    FOR DELETE TO authenticated
    USING (is_plant_authorized(plant_id));
