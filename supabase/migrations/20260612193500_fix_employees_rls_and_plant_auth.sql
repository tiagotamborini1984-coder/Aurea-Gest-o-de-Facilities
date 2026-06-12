-- Fix is_plant_authorized to handle lowercase role mapping accurately
CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_authorized_plants jsonb;
  v_role text;
  v_client_id uuid;
BEGIN
  -- Get user profile info
  SELECT authorized_plants, lower(role), client_id INTO v_authorized_plants, v_role, v_client_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- Master has full access
  IF v_role = 'master' THEN
    RETURN true;
  END IF;

  -- Admin has access to all plants of their client
  IF v_role IN ('admin', 'administrador') THEN
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
$function$;

-- Update get_user_role for completeness
CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$function$;

-- Fix RLS Policies for employees
DROP POLICY IF EXISTS "plant_isolation_employees" ON public.employees;
CREATE POLICY "plant_isolation_employees" ON public.employees
  FOR ALL TO authenticated
  USING (
    (lower(get_user_role()) = 'master' OR client_id = get_user_client_id()) AND is_plant_authorized(plant_id)
  )
  WITH CHECK (
    (lower(get_user_role()) = 'master' OR client_id = get_user_client_id()) AND is_plant_authorized(plant_id)
  );

-- Fix RLS Policies for daily_logs
DROP POLICY IF EXISTS "plant_isolation_daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Enable delete for authorized users" ON public.daily_logs;
DROP POLICY IF EXISTS "Enable insert for authorized users" ON public.daily_logs;
DROP POLICY IF EXISTS "Enable read access for authorized users" ON public.daily_logs;
DROP POLICY IF EXISTS "Enable update for authorized users" ON public.daily_logs;

CREATE POLICY "plant_isolation_daily_logs" ON public.daily_logs
  FOR ALL TO authenticated
  USING (
    (lower(get_user_role()) = 'master' OR client_id = get_user_client_id()) AND is_plant_authorized(plant_id)
  )
  WITH CHECK (
    (lower(get_user_role()) = 'master' OR client_id = get_user_client_id()) AND is_plant_authorized(plant_id)
  );

-- Insert optional seed data for employees
DO $$
DECLARE
  v_client_id uuid;
  v_plant_id uuid;
  v_company_id uuid;
  v_function_id uuid;
BEGIN
  -- Get first active client
  SELECT id INTO v_client_id FROM public.clients WHERE status = 'Ativo' LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    -- Try to find plant "Sorriso" or any plant
    SELECT id INTO v_plant_id FROM public.plants WHERE client_id = v_client_id AND name ILIKE '%Sorriso%' LIMIT 1;
    IF v_plant_id IS NULL THEN
      SELECT id INTO v_plant_id FROM public.plants WHERE client_id = v_client_id LIMIT 1;
    END IF;
    
    -- If no plant exists, create one
    IF v_plant_id IS NULL THEN
      v_plant_id := gen_random_uuid();
      INSERT INTO public.plants (id, client_id, name, code, city) 
      VALUES (v_plant_id, v_client_id, 'Plant Sorriso', 'PL-SOR', 'Sorriso')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Get or create company
    SELECT id INTO v_company_id FROM public.companies WHERE client_id = v_client_id LIMIT 1;
    IF v_company_id IS NULL THEN
      v_company_id := gen_random_uuid();
      INSERT INTO public.companies (id, client_id, name, service_type)
      VALUES (v_company_id, v_client_id, 'Empresa Parceira S/A', 'Limpeza')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Get or create function
    SELECT id INTO v_function_id FROM public.functions WHERE client_id = v_client_id LIMIT 1;
    IF v_function_id IS NULL THEN
      v_function_id := gen_random_uuid();
      INSERT INTO public.functions (id, client_id, name)
      VALUES (v_function_id, v_client_id, 'Auxiliar Geral')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Seed employees for current month and some specific month
    IF v_plant_id IS NOT NULL AND v_company_id IS NOT NULL THEN
      INSERT INTO public.employees (
        id, client_id, plant_id, company_id, function_id, company_name, name, status, reference_month, registration_number
      ) VALUES 
        (gen_random_uuid(), v_client_id, v_plant_id, v_company_id, v_function_id, 'Empresa Parceira S/A', 'João da Silva', 'Ativo', date_trunc('month', CURRENT_DATE), 'REG-99901'),
        (gen_random_uuid(), v_client_id, v_plant_id, v_company_id, v_function_id, 'Empresa Parceira S/A', 'Maria Souza', 'Ativo', date_trunc('month', CURRENT_DATE), 'REG-99902')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;
