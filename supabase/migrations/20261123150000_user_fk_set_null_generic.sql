-- Padrão de exclusão de usuário: toda FK de public.* para profiles/auth.users deve ser
-- ON DELETE SET NULL com coluna nullable, para que excluir um usuário nunca apague histórico.
-- Esta migração é genérica e idempotente: se não houver FK fora do padrão, não faz nada.
-- (Usa o OID da tabela em vez de regclass::text, que omite o schema quando está no search_path.)

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid, a.attname AS col, c.confrelid
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND cardinality(c.conkey) = 1
      AND c.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
      AND c.conrelid <> 'public.profiles'::regclass
      AND c.confdeltype <> 'n'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.conrelid::regclass, r.conname);
    EXECUTE format('ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL', r.conrelid::regclass, r.col);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s(id) ON DELETE SET NULL',
      r.conrelid::regclass, r.conname, r.col,
      CASE WHEN r.confrelid = 'auth.users'::regclass THEN 'auth.users' ELSE 'public.profiles' END
    );
  END LOOP;
END $$;
