-- Migration: Criação das tabelas de Horas Extras e Chaves de API
-- Totalmente ADITIVA (sem DELETE/DROP), com RLS por tenant/planta e triggers de auditoria/updated_at

CREATE TABLE IF NOT EXISTS public.horas_extras_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric(5,2) NOT NULL CHECK (hours > 0),
  reason text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name text,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by_name text,
  approved_at timestamp with time zone,
  manager_observation text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de Chaves de API para sistemas externos das empresas contratadas
CREATE TABLE IF NOT EXISTS public.horas_extras_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL, -- Ex: 'ahe_live_...' (primeiros caracteres visíveis)
  key_hash text NOT NULL UNIQUE, -- SHA-256 da chave em formato hex
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamp with time zone,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_he_solicitacoes_client_plant ON public.horas_extras_solicitacoes (client_id, plant_id);
CREATE INDEX IF NOT EXISTS idx_he_solicitacoes_company ON public.horas_extras_solicitacoes (company_id);
CREATE INDEX IF NOT EXISTS idx_he_solicitacoes_status ON public.horas_extras_solicitacoes (status);
CREATE INDEX IF NOT EXISTS idx_he_solicitacoes_date ON public.horas_extras_solicitacoes (date);
CREATE INDEX IF NOT EXISTS idx_he_api_keys_hash ON public.horas_extras_api_keys (key_hash) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_he_api_keys_company ON public.horas_extras_api_keys (company_id);

-- Trigger de updated_at para horas_extras_solicitacoes
CREATE OR REPLACE FUNCTION public.set_horas_extras_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_horas_extras_solicitacoes_updated_at ON public.horas_extras_solicitacoes;
CREATE TRIGGER trg_horas_extras_solicitacoes_updated_at
BEFORE UPDATE ON public.horas_extras_solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.set_horas_extras_updated_at();

-- Habilitar RLS
ALTER TABLE public.horas_extras_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horas_extras_api_keys ENABLE ROW LEVEL SECURITY;

-- Políticas para horas_extras_solicitacoes:
-- 1. SELECT: Master vê tudo; Admin vê do seu client_id; Operacional vê do seu client_id e plantas autorizadas
CREATE POLICY "he_solicitacoes_select"
ON public.horas_extras_solicitacoes
FOR SELECT
TO authenticated
USING (
  (get_user_role() = 'Master')
  OR (
    client_id = get_user_client_id()
    AND (
      get_user_role() = 'Administrador'
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            p.authorized_plants IS NULL
            OR p.authorized_plants = '[]'::jsonb
            OR p.authorized_plants ? plant_id::text
          )
      )
    )
  )
);

-- 2. INSERT: Qualquer usuário autenticado no seu client_id (ou Master) pode criar solicitação
CREATE POLICY "he_solicitacoes_insert"
ON public.horas_extras_solicitacoes
FOR INSERT
TO authenticated
WITH CHECK (
  (get_user_role() = 'Master')
  OR (
    client_id = get_user_client_id()
    AND (
      get_user_role() = 'Administrador'
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            p.authorized_plants IS NULL
            OR p.authorized_plants = '[]'::jsonb
            OR p.authorized_plants ? plant_id::text
          )
      )
    )
  )
);

-- 3. UPDATE: Apenas Administrador (gestor) ou Master podem aprovar/recusar/alterar
CREATE POLICY "he_solicitacoes_update"
ON public.horas_extras_solicitacoes
FOR UPDATE
TO authenticated
USING (
  (get_user_role() = 'Master')
  OR (
    get_user_role() = 'Administrador'
    AND client_id = get_user_client_id()
  )
)
WITH CHECK (
  (get_user_role() = 'Master')
  OR (
    get_user_role() = 'Administrador'
    AND client_id = get_user_client_id()
  )
);

-- 4. DELETE: Apenas Administrador ou Master
CREATE POLICY "he_solicitacoes_delete"
ON public.horas_extras_solicitacoes
FOR DELETE
TO authenticated
USING (
  (get_user_role() = 'Master')
  OR (
    get_user_role() = 'Administrador'
    AND client_id = get_user_client_id()
  )
);

-- Políticas para horas_extras_api_keys:
-- Apenas Administrador do tenant ou Master podem gerenciar chaves de API
CREATE POLICY "he_api_keys_select"
ON public.horas_extras_api_keys
FOR SELECT
TO authenticated
USING (
  (get_user_role() = 'Master')
  OR (
    get_user_role() = 'Administrador'
    AND client_id = get_user_client_id()
  )
);

CREATE POLICY "he_api_keys_insert"
ON public.horas_extras_api_keys
FOR INSERT
TO authenticated
WITH CHECK (
  (get_user_role() = 'Master')
  OR (
    get_user_role() = 'Administrador'
    AND client_id = get_user_client_id()
  )
);

CREATE POLICY "he_api_keys_update"
ON public.horas_extras_api_keys
FOR UPDATE
TO authenticated
USING (
  (get_user_role() = 'Master')
  OR (
    get_user_role() = 'Administrador'
    AND client_id = get_user_client_id()
  )
)
WITH CHECK (
  (get_user_role() = 'Master')
  OR (
    get_user_role() = 'Administrador'
    AND client_id = get_user_client_id()
  )
);

CREATE POLICY "he_api_keys_delete"
ON public.horas_extras_api_keys
FOR DELETE
TO authenticated
USING (
  (get_user_role() = 'Master')
  OR (
    get_user_role() = 'Administrador'
    AND client_id = get_user_client_id()
  )
);
