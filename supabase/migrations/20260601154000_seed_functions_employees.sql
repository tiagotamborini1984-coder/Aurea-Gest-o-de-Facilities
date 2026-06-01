DO $$
DECLARE
  v_client_id UUID;
  v_plant_id UUID;
  v_func_limpeza UUID;
  v_func_seguranca UUID;
  v_func_manutencao UUID;
BEGIN
  -- Get first active client
  SELECT id INTO v_client_id FROM public.clients WHERE status = 'Ativo' LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    -- Get or create plant
    SELECT id INTO v_plant_id FROM public.plants WHERE client_id = v_client_id LIMIT 1;

    IF v_plant_id IS NOT NULL THEN
      -- Check if we already seeded to avoid duplicates
      IF NOT EXISTS (SELECT 1 FROM public.functions WHERE name = 'Auxiliar de Limpeza' AND client_id = v_client_id) THEN
        v_func_limpeza := gen_random_uuid();
        v_func_seguranca := gen_random_uuid();
        v_func_manutencao := gen_random_uuid();

        INSERT INTO public.functions (id, client_id, name, description)
        VALUES 
          (v_func_limpeza, v_client_id, 'Auxiliar de Limpeza', 'Limpeza geral'),
          (v_func_seguranca, v_client_id, 'Vigilante', 'Segurança patrimonial'),
          (v_func_manutencao, v_client_id, 'Técnico de Manutenção', 'Manutenção preventiva');

        INSERT INTO public.employees (id, client_id, plant_id, function_id, company_name, name, status, reference_month)
        VALUES 
          (gen_random_uuid(), v_client_id, v_plant_id, v_func_limpeza, 'Limpeza Corp', 'Maria Silva', 'Ativo', date_trunc('month', CURRENT_DATE)),
          (gen_random_uuid(), v_client_id, v_plant_id, v_func_seguranca, 'Segurança Total', 'João Souza', 'Ativo', date_trunc('month', CURRENT_DATE)),
          (gen_random_uuid(), v_client_id, v_plant_id, v_func_manutencao, 'Manutenção Pro', 'Carlos Alves', 'Ativo', date_trunc('month', CURRENT_DATE));

        INSERT INTO public.contracted_headcount (id, client_id, plant_id, type, function_id, quantity, reference_month)
        VALUES 
          (gen_random_uuid(), v_client_id, v_plant_id, 'colaborador', v_func_limpeza, 5, date_trunc('month', CURRENT_DATE)),
          (gen_random_uuid(), v_client_id, v_plant_id, 'colaborador', v_func_seguranca, 3, date_trunc('month', CURRENT_DATE));
      END IF;
    END IF;
  END IF;
END $$;
