-- Migration: 20261029183000_cleaning_gardening_goals.sql
-- Description: Adiciona suporte a meta percentual para Limpeza e Jardinagem (global/por planta e por área)
-- Non-destructive, purely additive.

-- 1. Coluna target_percentage opcional na tabela cleaning_gardening_areas (meta específica da área)
ALTER TABLE public.cleaning_gardening_areas
ADD COLUMN IF NOT EXISTS target_percentage NUMERIC;

-- 2. Tabela para metas de Limpeza e Jardinagem (configuração geral do cliente ou por planta/área/período)
CREATE TABLE IF NOT EXISTS public.cleaning_gardening_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.cleaning_gardening_areas(id) ON DELETE CASCADE,
  target_percentage NUMERIC NOT NULL CHECK (target_percentage >= 0 AND target_percentage <= 100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_cleaning_gardening_goals_client
  ON public.cleaning_gardening_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_gardening_goals_plant
  ON public.cleaning_gardening_goals(plant_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_gardening_goals_area
  ON public.cleaning_gardening_goals(area_id);

-- Restrição única condicional para evitar metas duplicadas por cliente + planta + área
CREATE UNIQUE INDEX IF NOT EXISTS idx_cleaning_gardening_goals_unique_scope
  ON public.cleaning_gardening_goals (
    client_id,
    COALESCE(plant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(area_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Habilitar RLS
ALTER TABLE public.cleaning_gardening_goals ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento multitenant (cliente) para authenticated
DROP POLICY IF EXISTS "tenant_isolation_cleaning_gardening_goals_select" ON public.cleaning_gardening_goals;
CREATE POLICY "tenant_isolation_cleaning_gardening_goals_select"
  ON public.cleaning_gardening_goals
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_cleaning_gardening_goals_insert" ON public.cleaning_gardening_goals;
CREATE POLICY "tenant_isolation_cleaning_gardening_goals_insert"
  ON public.cleaning_gardening_goals
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_cleaning_gardening_goals_update" ON public.cleaning_gardening_goals;
CREATE POLICY "tenant_isolation_cleaning_gardening_goals_update"
  ON public.cleaning_gardening_goals
  FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "tenant_isolation_cleaning_gardening_goals_delete" ON public.cleaning_gardening_goals;
CREATE POLICY "tenant_isolation_cleaning_gardening_goals_delete"
  ON public.cleaning_gardening_goals
  FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());
