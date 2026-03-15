-- Seed data to ensure the Dashboard Gestor has realistic data to display
DO $$
DECLARE
    v_client_id UUID;
    v_plant1_id UUID := gen_random_uuid();
    v_plant2_id UUID := gen_random_uuid();
    v_loc1_id UUID := gen_random_uuid();
    v_loc2_id UUID := gen_random_uuid();
    v_loc3_id UUID := gen_random_uuid();
    v_func_id UUID := gen_random_uuid();
    v_emp1_id UUID := gen_random_uuid();
    v_emp2_id UUID := gen_random_uuid();
    v_emp3_id UUID := gen_random_uuid();
    v_goal1_id UUID := gen_random_uuid();
    v_goal2_id UUID := gen_random_uuid();
BEGIN
    -- Get the first available client (e.g., Demo Corp from previous migration)
    SELECT id INTO v_client_id FROM public.clients LIMIT 1;

    IF v_client_id IS NOT NULL THEN
        -- Insert Plants
        INSERT INTO public.plants (id, client_id, name, code, city) VALUES
        (v_plant1_id, v_client_id, 'Sorriso', 'SOR', 'Sorriso - MT'),
        (v_plant2_id, v_client_id, 'Primavera do Leste', 'PRM', 'Primavera do Leste - MT')
        ON CONFLICT DO NOTHING;

        -- Insert Locations
        INSERT INTO public.locations (id, plant_id, name, description) VALUES
        (v_loc1_id, v_plant1_id, 'SMT - Limpeza Adm', 'Área administrativa'),
        (v_loc2_id, v_plant1_id, 'SMT - Jardinagem', 'Áreas externas'),
        (v_loc3_id, v_plant2_id, 'SMT - Produção', 'Galpão principal')
        ON CONFLICT DO NOTHING;

        -- Insert Functions
        INSERT INTO public.functions (id, client_id, name) VALUES
        (v_func_id, v_client_id, 'Operador de Facilities')
        ON CONFLICT DO NOTHING;

        -- Insert Contracted Headcount (Colaboradores)
        INSERT INTO public.contracted_headcount (client_id, type, plant_id, location_id, function_id, quantity) VALUES
        (v_client_id, 'colaborador', v_plant1_id, v_loc1_id, v_func_id, 16),
        (v_client_id, 'colaborador', v_plant1_id, v_loc2_id, v_func_id, 12),
        (v_client_id, 'colaborador', v_plant2_id, v_loc3_id, v_func_id, 25)
        ON CONFLICT DO NOTHING;

        -- Insert Employees
        INSERT INTO public.employees (id, client_id, plant_id, location_id, function_id, company_name, name) VALUES
        (v_emp1_id, v_client_id, v_plant1_id, v_loc1_id, v_func_id, 'Terceirizada Alpha', 'João Silva'),
        (v_emp2_id, v_client_id, v_plant1_id, v_loc2_id, v_func_id, 'Terceirizada Alpha', 'Maria Santos'),
        (v_emp3_id, v_client_id, v_plant2_id, v_loc3_id, v_func_id, 'Terceirizada Beta', 'Carlos Pereira')
        ON CONFLICT DO NOTHING;

        -- Insert Daily Logs (Presence/Absence) for the last 5 days
        FOR i IN 0..4 LOOP
            -- Employee 1: Always present
            INSERT INTO public.daily_logs (client_id, date, plant_id, type, reference_id, status) VALUES
            (v_client_id, CURRENT_DATE - i, v_plant1_id, 'staff', v_emp1_id, true)
            ON CONFLICT DO NOTHING;
            
            -- Employee 2: Absent 1 day
            INSERT INTO public.daily_logs (client_id, date, plant_id, type, reference_id, status) VALUES
            (v_client_id, CURRENT_DATE - i, v_plant1_id, 'staff', v_emp2_id, case when i = 2 then false else true end)
            ON CONFLICT DO NOTHING;

            -- Employee 3: Always present
            INSERT INTO public.daily_logs (client_id, date, plant_id, type, reference_id, status) VALUES
            (v_client_id, CURRENT_DATE - i, v_plant2_id, 'staff', v_emp3_id, true)
            ON CONFLICT DO NOTHING;
        END LOOP;

        -- Insert Goals
        INSERT INTO public.goals_book (id, client_id, name, description) VALUES
        (v_goal1_id, v_client_id, 'Aderência ao cronograma de Jardinagem', 'Mede o quanto o cronograma de Jardinagem está sendo seguido conforme proposto.'),
        (v_goal2_id, v_client_id, 'Aderência ao Cronograma de Limpeza', 'Mede o quanto o cronograma de limpeza está sendo seguido conforme proposto.')
        ON CONFLICT DO NOTHING;

        -- Insert Monthly Goal Data for current month
        INSERT INTO public.monthly_goals_data (client_id, plant_id, goal_id, reference_month, value) VALUES
        (v_client_id, v_plant1_id, v_goal1_id, date_trunc('month', CURRENT_DATE)::date, 98.5),
        (v_client_id, v_plant1_id, v_goal2_id, date_trunc('month', CURRENT_DATE)::date, 100.0)
        ON CONFLICT DO NOTHING;

    END IF;
END $$;
