-- Migration: Permite que o criador de uma solicitação de horas extras a edite
-- enquanto o status for 'pendente'. Totalmente ADITIVA (apenas nova política;
-- nenhuma tabela, coluna ou política existente é removida).

-- Substitui a política de UPDATE anterior para incluir o caso de edição pelo
-- criador da solicitação, ainda pendente. O Master e o Administrador do tenant
-- mantêm exatamente as permissões que já tinham (aprovar, recusar, editar).
DROP POLICY IF EXISTS "he_solicitacoes_update" ON public.horas_extras_solicitacoes;

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
  OR (
    created_by = auth.uid()
    AND status = 'pendente'
    AND client_id = get_user_client_id()
  )
)
WITH CHECK (
  (get_user_role() = 'Master')
  OR (
    get_user_role() = 'Administrador'
    AND client_id = get_user_client_id()
  )
  OR (
    created_by = auth.uid()
    AND status = 'pendente'
    AND client_id = get_user_client_id()
  )
);
