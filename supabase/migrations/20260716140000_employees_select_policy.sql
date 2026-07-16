DO $$
DECLARE
  v_client_id uuid;
  v_plants jsonb;
BEGIN
  -- 1. Create a dedicated SELECT policy for employees based on client_id and role
  DROP POLICY IF EXISTS "employees_select" ON public.employees;
  CREATE POLICY "employees_select" ON public.employees
    FOR SELECT TO authenticated USING (
      client_id = public.get_user_client_id() OR public.get_user_role() = 'Master'
    );

  -- 2. Create the missing RLS policies for contracted_headcount as well
  DROP POLICY IF EXISTS "contracted_headcount_select" ON public.contracted_headcount;
  CREATE POLICY "contracted_headcount_select" ON public.contracted_headcount
    FOR SELECT TO authenticated USING (
      client_id = public.get_user_client_id() OR public.get_user_role() = 'Master'
    );

  -- 3. Fix initial user access (for testing/validation)
  -- Find the client ID of the first active client
  SELECT id INTO v_client_id FROM public.clients WHERE status = 'Ativo' ORDER BY created_at ASC LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    -- Gather all plants for that client to authorize
    SELECT COALESCE(jsonb_agg(id::text), '[]'::jsonb) INTO v_plants FROM public.plants WHERE client_id = v_client_id;
    
    -- Ensure the default admin user exists and has correct setup
    UPDATE public.profiles
    SET 
      client_id = v_client_id,
      authorized_plants = v_plants
    WHERE email = 'lptamborini@hotmail.com';

    -- Make sure 'rosangela' has access if she exists
    UPDATE public.profiles
    SET 
      client_id = v_client_id,
      role = 'Gestor',
      authorized_plants = v_plants
    WHERE email ILIKE '%rosangela%';
  END IF;

END $$;
