-- Migration aditiva para configurações de Horas Extras e aprovadores por planta
-- Criada em: 2026-11-07

CREATE TABLE IF NOT EXISTS public.horas_extras_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'all' CHECK (mode IN ('all', 'per_plant')),
  default_approver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_he_config_client UNIQUE (client_id)
);

CREATE TABLE IF NOT EXISTS public.horas_extras_plant_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  approver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_he_plant_approver UNIQUE (client_id, plant_id)
);

-- Suporte aditivo a múltiplos e-mails no cadastro de empresas
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS emails text[] DEFAULT '{}';

-- Habilitar RLS
ALTER TABLE public.horas_extras_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horas_extras_plant_approvers ENABLE ROW LEVEL SECURITY;

-- Policies para horas_extras_config
DROP POLICY IF EXISTS "he_config_select" ON public.horas_extras_config;
CREATE POLICY "he_config_select" ON public.horas_extras_config
  FOR SELECT TO authenticated
  USING ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()));

DROP POLICY IF EXISTS "he_config_write" ON public.horas_extras_config;
CREATE POLICY "he_config_write" ON public.horas_extras_config
  FOR ALL TO authenticated
  USING ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND (get_user_role() IN ('Administrador'::text, 'Gestor'::text))))
  WITH CHECK ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND (get_user_role() IN ('Administrador'::text, 'Gestor'::text))));

-- Policies para horas_extras_plant_approvers
DROP POLICY IF EXISTS "he_plant_approvers_select" ON public.horas_extras_plant_approvers;
CREATE POLICY "he_plant_approvers_select" ON public.horas_extras_plant_approvers
  FOR SELECT TO authenticated
  USING ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id()));

DROP POLICY IF EXISTS "he_plant_approvers_write" ON public.horas_extras_plant_approvers;
CREATE POLICY "he_plant_approvers_write" ON public.horas_extras_plant_approvers
  FOR ALL TO authenticated
  USING ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND (get_user_role() IN ('Administrador'::text, 'Gestor'::text))))
  WITH CHECK ((get_user_role() = 'Master'::text) OR ((client_id = get_user_client_id()) AND (get_user_role() IN ('Administrador'::text, 'Gestor'::text))));
