-- Migration: add_smiley_and_conditional_questions
-- Adiciona suporte a escala de rostinhos (smiley_5) e lógica de perguntas condicionais (subperguntas)

ALTER TABLE public.satisfaction_survey_questions
  ADD COLUMN IF NOT EXISTS is_conditional BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES public.satisfaction_survey_questions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trigger_values JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Índice para parent_question_id
CREATE INDEX IF NOT EXISTS idx_sat_questions_parent_id ON public.satisfaction_survey_questions(parent_question_id);
