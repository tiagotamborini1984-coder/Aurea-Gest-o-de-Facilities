-- Ensure RLS is enabled
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all existing policies on employees and daily_logs to clear any unit-specific or date-restricted logic (e.g., Sorriso plant hardcoded filters)
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename IN ('employees', 'daily_logs')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Recreate standard, correct policies for employees
CREATE POLICY "employees_select" ON public.employees
    FOR SELECT TO authenticated 
    USING (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id));

CREATE POLICY "employees_insert" ON public.employees
    FOR INSERT TO authenticated 
    WITH CHECK (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id));

CREATE POLICY "employees_update" ON public.employees
    FOR UPDATE TO authenticated 
    USING (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id))
    WITH CHECK (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id));

CREATE POLICY "employees_delete" ON public.employees
    FOR DELETE TO authenticated 
    USING (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id));

-- Recreate standard, correct policies for daily_logs
CREATE POLICY "daily_logs_select" ON public.daily_logs
    FOR SELECT TO authenticated 
    USING (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id));

CREATE POLICY "daily_logs_insert" ON public.daily_logs
    FOR INSERT TO authenticated 
    WITH CHECK (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id));

CREATE POLICY "daily_logs_update" ON public.daily_logs
    FOR UPDATE TO authenticated 
    USING (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id))
    WITH CHECK (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id));

CREATE POLICY "daily_logs_delete" ON public.daily_logs
    FOR DELETE TO authenticated 
    USING (client_id = public.get_user_client_id() AND public.is_plant_authorized(plant_id));
