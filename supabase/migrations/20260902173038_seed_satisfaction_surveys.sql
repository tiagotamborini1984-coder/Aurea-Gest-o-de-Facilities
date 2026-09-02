-- Seed para Módulo de Pesquisa de Satisfação
-- Habilitar o módulo para os clientes padrão e inserir exemplos realistas

DO $$
DECLARE
  v_client_id UUID;
  v_plant_id UUID;
  v_survey_id UUID;
  v_q1 UUID;
  v_q2 UUID;
  v_q3 UUID;
  v_q4 UUID;
  v_resp_id UUID;
  v_i INT;
  v_date TIMESTAMPTZ;
  v_score NUMERIC;
BEGIN
  -- Atualizar clientes existentes para incluir o módulo "Pesquisa de Satisfação"
  UPDATE public.clients
  SET modules = (
    SELECT jsonb_agg(DISTINCT elem)
    FROM (
      SELECT jsonb_array_elements_text(COALESCE(modules, '[]'::jsonb)) AS elem
      UNION
      SELECT 'Pesquisa de Satisfação'
    ) t
  )
  WHERE modules IS NOT NULL;

  -- Obter cliente Aurea ou o primeiro
  SELECT id INTO v_client_id FROM public.clients ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_plant_id FROM public.plants WHERE client_id = v_client_id LIMIT 1;

  IF v_client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.satisfaction_surveys WHERE client_id = v_client_id) THEN
    -- Criar Pesquisa 1: Satisfação do Refeitório
    INSERT INTO public.satisfaction_surveys (
      id, client_id, title, description, survey_type, plant_id, location_name, start_date, end_date, is_active
    ) VALUES (
      gen_random_uuid(),
      v_client_id,
      'Avaliação dos Serviços de Refeitório & Alimentação',
      'Ajude-nos a aprimorar a qualidade dos alimentos, higiene e atendimento do nosso refeitório.',
      'Refeitório',
      v_plant_id,
      'Refeitório Central - Bloco B',
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE + INTERVAL '180 days',
      true
    ) RETURNING id INTO v_survey_id;

    -- Faixas de horário: Café (06:30 às 08:30), Almoço (11:00 às 14:00), Jantar (18:00 às 20:30)
    INSERT INTO public.satisfaction_survey_schedules (survey_id, start_time, end_time, description)
    VALUES 
      (v_survey_id, '06:30:00', '08:30:00', 'Café da Manhã'),
      (v_survey_id, '11:00:00', '14:30:00', 'Almoço'),
      (v_survey_id, '18:00:00', '21:00:00', 'Jantar');

    -- Perguntas
    INSERT INTO public.satisfaction_survey_questions (id, survey_id, title, description, question_type, options, is_required, order_index)
    VALUES (
      gen_random_uuid(),
      v_survey_id,
      'De 0 a 10, qual sua nota geral para o almoço/refeição de hoje?',
      'Considere sabor, temperatura e variedade',
      'rating_10',
      '[]'::jsonb,
      true,
      1
    ) RETURNING id INTO v_q1;

    INSERT INTO public.satisfaction_survey_questions (id, survey_id, title, description, question_type, options, is_required, order_index)
    VALUES (
      gen_random_uuid(),
      v_survey_id,
      'Como você avalia o atendimento da equipe de cozinha e copa?',
      'Classifique de 1 a 5 estrelas',
      'rating_5',
      '[]'::jsonb,
      true,
      2
    ) RETURNING id INTO v_q2;

    INSERT INTO public.satisfaction_survey_questions (id, survey_id, title, description, question_type, options, is_required, order_index)
    VALUES (
      gen_random_uuid(),
      v_survey_id,
      'Qual aspecto mais chamou sua atenção hoje?',
      'Escolha a opção que melhor reflete sua experiência',
      'multiple_choice',
      '["Qualidade dos Alimentos", "Variedade das Saladas", "Rapidez no Atendimento", "Limpeza das Mesas e Bandejas", "Temperatura das Bebidas"]'::jsonb,
      true,
      3
    ) RETURNING id INTO v_q3;

    INSERT INTO public.satisfaction_survey_questions (id, survey_id, title, description, question_type, options, is_required, order_index)
    VALUES (
      gen_random_uuid(),
      v_survey_id,
      'Deixe sua sugestão ou comentário para melhoria contínua:',
      'Campo opcional de texto livre',
      'text',
      '[]'::jsonb,
      false,
      4
    ) RETURNING id INTO v_q4;

    -- Gerar algumas respostas simuladas para enriquecer o dashboard
    FOR v_i IN 1..28 LOOP
      v_date := NOW() - (v_i * interval '1 day') - (floor(random() * 6) * interval '1 hour');
      v_score := (8 + floor(random() * 3)); -- 8, 9 ou 10 na maioria

      INSERT INTO public.satisfaction_survey_responses (
        survey_id, client_id, plant_id, location_name, submitted_at, device_info
      ) VALUES (
        v_survey_id, v_client_id, v_plant_id, 'Refeitório Central - Bloco B', v_date, '{"tablet": "Tablet 01 - Totem Salão"}'::jsonb
      ) RETURNING id INTO v_resp_id;

      INSERT INTO public.satisfaction_survey_response_answers (response_id, question_id, numeric_value, text_value)
      VALUES (v_resp_id, v_q1, v_score, NULL);

      INSERT INTO public.satisfaction_survey_response_answers (response_id, question_id, numeric_value, text_value)
      VALUES (v_resp_id, v_q2, CASE WHEN v_score >= 9 THEN 5 ELSE 4 END, NULL);

      INSERT INTO public.satisfaction_survey_response_answers (response_id, question_id, numeric_value, text_value)
      VALUES (v_resp_id, v_q3, NULL, CASE (v_i % 4) 
        WHEN 0 THEN 'Qualidade dos Alimentos' 
        WHEN 1 THEN 'Rapidez no Atendimento' 
        WHEN 2 THEN 'Limpeza das Mesas e Bandejas' 
        ELSE 'Variedade das Saladas' 
      END);

      IF (v_i % 3 = 0) THEN
        INSERT INTO public.satisfaction_survey_response_answers (response_id, question_id, numeric_value, text_value)
        VALUES (v_resp_id, v_q4, NULL, 'Ótima variedade hoje! Gostaria de ter mais opções de sobremesa com frutas.');
      END IF;
    END LOOP;

    -- Criar Pesquisa 2: Limpeza e Conservação Predial
    INSERT INTO public.satisfaction_surveys (
      id, client_id, title, description, survey_type, plant_id, location_name, start_date, end_date, is_active
    ) VALUES (
      gen_random_uuid(),
      v_client_id,
      'Avaliação de Limpeza, Sanitários e Conservação',
      'Pesquisa contínua nos banheiros e áreas comuns via totem/QRCode.',
      'Limpeza',
      v_plant_id,
      'Sanitários Bloco Administrativo',
      CURRENT_DATE - INTERVAL '15 days',
      CURRENT_DATE + INTERVAL '300 days',
      true
    ) RETURNING id INTO v_survey_id;

    -- Perguntas
    INSERT INTO public.satisfaction_survey_questions (id, survey_id, title, description, question_type, options, is_required, order_index)
    VALUES (
      gen_random_uuid(),
      v_survey_id,
      'Qual seu nível de satisfação com a limpeza deste ambiente agora?',
      'Avalie de 1 a 5 estrelas',
      'rating_5',
      '[]'::jsonb,
      true,
      1
    ) RETURNING id INTO v_q1;

    INSERT INTO public.satisfaction_survey_questions (id, survey_id, title, description, question_type, options, is_required, order_index)
    VALUES (
      gen_random_uuid(),
      v_survey_id,
      'Há reposição adequada de insumos (sabonete, papel toalha, álcool)?',
      'Selecione uma opção',
      'multiple_choice',
      '["Sim, tudo completo", "Falta papel toalha", "Falta sabonete", "Falta papel higiênico", "Lixeira cheia"]'::jsonb,
      true,
      2
    ) RETURNING id INTO v_q2;

    -- Gerar respostas simuladas para pesquisa 2
    FOR v_i IN 1..15 LOOP
      v_date := NOW() - (v_i * interval '1 day') + (floor(random() * 4) * interval '1 hour');

      INSERT INTO public.satisfaction_survey_responses (
        survey_id, client_id, plant_id, location_name, submitted_at, device_info
      ) VALUES (
        v_survey_id, v_client_id, v_plant_id, 'Sanitários Bloco Administrativo', v_date, '{"tablet": "Totem Sanitário 02"}'::jsonb
      ) RETURNING id INTO v_resp_id;

      INSERT INTO public.satisfaction_survey_response_answers (response_id, question_id, numeric_value, text_value)
      VALUES (v_resp_id, v_q1, CASE WHEN v_i % 5 = 0 THEN 3 ELSE 5 END, NULL);

      INSERT INTO public.satisfaction_survey_response_answers (response_id, question_id, numeric_value, text_value)
      VALUES (v_resp_id, v_q2, NULL, CASE WHEN v_i % 5 = 0 THEN 'Falta papel toalha' ELSE 'Sim, tudo completo' END);
    END LOOP;

  END IF;
END $$;
