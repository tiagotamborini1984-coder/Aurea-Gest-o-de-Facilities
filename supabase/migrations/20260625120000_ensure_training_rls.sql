-- Ensure RLS policies for trainings and employee_training_records
DO $$
BEGIN
    -- Table: trainings
    DROP POLICY IF EXISTS "trainings_select" ON public.trainings;
    CREATE POLICY "trainings_select" ON public.trainings
        FOR SELECT TO authenticated USING (true);

    -- Table: employees
    DROP POLICY IF EXISTS "employees_select" ON public.employees;
    CREATE POLICY "employees_select" ON public.employees
        FOR SELECT TO authenticated USING (true);

    -- Table: employee_training_records
    DROP POLICY IF EXISTS "employee_training_records_select" ON public.employee_training_records;
    CREATE POLICY "employee_training_records_select" ON public.employee_training_records
        FOR SELECT TO authenticated USING (true);

    -- Table: function_required_trainings
    DROP POLICY IF EXISTS "function_required_trainings_select" ON public.function_required_trainings;
    CREATE POLICY "function_required_trainings_select" ON public.function_required_trainings
        FOR SELECT TO authenticated USING (true);
END $$;
