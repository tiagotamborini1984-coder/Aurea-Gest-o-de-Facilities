-- Fix RLS for clients to allow Administrador role
DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;

CREATE POLICY "tenant_isolation_clients" ON public.clients
  FOR ALL TO authenticated
  USING (
    (public.get_user_role() IN ('Master', 'Administrador')) OR 
    (id = public.get_user_client_id())
  )
  WITH CHECK (
    (public.get_user_role() IN ('Master', 'Administrador')) OR 
    (id = public.get_user_client_id())
  );

-- Create procedure to migrate client data
CREATE OR REPLACE FUNCTION public.migrate_client_data(source_client_id uuid, target_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF source_client_id = target_client_id THEN
    RETURN;
  END IF;

  -- Core tables
  UPDATE public.plants SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.companies SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.functions SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.locations SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.equipment SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.trainings SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.package_types SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.task_statuses SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.task_types SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.goals_book SET client_id = target_client_id WHERE client_id = source_client_id;
  
  -- Child tables
  UPDATE public.employees SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.contracted_headcount SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.employee_training_records SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.function_required_trainings SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.cleaning_gardening_areas SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.cleaning_gardening_schedules SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.daily_logs SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.monthly_goals_data SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.packages SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.plant_non_working_days SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.tasks SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.audits SET client_id = target_client_id WHERE client_id = source_client_id;
  UPDATE public.audit_logs SET client_id = target_client_id WHERE client_id = source_client_id;

  -- Update profiles but leave Master alone to prevent access loss
  UPDATE public.profiles SET client_id = target_client_id WHERE client_id = source_client_id AND role NOT IN ('Master');
END;
$function$;
