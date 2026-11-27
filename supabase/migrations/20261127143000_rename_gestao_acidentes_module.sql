-- Renomeia o módulo 'Gestão de Acidentes' para 'Gestão de Segurança' dentro do
-- array jsonb public.clients.modules (o item do menu foi renomeado no código).
-- Idempotente: só age em linhas que ainda contêm o nome antigo.
-- Regra permanente: backup interno das linhas afetadas antes do update, sem DELETE.

-- 1) Backup interno (padrão snapshot_*) das linhas de clients que serão tocadas.
CREATE TABLE IF NOT EXISTS snapshot_clients_modules_seguranca_20261127 (
  id uuid,
  name text,
  modules jsonb,
  backed_up_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE snapshot_clients_modules_seguranca_20261127 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS snapshot_read_auth ON snapshot_clients_modules_seguranca_20261127;
CREATE POLICY snapshot_read_auth ON snapshot_clients_modules_seguranca_20261127
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Master','Administrador'))
  );

INSERT INTO snapshot_clients_modules_seguranca_20261127 (id, name, modules)
SELECT c.id, c.name, c.modules
FROM public.clients c
WHERE c.modules @> '["Gestão de Acidentes"]'::jsonb
  AND NOT EXISTS (
    SELECT 1 FROM snapshot_clients_modules_seguranca_20261127 b WHERE b.id = c.id
  );

-- 2) Substitui 'Gestão de Acidentes' por 'Gestão de Segurança', preservando a posição.
UPDATE public.clients c
SET modules = (
  SELECT COALESCE(jsonb_agg(
    CASE WHEN elem #>> '{}' = 'Gestão de Acidentes' THEN to_jsonb('Gestão de Segurança'::text) ELSE elem END
  ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements(c.modules) WITH ORDINALITY AS t(elem, ord)
)
WHERE c.modules @> '["Gestão de Acidentes"]'::jsonb;

-- 3) Se a empresa ganhou um 'Gestão de Segurança' duplicado (já tinha o novo E o antigo),
--    remove a duplicata preservando a posição da primeira ocorrência.
UPDATE public.clients c
SET modules = (
  SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
  FROM (
    SELECT elem, ord,
           row_number() OVER (PARTITION BY elem ORDER BY ord) AS rn
    FROM jsonb_array_elements(c.modules) WITH ORDINALITY AS t(elem, ord)
  ) d
  WHERE d.elem #>> '{}' <> 'Gestão de Segurança' OR d.rn = 1
)
WHERE c.modules @> '["Gestão de Segurança"]'::jsonb
  AND (SELECT COUNT(*) FROM jsonb_array_elements(c.modules) e WHERE e #>> '{}' = 'Gestão de Segurança') > 1;
