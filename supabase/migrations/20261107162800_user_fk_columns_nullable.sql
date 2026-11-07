-- Generaliza a regra da exclusão de usuários: TODAS as colunas de FK no schema public
-- que referenciam public.profiles ou auth.users devem permitir NULL, para que o
-- ON DELETE SET NULL funcione sem violar NOT NULL (o que bloquearia a exclusão
-- com o erro "Database error deleting user" / "registros vinculados").
--
-- Não apaga nem altera dados — apenas relaxa a obrigatoriedade da referência.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT
      c.conrelid::regclass AS tbl,
      a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attname = ANY (c.conkey::text[]::name[])
    WHERE c.contype = 'f'
      AND c.confrelid IN ('auth.users'::regclass, 'public.profiles'::regclass)
      AND c.conrelid::regclass::text LIKE 'public.%'
  LOOP
    EXECUTE format('ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);
  END LOOP;
END $$;
