-- ============================================================================
-- Esconder o usuário Master da listagem de /usuarios para quem NÃO é Master
-- ----------------------------------------------------------------------------
-- O perfil Master (client_id NULL) só pode ser visto por: ele mesmo e por
-- outros Masters. Nenhum Administrador/Gestor/Manutentor/Operacional de
-- cliente deve receber a linha do Master em nenhuma listagem.
--
-- Hoje a policy de SELECT já isola por tenant (client_id IS NOT NULL AND
-- client_id = get_user_client_id()), o que exclui a linha do Master na
-- prática — mas a exclusão é implícita e depende do client_id continuar
-- NULL. Deixamos isso EXPLÍCITO: linha com role='Master' só passa para
-- quem é o próprio usuário ou é Master.
--
-- Cuidado: profiles_select_policy também alimenta SELECTs de outras telas
-- (nomes de aprovadores/solicitantes em HE, painel de chamados etc.).
-- Nessas telas o app resolve o nome por colunas *_name text nas próprias
-- tabelas (ex.: approved_by_name em horas_extras_solicitacoes) e por
-- SECURITY DEFINER (get_user_role/get_user_client_id), que não passam por
-- RLS — portanto nada quebra. E se o Master aprovar algo com nome exibido,
-- o campo de texto preserva o nome sem expor a linha do perfil.
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (
      -- Linhas de Master (role='Master' OU client_id NULL): só o próprio
      -- usuário ou outro Master enxergam.
      (role = 'Master' OR client_id IS NULL)
      AND (id = auth.uid() OR get_user_role() = 'Master')
    )
    OR (
      -- Demais linhas: isolamento por tenant, como antes.
      role <> 'Master'
      AND client_id IS NOT NULL
      AND client_id = get_user_client_id()
    )
  );
