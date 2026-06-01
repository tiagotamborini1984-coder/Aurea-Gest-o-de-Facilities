DO $$
DECLARE
  v_client record;
BEGIN
  FOR v_client IN SELECT id FROM public.clients LOOP
    IF NOT EXISTS (SELECT 1 FROM public.functions WHERE client_id = v_client.id) THEN
      INSERT INTO public.functions (id, client_id, name, description) VALUES 
        (gen_random_uuid(), v_client.id, 'Auxiliar de Limpeza', 'Responsável pela limpeza e higienização dos ambientes'),
        (gen_random_uuid(), v_client.id, 'Jardineiro', 'Responsável pela manutenção e conservação das áreas verdes'),
        (gen_random_uuid(), v_client.id, 'Porteiro', 'Responsável pelo controle de acesso e monitoramento'),
        (gen_random_uuid(), v_client.id, 'Eletricista', 'Manutenção elétrica preventiva e corretiva'),
        (gen_random_uuid(), v_client.id, 'Encanador', 'Manutenção hidráulica geral');
    END IF;
  END LOOP;
END $$;
