-- Migration: create_satisfaction_surveys_module
-- Módulo de Pesquisa de Satisfação

-- 1. Tabela de Pesquisas de Satisfação
CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  survey_type TEXT NOT NULL DEFAULT 'Geral', -- Tipo/categoria (ex: Refeitório, Limpeza, Recepção, Geral, Eventos)
  plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL, -- Opcional: restrito a uma planta específica ou todas (NULL)
  location_name TEXT, -- Local específico dentro da planta (ex: "Refeitório Central", "Portaria 1")
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_multiple_responses BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Faixas de Horário de Disponibilidade
CREATE TABLE IF NOT EXISTS public.satisfaction_survey_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.satisfaction_surveys(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INT[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=Domingo, 1=Segunda, ..., 6=Sábado
  description TEXT, -- Ex: "Horário de Almoço", "Café da Manhã"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Perguntas da Pesquisa
CREATE TABLE IF NOT EXISTS public.satisfaction_survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.satisfaction_surveys(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  question_type TEXT NOT NULL, -- 'rating_10' (0 a 10), 'rating_5' (estrelas 1 a 5), 'multiple_choice', 'text'
  options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de strings para multiple_choice: ["Excelente", "Bom", "Regular", "Ruim"]
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela de Respostas Submetidas (Sessão / Formulário preenchido)
CREATE TABLE IF NOT EXISTS public.satisfaction_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.satisfaction_surveys(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  location_name TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_info JSONB DEFAULT '{}'::jsonb
);

-- 5. Tabela de Itens de Resposta (Cada pergunta respondida)
CREATE TABLE IF NOT EXISTS public.satisfaction_survey_response_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.satisfaction_survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.satisfaction_survey_questions(id) ON DELETE CASCADE,
  numeric_value NUMERIC, -- Para notas 0-10 ou 1-5
  text_value TEXT,       -- Para resposta de texto livre ou opção selecionada de múltipla escolha
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_sat_surveys_client_id ON public.satisfaction_surveys(client_id);
CREATE INDEX IF NOT EXISTS idx_sat_surveys_plant_id ON public.satisfaction_surveys(plant_id);
CREATE INDEX IF NOT EXISTS idx_sat_schedules_survey_id ON public.satisfaction_survey_schedules(survey_id);
CREATE INDEX IF NOT EXISTS idx_sat_questions_survey_id ON public.satisfaction_survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_sat_responses_survey_id ON public.satisfaction_survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_sat_responses_client_id ON public.satisfaction_survey_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_sat_responses_plant_id ON public.satisfaction_survey_responses(plant_id);
CREATE INDEX IF NOT EXISTS idx_sat_responses_submitted_at ON public.satisfaction_survey_responses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_sat_answers_response_id ON public.satisfaction_survey_response_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_sat_answers_question_id ON public.satisfaction_survey_response_answers(question_id);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_survey_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_survey_response_answers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DO $$
BEGIN
  -- satisfaction_surveys
  DROP POLICY IF EXISTS "tenant_isolation_sat_surveys" ON public.satisfaction_surveys;
  CREATE POLICY "tenant_isolation_sat_surveys" ON public.satisfaction_surveys
    FOR ALL TO authenticated
    USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
    WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

  DROP POLICY IF EXISTS "anon_select_sat_surveys" ON public.satisfaction_surveys;
  CREATE POLICY "anon_select_sat_surveys" ON public.satisfaction_surveys
    FOR SELECT TO anon
    USING (is_active = true);

  -- satisfaction_survey_schedules
  DROP POLICY IF EXISTS "tenant_isolation_sat_schedules" ON public.satisfaction_survey_schedules;
  CREATE POLICY "tenant_isolation_sat_schedules" ON public.satisfaction_survey_schedules
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.satisfaction_surveys s
        WHERE s.id = satisfaction_survey_schedules.survey_id
          AND (get_user_role() = 'Master' OR s.client_id = get_user_client_id())
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.satisfaction_surveys s
        WHERE s.id = satisfaction_survey_schedules.survey_id
          AND (get_user_role() = 'Master' OR s.client_id = get_user_client_id())
      )
    );

  DROP POLICY IF EXISTS "anon_select_sat_schedules" ON public.satisfaction_survey_schedules;
  CREATE POLICY "anon_select_sat_schedules" ON public.satisfaction_survey_schedules
    FOR SELECT TO anon
    USING (true);

  -- satisfaction_survey_questions
  DROP POLICY IF EXISTS "tenant_isolation_sat_questions" ON public.satisfaction_survey_questions;
  CREATE POLICY "tenant_isolation_sat_questions" ON public.satisfaction_survey_questions
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.satisfaction_surveys s
        WHERE s.id = satisfaction_survey_questions.survey_id
          AND (get_user_role() = 'Master' OR s.client_id = get_user_client_id())
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.satisfaction_surveys s
        WHERE s.id = satisfaction_survey_questions.survey_id
          AND (get_user_role() = 'Master' OR s.client_id = get_user_client_id())
      )
    );

  DROP POLICY IF EXISTS "anon_select_sat_questions" ON public.satisfaction_survey_questions;
  CREATE POLICY "anon_select_sat_questions" ON public.satisfaction_survey_questions
    FOR SELECT TO anon
    USING (true);

  -- satisfaction_survey_responses
  DROP POLICY IF EXISTS "tenant_isolation_sat_responses" ON public.satisfaction_survey_responses;
  CREATE POLICY "tenant_isolation_sat_responses" ON public.satisfaction_survey_responses
    FOR ALL TO authenticated
    USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
    WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

  -- satisfaction_survey_response_answers
  DROP POLICY IF EXISTS "tenant_isolation_sat_answers" ON public.satisfaction_survey_response_answers;
  CREATE POLICY "tenant_isolation_sat_answers" ON public.satisfaction_survey_response_answers
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.satisfaction_survey_responses r
        WHERE r.id = satisfaction_survey_response_answers.response_id
          AND (get_user_role() = 'Master' OR r.client_id = get_user_client_id())
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.satisfaction_survey_responses r
        WHERE r.id = satisfaction_survey_response_answers.response_id
          AND (get_user_role() = 'Master' OR r.client_id = get_user_client_id())
      )
    );
END $$;

-- Função RPC para submissão anônima e segura com validação de horário no backend
CREATE OR REPLACE FUNCTION public.submit_survey_response(
  p_survey_id UUID,
  p_plant_id UUID DEFAULT NULL,
  p_location_name TEXT DEFAULT NULL,
  p_answers JSONB DEFAULT '[]'::jsonb, -- Array de { question_id, numeric_value, text_value }
  p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey RECORD;
  v_now_time TIME;
  v_now_date DATE;
  v_now_dow INT;
  v_has_schedules BOOLEAN;
  v_is_within_schedule BOOLEAN;
  v_response_id UUID;
  v_elem JSONB;
  v_q_id UUID;
  v_num_val NUMERIC;
  v_text_val TEXT;
  v_target_plant_id UUID;
  v_target_location TEXT;
BEGIN
  -- 1. Buscar a pesquisa
  SELECT * INTO v_survey
  FROM public.satisfaction_surveys
  WHERE id = p_survey_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesquisa não encontrada.');
  END IF;

  IF NOT v_survey.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta pesquisa está desativada no momento.');
  END IF;

  -- 2. Validar período de validade por data
  v_now_date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;
  IF v_survey.start_date IS NOT NULL AND v_now_date < v_survey.start_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta pesquisa ainda não iniciou.');
  END IF;

  IF v_survey.end_date IS NOT NULL AND v_now_date > v_survey.end_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta pesquisa já foi encerrada.');
  END IF;

  -- 3. Validar faixas de horário (se configuradas)
  SELECT EXISTS(
    SELECT 1 FROM public.satisfaction_survey_schedules WHERE survey_id = p_survey_id
  ) INTO v_has_schedules;

  IF v_has_schedules THEN
    v_now_time := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::time;
    v_now_dow := EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))::int;

    SELECT EXISTS(
      SELECT 1 FROM public.satisfaction_survey_schedules
      WHERE survey_id = p_survey_id
        AND (days_of_week IS NULL OR v_now_dow = ANY(days_of_week))
        AND (
          -- Caso normal: start_time <= end_time
          (start_time <= end_time AND v_now_time >= start_time AND v_now_time <= end_time)
          OR
          -- Caso cruza a meia-noite: ex: 22:00 até 02:00
          (start_time > end_time AND (v_now_time >= start_time OR v_now_time <= end_time))
        )
    ) INTO v_is_within_schedule;

    IF NOT v_is_within_schedule THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Fora do horário de funcionamento da pesquisa.'
      );
    END IF;
  END IF;

  -- Determinar planta e local
  v_target_plant_id := COALESCE(p_plant_id, v_survey.plant_id);
  v_target_location := COALESCE(p_location_name, v_survey.location_name);

  -- 4. Criar registro de resposta
  INSERT INTO public.satisfaction_survey_responses (
    survey_id,
    client_id,
    plant_id,
    location_name,
    submitted_at,
    device_info
  ) VALUES (
    v_survey.id,
    v_survey.client_id,
    v_target_plant_id,
    v_target_location,
    NOW(),
    p_device_info
  ) RETURNING id INTO v_response_id;

  -- 5. Inserir itens de respostas
  IF p_answers IS NOT NULL AND jsonb_array_length(p_answers) > 0 THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
      v_q_id := (v_elem->>'question_id')::uuid;
      v_num_val := NULL;
      IF (v_elem ? 'numeric_value') AND (v_elem->>'numeric_value') IS NOT NULL AND (v_elem->>'numeric_value') != '' THEN
        v_num_val := (v_elem->>'numeric_value')::numeric;
      END IF;
      v_text_val := NULL;
      IF (v_elem ? 'text_value') AND (v_elem->>'text_value') IS NOT NULL THEN
        v_text_val := v_elem->>'text_value';
      END IF;

      INSERT INTO public.satisfaction_survey_response_answers (
        response_id,
        question_id,
        numeric_value,
        text_value
      ) VALUES (
        v_response_id,
        v_q_id,
        v_num_val,
        v_text_val
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'response_id', v_response_id,
    'message', 'Pesquisa respondida com sucesso!'
  );
END;
$$;

-- Permitir que anon e authenticated executem a RPC
GRANT EXECUTE ON FUNCTION public.submit_survey_response(UUID, UUID, TEXT, JSONB, JSONB) TO anon, authenticated;
