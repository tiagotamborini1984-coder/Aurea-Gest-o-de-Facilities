-- Exclusão de usuário sem apagar histórico (regra permanente: registros nunca se apagam).
-- 1. Toda FK de public.* para profiles/auth.users fora de ON DELETE SET NULL (CASCADE, NO ACTION,
--    RESTRICT) passa a SET NULL, com a coluna nullable. profiles.id fica de fora (é a identidade).
-- 2. Backup interno, por ID exato, das linhas do usuário tilethjeans@hotmail.com antes da exclusão.
-- 3. Exclusão pontual desse único usuário (pedido explícito do Tiago).

-- 0) Backup interno ANTES de qualquer alteração (idempotente)
CREATE TABLE IF NOT EXISTS public.backup_user_delete (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  deleted_user_id uuid NOT NULL,
  source_table text NOT NULL,
  source_column text,
  row_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_user_delete ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS snapshot_read_auth ON public.backup_user_delete;
CREATE POLICY snapshot_read_auth ON public.backup_user_delete
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('Master', 'Administrador'));

DO $$
DECLARE
  uid constant uuid := '00488852-f8a2-4b31-b624-e87e63601066';
  r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.backup_user_delete WHERE deleted_user_id = uid) THEN
    -- Registro do próprio usuário em auth (sem senha)
    INSERT INTO public.backup_user_delete (deleted_user_id, source_table, source_column, row_data)
    SELECT uid, 'auth.users', 'id',
      jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at,
                         'raw_user_meta_data', u.raw_user_meta_data)
    FROM auth.users u WHERE u.id = uid;

    -- Linhas de public.* que referenciam o usuário (inclui o próprio profile)
    FOR r IN
      SELECT c.conrelid::regclass::text AS tbl, a.attname AS col
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
      WHERE c.contype = 'f'
        AND cardinality(c.conkey) = 1
        AND c.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
        AND c.conrelid::regclass::text LIKE 'public.%'
    LOOP
      EXECUTE format(
        'INSERT INTO public.backup_user_delete (deleted_user_id, source_table, source_column, row_data)
         SELECT %L::uuid, %L, %L, to_jsonb(t) FROM %s t WHERE t.%I = %L::uuid',
        uid, r.tbl, r.col, r.tbl, r.col, uid
      );
    END LOOP;
  END IF;
END $$;

-- 1) Trigger de chamados finalizados: permite apenas a anulação de FK (assignee_id/requester_id -> NULL)
--    feita pelo SET NULL da exclusão de usuário. Qualquer outra edição de chamado finalizado
--    por não-admin continua bloqueada.
CREATE OR REPLACE FUNCTION public.prevent_non_admin_edit_finalized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT := get_user_role();
  v_is_terminal BOOLEAN;
BEGIN
  IF v_role IN ('Master', 'Admin', 'Administrador') THEN
    RETURN NEW;
  END IF;

  SELECT is_terminal INTO v_is_terminal
  FROM public.maintenance_statuses
  WHERE id = OLD.status_id;

  IF v_is_terminal THEN
    -- Sem sessão de usuário (exclusão de auth.users / ON DELETE SET NULL): só anula o vínculo
    -- de assignee/requester; o restante do chamado continua protegido.
    IF auth.uid() IS NULL
       AND (NEW.assignee_id IS NULL OR NEW.assignee_id = OLD.assignee_id)
       AND (NEW.requester_id IS NULL OR NEW.requester_id = OLD.requester_id)
       AND (to_jsonb(NEW) - 'assignee_id' - 'requester_id') = (to_jsonb(OLD) - 'assignee_id' - 'requester_id')
    THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Chamado finalizado nao pode ser editado por usuarios nao administradores';
  END IF;

  RETURN NEW;
END;
$$;

-- 1b) Todas as FKs de public.* para profiles/auth.users passam a ON DELETE SET NULL
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass::text AS tbl, a.attname AS col,
           c.confrelid::regclass::text AS ref
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND cardinality(c.conkey) = 1
      AND c.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
      AND c.conrelid::regclass::text LIKE 'public.%'
      AND c.conrelid <> 'public.profiles'::regclass
      AND c.confdeltype <> 'n'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format('ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s(id) ON DELETE SET NULL',
      r.tbl, r.conname, r.col, r.ref
    );
  END LOOP;
END $$;

-- 2) Exclusão pontual (um único ID). O cascade do auth remove credencial e profile;
--    o histórico em public.* fica com a coluna anulada pelas FKs SET NULL.
DELETE FROM auth.users WHERE id = '00488852-f8a2-4b31-b624-e87e63601066'::uuid;
