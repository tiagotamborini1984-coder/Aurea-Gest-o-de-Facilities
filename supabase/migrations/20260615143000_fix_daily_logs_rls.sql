-- 1. Ensure the authorization function exists
CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_plant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_authorized_plants JSONB;
BEGIN
  SELECT is_admin, authorized_plants 
  INTO v_is_admin, v_authorized_plants
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  IF v_authorized_plants IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify if plant_id is inside the JSONB array
  RETURN v_authorized_plants @> to_jsonb(p_plant_id::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update RLS policies for daily_logs
DROP POLICY IF EXISTS "daily_logs_insert" ON public.daily_logs;
CREATE POLICY "daily_logs_insert" ON public.daily_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE
      OR client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    )
    AND public.is_plant_authorized(plant_id)
  );

DROP POLICY IF EXISTS "daily_logs_update" ON public.daily_logs;
CREATE POLICY "daily_logs_update" ON public.daily_logs
  FOR UPDATE TO authenticated
  USING (
    (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE
      OR client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    )
    AND public.is_plant_authorized(plant_id)
  )
  WITH CHECK (
    (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE
      OR client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    )
    AND public.is_plant_authorized(plant_id)
  );

DROP POLICY IF EXISTS "daily_logs_select" ON public.daily_logs;
CREATE POLICY "daily_logs_select" ON public.daily_logs
  FOR SELECT TO authenticated
  USING (
    (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE
      OR client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    )
    AND public.is_plant_authorized(plant_id)
  );

DROP POLICY IF EXISTS "daily_logs_delete" ON public.daily_logs;
CREATE POLICY "daily_logs_delete" ON public.daily_logs
  FOR DELETE TO authenticated
  USING (
    (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE
      OR client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    )
    AND public.is_plant_authorized(plant_id)
  );

-- 3. Data Integrity: Verify 'Sorriso' plant is correctly associated with a valid client_id
DO $$
DECLARE
  v_master_client_id UUID;
BEGIN
  -- Get an active client ID to link the Sorriso plant (assuming the first available client)
  SELECT id INTO v_master_client_id FROM public.clients ORDER BY created_at ASC LIMIT 1;
  
  IF v_master_client_id IS NOT NULL THEN
    -- Update any 'Sorriso' plant that might be missing a client_id
    UPDATE public.plants
    SET client_id = v_master_client_id
    WHERE name ILIKE '%Sorriso%' AND client_id IS NULL;
  END IF;
END $$;
