-- Exclusão pontual e autorizada da usuária Gleiccy
-- (26f2fd15-fa83-43d2-93d4-6122be3ed81f / gleiccy.bertolini@fs.agr.br).
-- Autorização explícita do usuário nesta rodada. NÃO usar como modelo para outras exclusões.
-- Registros vinculados são preservados (FKs em SET NULL pela migração anterior);
-- aqui apenas anulamos as referências remanescentes nas tabelas que antes eram CASCADE,
-- removemos o perfil público e a credencial de auth.

DO $$
DECLARE
  v_user_id uuid := '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE NOTICE 'Usuária já removida — nada a fazer.';
    RETURN;
  END IF;

  -- 1. Segurança extra: anula referências em tabelas cujas FKs apontam para o usuário,
  --    de forma idempotente (não apaga nada, só desvincula).
  UPDATE public.tasks SET requester_id = NULL WHERE requester_id = v_user_id;
  UPDATE public.tasks SET assignee_id = NULL WHERE assignee_id = v_user_id;
  UPDATE public.tasks SET previous_assignee_id = NULL WHERE previous_assignee_id = v_user_id;
  UPDATE public.tasks SET approved_by = NULL WHERE approved_by = v_user_id;
  UPDATE public.task_timeline SET user_id = NULL WHERE user_id = v_user_id;
  UPDATE public.audit_assignments SET assignee_id = NULL WHERE assignee_id = v_user_id;
  UPDATE public.user_plants SET user_id = NULL WHERE user_id = v_user_id;
  UPDATE public.requesters SET user_id = NULL WHERE user_id = v_user_id;
  UPDATE public.audit_logs SET user_id = NULL WHERE user_id = v_user_id;

  -- 2. Remove o perfil público.
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 3. Remove a credencial de auth (cascade interno do GoTrue limpa auth.*).
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE 'Usuária Gleiccy removida com registros preservados.';
END $$;
