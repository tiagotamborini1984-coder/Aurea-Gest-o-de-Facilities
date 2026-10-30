-- Migration: 20261030120100_org_collaborator_plants.sql
-- Description: Adiciona relação de muitas plantas para colaboradores no organograma, mantendo compatibilidade retroativa e RLS por tenant/client.

CREATE TABLE IF NOT EXISTS public.org_collaborator_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL REFERENCES public.org_collaborators(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_collaborator_plant UNIQUE (collaborator_id, plant_id)
);

CREATE INDEX IF NOT EXISTS idx_org_collab_plants_collab ON public.org_collaborator_plants(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_org_collab_plants_plant ON public.org_collaborator_plants(plant_id);
CREATE INDEX IF NOT EXISTS idx_org_collab_plants_client ON public.org_collaborator_plants(client_id);

-- Migrar dados existentes de org_collaborators.plant_id para org_collaborator_plants
INSERT INTO public.org_collaborator_plants (collaborator_id, plant_id, client_id)
SELECT id, plant_id, client_id
FROM public.org_collaborators
WHERE plant_id IS NOT NULL
ON CONFLICT (collaborator_id, plant_id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.org_collaborator_plants ENABLE ROW LEVEL SECURITY;

-- RLS Policies compatíveis com tenant_isolation das tabelas do organograma
DROP POLICY IF EXISTS "tenant_isolation_org_collaborator_plants" ON public.org_collaborator_plants;
CREATE POLICY "tenant_isolation_org_collaborator_plants" ON public.org_collaborator_plants
  FOR ALL TO authenticated
  USING ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()))
  WITH CHECK ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()));
