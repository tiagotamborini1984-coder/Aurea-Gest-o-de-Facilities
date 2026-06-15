-- Ensure the helper functions exist and work properly for RLS and auth isolation
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
  v_is_master boolean;
BEGIN
  -- 1. Check if user is master
  SELECT is_super_admin INTO v_is_master 
  FROM public.profiles 
  WHERE id = auth.uid();

  -- 2. Master users bypass strict client_id checks if we don't have a default client assigned
  IF v_is_master THEN
    SELECT client_id INTO v_client_id FROM public.profiles WHERE id = auth.uid();
    RETURN v_client_id;
  END IF;

  -- 3. Return normal user client
  SELECT client_id INTO v_client_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN v_client_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_plant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_master boolean;
  v_user_client_id uuid;
  v_plant_client_id uuid;
  v_auth_plants jsonb;
BEGIN
  -- 1. Get user profile data
  SELECT is_super_admin, client_id, authorized_plants 
  INTO v_is_master, v_user_client_id, v_auth_plants
  FROM public.profiles 
  WHERE id = auth.uid();

  -- 2. Master users have access to everything
  IF v_is_master THEN
    RETURN true;
  END IF;

  -- 3. Get the plant's client_id
  SELECT client_id INTO v_plant_client_id
  FROM public.plants
  WHERE id = p_plant_id;

  -- 4. If the plant doesn't exist or doesn't belong to the user's client, deny
  IF v_plant_client_id IS NULL OR v_plant_client_id != v_user_client_id THEN
    RETURN false;
  END IF;

  -- 5. If user has specific authorized plants, check if p_plant_id is in the list
  IF v_auth_plants IS NOT NULL AND jsonb_array_length(v_auth_plants) > 0 THEN
    -- Match the UUID as text or native object correctly
    IF v_auth_plants @> to_jsonb(p_plant_id::text) OR v_auth_plants @> to_jsonb(p_plant_id) THEN
      RETURN true;
    ELSE
      RETURN false;
    END IF;
  END IF;

  -- 6. If authorized_plants is null/empty but plant belongs to client, default allow
  RETURN true;
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "daily_logs_select" ON public.daily_logs;
    DROP POLICY IF EXISTS "daily_logs_insert" ON public.daily_logs;
    DROP POLICY IF EXISTS "daily_logs_update" ON public.daily_logs;
    DROP POLICY IF EXISTS "daily_logs_delete" ON public.daily_logs;

    -- Drop older variations of policy names just in case
    DROP POLICY IF EXISTS "Users can view daily_logs for their client" ON public.daily_logs;
    DROP POLICY IF EXISTS "Users can insert daily_logs for their client" ON public.daily_logs;
    DROP POLICY IF EXISTS "Users can update daily_logs for their client" ON public.daily_logs;
    DROP POLICY IF EXISTS "Users can delete daily_logs for their client" ON public.daily_logs;
    DROP POLICY IF EXISTS "daily_logs_all" ON public.daily_logs;
END $$;

-- Re-create RLS for daily_logs
CREATE POLICY "daily_logs_select" ON public.daily_logs
FOR SELECT TO authenticated
USING (public.is_plant_authorized(plant_id));

CREATE POLICY "daily_logs_insert" ON public.daily_logs
FOR INSERT TO authenticated
WITH CHECK (
  public.is_plant_authorized(plant_id) AND
  (client_id = public.get_user_client_id() OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "daily_logs_update" ON public.daily_logs
FOR UPDATE TO authenticated
USING (public.is_plant_authorized(plant_id))
WITH CHECK (
  public.is_plant_authorized(plant_id) AND
  (client_id = public.get_user_client_id() OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "daily_logs_delete" ON public.daily_logs
FOR DELETE TO authenticated
USING (public.is_plant_authorized(plant_id));
