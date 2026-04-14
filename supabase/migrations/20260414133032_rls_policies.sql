-- 1. Create secure helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_client_id() RETURNS uuid AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_authorized_plants() RETURNS jsonb AS $$
  SELECT authorized_plants FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_id uuid) RETURNS boolean AS $$
DECLARE
  v_role text;
  v_plants jsonb;
BEGIN
  v_role := public.get_user_role();
  IF v_role IN ('Master', 'Administrador') THEN
    RETURN true;
  END IF;
  
  v_plants := public.get_user_authorized_plants();
  IF v_plants IS NULL OR jsonb_typeof(v_plants) != 'array' OR jsonb_array_length(v_plants) = 0 THEN
    RETURN false;
  END IF;

  RETURN v_plants @> to_jsonb(p_id::text);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

DO $$
DECLARE
  table_name text;
BEGIN
  -- Drop existing open policies
  FOR table_name IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access on %I" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all_%I" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%I" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_%I" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_%I" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_%I" ON public.%I', table_name, table_name);
  END LOOP;
END $$;

-- Profiles
DROP POLICY IF EXISTS "Profiles access" ON public.profiles;
CREATE POLICY "Profiles access" ON public.profiles FOR ALL TO authenticated USING (
  id = auth.uid() OR
  public.get_user_role() = 'Master' OR
  (public.get_user_role() IN ('Administrador', 'Gestor') AND client_id = public.get_user_client_id())
) WITH CHECK (
  id = auth.uid() OR
  public.get_user_role() = 'Master' OR
  (public.get_user_role() IN ('Administrador', 'Gestor') AND client_id = public.get_user_client_id())
);

-- Clients
DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;
CREATE POLICY "tenant_isolation_clients" ON public.clients FOR ALL TO authenticated USING (
  public.get_user_role() = 'Master' OR id = public.get_user_client_id()
) WITH CHECK (
  public.get_user_role() = 'Master' OR id = public.get_user_client_id()
);

-- Tables with client_id only
DO $$
DECLARE
  t text;
  tables_with_client_id text[] := ARRAY[
    'audit_logs', 'audits', 'companies', 'employee_training_records',
    'function_required_trainings', 'functions', 'goals_book',
    'package_types', 'task_statuses', 'task_types', 'trainings'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_client_id
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "tenant_isolation_%I" ON public.%I FOR ALL TO authenticated USING (
      public.get_user_role() = ''Master'' OR client_id = public.get_user_client_id()
    ) WITH CHECK (
      public.get_user_role() = ''Master'' OR client_id = public.get_user_client_id()
    )', t, t);
  END LOOP;
END $$;

-- Tables with client_id AND plant_id
DO $$
DECLARE
  t text;
  tables_with_plant_id text[] := ARRAY[
    'cleaning_gardening_areas', 'cleaning_gardening_schedules', 'contracted_headcount',
    'daily_logs', 'employees', 'equipment', 'locations', 'monthly_goals_data',
    'packages', 'plant_non_working_days', 'plants', 'tasks', 'audit_assignments', 'audit_executions'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_plant_id
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "plant_isolation_%I" ON public.%I', t, t);
    IF t IN ('audit_assignments', 'audit_executions') THEN
      EXECUTE format('CREATE POLICY "plant_isolation_%I" ON public.%I FOR ALL TO authenticated USING (
        public.is_plant_authorized(plant_id)
      ) WITH CHECK (
        public.is_plant_authorized(plant_id)
      )', t, t);
    ELSE
      EXECUTE format('CREATE POLICY "plant_isolation_%I" ON public.%I FOR ALL TO authenticated USING (
        (public.get_user_role() = ''Master'' OR client_id = public.get_user_client_id()) AND
        public.is_plant_authorized(plant_id)
      ) WITH CHECK (
        (public.get_user_role() = ''Master'' OR client_id = public.get_user_client_id()) AND
        public.is_plant_authorized(plant_id)
      )', t, t);
    END IF;
  END LOOP;
END $$;

-- Generic access for other tables
DO $$
DECLARE
  t text;
  other_tables text[] := ARRAY[
    'audit_actions', 'audit_execution_answers', 'task_timeline'
  ];
BEGIN
  FOREACH t IN ARRAY other_tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "generic_access_%I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "generic_access_%I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
