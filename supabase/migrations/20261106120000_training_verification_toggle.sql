-- Liga/desliga da conferência automática de listas de presença, POR CLIENTE.
--
-- Por que no cliente e não no perfil: a conferência é uma política da operação
-- (custa tempo de análise em cada anexo), não uma permissão de usuário. Desligar
-- para um cliente inteiro é o que o gestor precisa quando a reclamação é de
-- lentidão — e continua valendo para todos os usuários daquele cliente.
--
-- Chave: 'training_verification'. Formato:
--   { "training_verification": { "enabled": false, "mode": "manual" } }
--
-- Modos:
--   'auto'   → anexou, a IA confere e o selo trava o salvamento até o veredito (atual)
--   'manual' → nada automático: o usuário anexa, o selo fica "aguardando" e há um
--              botão "Conferir com IA" para pedir a análise quando quiser
--   'off'    → conferência desligada: o selo não aparece e o salvamento não exige
--              validação (o anexo é só arquivo)
--
-- Ausência da chave = 'auto' (mantém o comportamento de hoje).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.clients.settings IS
  'Preferencias operacionais do cliente. Chave training_verification: {enabled, mode}.';

CREATE OR REPLACE FUNCTION public.training_verification_config(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg jsonb;
BEGIN
  IF p_client_id IS NULL THEN
    RETURN jsonb_build_object('enabled', true, 'mode', 'auto');
  END IF;

  SELECT settings -> 'training_verification' INTO v_cfg
    FROM public.clients
   WHERE id = p_client_id;

  IF v_cfg IS NULL THEN
    RETURN jsonb_build_object('enabled', true, 'mode', 'auto');
  END IF;

  RETURN jsonb_build_object(
    'enabled', COALESCE((v_cfg ->> 'enabled')::boolean, true),
    'mode',    COALESCE(v_cfg ->> 'mode', 'auto')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.training_verification_config(uuid)
  TO authenticated, service_role;
