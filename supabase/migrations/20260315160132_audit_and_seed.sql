CREATE OR REPLACE FUNCTION public.clean_old_audit_logs()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '2 months';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_clean_audit_logs ON public.audit_logs;
CREATE TRIGGER trigger_clean_audit_logs
  AFTER INSERT ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.clean_old_audit_logs();

-- Seed some mock data for demo
DO $$
DECLARE
  demo_client_id UUID;
  master_user_id UUID;
  plant_id UUID := gen_random_uuid();
  loc1_id UUID := gen_random_uuid();
  loc2_id UUID := gen_random_uuid();
  func1_id UUID := gen_random_uuid();
  emp1_id UUID := gen_random_uuid();
  emp2_id UUID := gen_random_uuid();
  eq1_id UUID := gen_random_uuid();
  goal1_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO demo_client_id FROM public.clients WHERE url_slug = 'demo-corp' LIMIT 1;
  SELECT id INTO master_user_id FROM auth.users WHERE email = 'admin@aurea.com' LIMIT 1;
  
  IF demo_client_id IS NOT NULL THEN
    -- Check if seed already exists to be idempotent
    IF NOT EXISTS (SELECT 1 FROM public.plants WHERE client_id = demo_client_id LIMIT 1) THEN
      INSERT INTO public.plants (id, client_id, name, code, city) VALUES 
      (plant_id, demo_client_id, 'Fábrica SP', 'SP01', 'São Paulo');
      
      INSERT INTO public.locations (id, plant_id, name) VALUES 
      (loc1_id, plant_id, 'Linha de Produção 1'), (loc2_id, plant_id, 'Estoque Central');
      
      INSERT INTO public.functions (id, client_id, name) VALUES 
      (func1_id, demo_client_id, 'Operador de Logística');
      
      INSERT INTO public.employees (id, client_id, plant_id, location_id, function_id, company_name, name) VALUES 
      (emp1_id, demo_client_id, plant_id, loc1_id, func1_id, 'Terceirizada RH', 'Carlos Silva'),
      (emp2_id, demo_client_id, plant_id, loc2_id, func1_id, 'Terceirizada RH', 'Ana Souza');
      
      INSERT INTO public.equipment (id, client_id, plant_id, name, type, quantity) VALUES 
      (eq1_id, demo_client_id, plant_id, 'Empilhadeira Elétrica', 'Logística', 2);
      
      INSERT INTO public.contracted_headcount (client_id, plant_id, location_id, function_id, type, quantity) VALUES 
      (demo_client_id, plant_id, loc1_id, func1_id, 'colaborador', 4),
      (demo_client_id, plant_id, loc2_id, func1_id, 'colaborador', 3),
      (demo_client_id, plant_id, NULL, NULL, 'equipamento', 2);
      
      INSERT INTO public.goals_book (id, client_id, name, description) VALUES 
      (goal1_id, demo_client_id, 'Disponibilidade de Frota', 'Manter acima de 95%');
      
      INSERT INTO public.daily_logs (client_id, plant_id, date, type, reference_id, status) VALUES 
      (demo_client_id, plant_id, CURRENT_DATE, 'staff', emp1_id, true),
      (demo_client_id, plant_id, CURRENT_DATE, 'staff', emp2_id, false),
      (demo_client_id, plant_id, CURRENT_DATE - INTERVAL '1 day', 'staff', emp1_id, true),
      (demo_client_id, plant_id, CURRENT_DATE - INTERVAL '1 day', 'staff', emp2_id, true),
      (demo_client_id, plant_id, CURRENT_DATE, 'equipment', eq1_id, true);
    END IF;
  END IF;
END $$;
