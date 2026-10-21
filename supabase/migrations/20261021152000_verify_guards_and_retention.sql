-- Migration: 20261021152000_verify_guards_and_retention.sql
-- Validação Automatizada da Camada 2 (Guarda contra DELETE em massa) e Camada 3 (Retenção de Snapshots)

DO $$
DECLARE
  v_dummy_blocked BOOLEAN := false;
  v_cleanup_result JSONB;
BEGIN
  -- 1. Testar bloqueio de deleção em massa sem flag
  -- Criamos uma tabela temporária de teste com o mesmo trigger para comprovar a recusa
  CREATE TEMP TABLE temp_test_guard (
    id INT PRIMARY KEY,
    name TEXT
  ) ON COMMIT DROP;

  INSERT INTO temp_test_guard VALUES (1, 'A'), (2, 'B'), (3, 'C'), (4, 'D'), (5, 'E'), (6, 'F'), (7, 'G');

  CREATE TRIGGER trg_test_guard_prevent_mass_delete
  BEFORE DELETE ON temp_test_guard
  FOR EACH ROW EXECUTE FUNCTION public.guard_prevent_mass_delete();

  -- Tenta deletar mais de 5 linhas (deve disparar a exceção do guard)
  BEGIN
    DELETE FROM temp_test_guard;
    v_dummy_blocked := false;
  EXCEPTION WHEN OTHERS THEN
    -- Exceção esperada! O guard bloqueou com sucesso!
    v_dummy_blocked := true;
    RAISE NOTICE 'Guarda de proteção testado e aprovado com sucesso: %', SQLERRM;
  END;

  IF NOT v_dummy_blocked THEN
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: O guard de deleção em massa não bloqueou a operação destrutiva!';
  END IF;

  -- 2. Testar que com aprovação explícita (flag 'true') o guard permite:
  PERFORM set_config('app.allow_mass_destructive_operation', 'true', true);
  -- Agora deve deletar sem erro
  DELETE FROM temp_test_guard;
  -- Reseta a flag
  PERFORM set_config('app.allow_mass_destructive_operation', 'false', true);

  -- 3. Testar a rotina de limpeza de retenção
  -- Cria uma tabela de teste simulando snapshot antigo de 40 dias atrás: snapshot_companies_20260901
  CREATE TABLE IF NOT EXISTS public.snapshot_test_retention_20260901 AS
    SELECT 'teste_retencao' AS nome;

  -- Executa limpeza com retenção padrão de 30 dias
  v_cleanup_result := public.cleanup_old_database_snapshots(30);
  RAISE NOTICE 'Resultado da limpeza de retenção: %', v_cleanup_result;

  -- Verifica se a tabela antiga foi removida
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'snapshot_test_retention_20260901') THEN
    RAISE EXCEPTION 'FALHA NA ROTINA DE RETENÇÃO: A tabela de snapshot antiga snapshot_test_retention_20260901 não foi removida!';
  END IF;

  RAISE NOTICE 'Todas as validações de integridade e blindagem foram concluídas com êxito!';
END $$;
