-- Migration: user_delete_fk_set_null
-- Corrige o erro "Database error deleting user": toda FK do schema public que
-- referencia public.profiles ou auth.users com ação de delete NO ACTION/RESTRICT
-- bloqueia o cascade de auth.users -> profiles durante auth.admin.deleteUser().
-- Solução aditiva: essas FKs passam a ON DELETE SET NULL (colunas anuláveis),
-- preservando o histórico (solicitações, auditorias, tickets, etc.) sem órfãos.
-- Idempotente: constraints já com SET NULL/CASCADE/SET DEFAULT são ignoradas.

DO $$
DECLARE
  r RECORD;
  c RECORD;
  v_cols text;
  v_ref_cols text;
BEGIN
  FOR r IN
    SELECT con.conname,
           ns.nspname AS src_schema,
           tbl.relname AS src_table,
           con.conkey,
           con.confkey,
           rns.nspname AS ref_schema,
           rtbl.relname AS ref_table
    FROM pg_constraint con
    JOIN pg_class tbl ON con.conrelid = tbl.oid
    JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
    JOIN pg_class rtbl ON con.confrelid = rtbl.oid
    JOIN pg_namespace rns ON rtbl.relnamespace = rns.oid
    WHERE con.contype = 'f'
      AND ns.nspname = 'public'
      AND con.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%ON DELETE CASCADE%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%ON DELETE SET NULL%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%ON DELETE SET DEFAULT%'
  LOOP
    -- Colunas de origem da FK
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
      INTO v_cols
      FROM unnest(r.conkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a
        ON a.attrelid = (r.src_schema || '.' || r.src_table)::regclass
       AND a.attnum = k.attnum;

    -- Colunas referenciadas
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
      INTO v_ref_cols
      FROM unnest(r.confkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a
        ON a.attrelid = (r.ref_schema || '.' || r.ref_table)::regclass
       AND a.attnum = k.attnum;

    -- Colunas de origem precisam ser anuláveis para ON DELETE SET NULL
    FOR c IN
      SELECT a.attname, a.attnotnull
      FROM unnest(r.conkey) AS k(attnum)
      JOIN pg_attribute a
        ON a.attrelid = (r.src_schema || '.' || r.src_table)::regclass
       AND a.attnum = k.attnum
    LOOP
      IF c.attnotnull THEN
        EXECUTE format(
          'ALTER TABLE %I.%I ALTER COLUMN %I DROP NOT NULL',
          r.src_schema, r.src_table, c.attname
        );
      END IF;
    END LOOP;

    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
      r.src_schema, r.src_table, r.conname
    );

    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %I.%I (%s) ON DELETE SET NULL',
      r.src_schema, r.src_table, r.conname, v_cols, r.ref_schema, r.ref_table, v_ref_cols
    );
  END LOOP;
END $$;
