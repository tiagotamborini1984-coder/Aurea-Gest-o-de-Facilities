-- ============================================================================
-- Troca de e-mail da conta do administrador Tiago Tamborini
-- ----------------------------------------------------------------------------
-- Contexto: a conta real (5c8fb418-b88c-4adb-9f11-59a6f2923637, "Tiago Tamborini",
-- tenant b395daab-aa2f-4492-9429-21b5493f41aa, role Administrador, e-mail
-- admin@aurea.com fictício) precisa passar a usar o e-mail real
-- lptamborini@hotmail.com para conseguir recuperar a senha.
--
-- Porém o e-mail lptamborini@hotmail.com JÁ EXISTE em auth.users como conta
-- fantasma (e7832374-73ce-4ad7-9d6f-d8a7e3d8a26d, "Admin LPTamborini",
-- tenant 00bb5b84-1e10-414f-9c74-88b1b0ff257c, NUNCA logou, sem FKs).
-- Solução: trocar os e-mails entre as duas contas (a fantasma cede o endereço,
-- assumindo um endereço liberado), preservando o id da conta real e todo o seu
-- histórico (requesters.user_id etc. referenciam o ID, não o e-mail).
--
-- REGRA PERMANENTE DO USUÁRIO: backup interno das linhas afetadas ANTES da
-- mudança. Feito abaixo em snapshot_email_swap_20261112 (JSONB de cada linha).
--
-- Nenhum DELETE/DROP de dados. Nenhuma policy, nenhum outro usuário afetado.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. BACKUP: snapshot das linhas de auth.users e profiles antes da mudança
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.snapshot_email_swap_20261112 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taken_at timestamptz NOT NULL DEFAULT now(),
  source_table text NOT NULL,
  user_id uuid NOT NULL,
  old_email text NOT NULL,
  new_email text NOT NULL,
  row_data jsonb NOT NULL
);

DO $$
DECLARE
  v_real  uuid := '5c8fb418-b88c-4adb-9f11-59a6f2923637'; -- Tiago Tamborini (admin@aurea.com)
  v_ghost uuid := 'e7832374-73ce-4ad7-9d6f-d8a7e3d8a26d'; -- fantasma (lptamborini@hotmail.com)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_real  AND lower(email) = 'admin@aurea.com')
     OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_ghost AND lower(email) = 'lptamborini@hotmail.com') THEN
    RAISE EXCEPTION 'Estado inesperado do banco: contas alvo não encontradas com os e-mails esperados. Migração abortada.';
  END IF;

  -- Já executada antes? Não repetir (idempotência).
  IF EXISTS (SELECT 1 FROM public.snapshot_email_swap_20261112 WHERE user_id IN (v_real, v_ghost)) THEN
    RETURN;
  END IF;

  -- Backup auth.users (linha completa)
  INSERT INTO public.snapshot_email_swap_20261112 (source_table, user_id, old_email, new_email, row_data)
  SELECT 'auth.users', id,
         CASE WHEN id = v_real THEN 'admin@aurea.com' ELSE 'lptamborini@hotmail.com' END,
         CASE WHEN id = v_real THEN 'lptamborini@hotmail.com' ELSE 'liberado-aurea-nov-2026@troca-interna.local' END,
         to_jsonb(u)
  FROM auth.users u WHERE id IN (v_real, v_ghost);

  -- Backup profiles (linha completa)
  INSERT INTO public.snapshot_email_swap_20261112 (source_table, user_id, old_email, new_email, row_data)
  SELECT 'public.profiles', id,
         CASE WHEN id = v_real THEN 'admin@aurea.com' ELSE 'lptamborini@hotmail.com' END,
         CASE WHEN id = v_real THEN 'lptamborini@hotmail.com' ELSE 'liberado-aurea-nov-2026@troca-interna.local' END,
         to_jsonb(p)
  FROM public.profiles p WHERE id IN (v_real, v_ghost);
END $$;

-- ---------------------------------------------------------------------------
-- 2. SWAP em auth.users (a fantasma cede o e-mail, depois a conta real assume)
--    Token columns = '' (nunca NULL) e phone = NULL (UNIQUE) — convenção GoTrue.
--    E-mail já confirmado para que o login e/senha funcione imediatamente.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_real  uuid := '5c8fb418-b88c-4adb-9f11-59a6f2923637';
  v_ghost uuid := 'e7832374-73ce-4ad7-9d6f-d8a7e3d8a26d';
BEGIN
  IF EXISTS (SELECT 1 FROM public.snapshot_email_swap_20261112 WHERE user_id = v_ghost AND source_table = 'auth.users')
     AND (SELECT lower(email) FROM auth.users WHERE id = v_real) = 'admin@aurea.com' THEN
    -- Passo A: fantasma sai do hotmail para o endereço liberado
    UPDATE auth.users SET
      email = 'liberado-aurea-nov-2026@troca-interna.local',
      email_confirmed_at = now(),
      email_change = '',
      email_change_token_new = '',
      email_change_token_current = '',
      email_change_sent_at = NULL,
      confirmation_token = '',
      recovery_token = '',
      recovery_sent_at = NULL,
      updated_at = now()
    WHERE id = v_ghost;

    -- Passo B: conta real do Tiago assume o hotmail, confirmada e sem pendências
    UPDATE auth.users SET
      email = 'lptamborini@hotmail.com',
      email_confirmed_at = now(),
      email_change = '',
      email_change_token_new = '',
      email_change_token_current = '',
      email_change_sent_at = NULL,
      confirmation_token = '',
      recovery_token = '',
      recovery_sent_at = NULL,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"name": "Tiago Tamborini"}'::jsonb,
      updated_at = now()
    WHERE id = v_real;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. SWAP em public.profiles (mesma lógica)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_real  uuid := '5c8fb418-b88c-4adb-9f11-59a6f2923637';
  v_ghost uuid := 'e7832374-73ce-4ad7-9d6f-d8a7e3d8a26d';
BEGIN
  IF EXISTS (SELECT 1 FROM public.snapshot_email_swap_20261112 WHERE user_id = v_ghost AND source_table = 'public.profiles')
     AND (SELECT lower(email) FROM public.profiles WHERE id = v_real) = 'admin@aurea.com' THEN
    UPDATE public.profiles SET email = 'liberado-aurea-nov-2026@troca-interna.local' WHERE id = v_ghost;
    UPDATE public.profiles SET email = 'lptamborini@hotmail.com' WHERE id = v_real;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Espelha o novo e-mail na tabela legada public.requesters (row do Master User)
-- ---------------------------------------------------------------------------
UPDATE public.requesters
SET email = 'lptamborini@hotmail.com'
WHERE user_id = '5c8fb418-b88c-4adb-9f11-59a6f2923637'
  AND lower(email) = 'admin@aurea.com';

-- ---------------------------------------------------------------------------
-- 5. Senha TEMPORÁRIA (equivalente a auth.admin.updateUserById({ password }))
--    via crypt(): o Tiago não lembra a senha antiga, então redefinição por
--    e-mail não era viável. Ele entra com a senha temporária e o app força a
--    definição de uma nova (force_password_change).
-- ---------------------------------------------------------------------------
UPDATE auth.users
SET encrypted_password = crypt('Aurea@Rec2026!', gen_salt('bf')),
    updated_at = now()
WHERE id = '5c8fb418-b88c-4adb-9f11-59a6f2923637';

-- Força a troca de senha no próximo acesso: a tela de Login (view
-- update_password) consome profiles.force_password_change e o usuário define
-- a própria senha (atende os requisitos de força do app).
UPDATE public.profiles
SET force_password_change = true
WHERE id = '5c8fb418-b88c-4adb-9f11-59a6f2923637'
  AND force_password_change IS NOT TRUE;
