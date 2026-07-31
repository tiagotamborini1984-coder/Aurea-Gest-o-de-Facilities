-- Rename 'Férias' to 'Gestão de Férias' in clients.modules JSON array
-- Step 1: Add 'Gestão de Férias' to clients that have 'Férias' but not 'Gestão de Férias'
UPDATE public.clients
SET modules = modules || to_jsonb('Gestão de Férias'::text)
WHERE modules @> to_jsonb('Férias'::text)
  AND NOT modules @> to_jsonb('Gestão de Férias'::text);

-- Step 2: Remove 'Férias' from all clients (idempotent — no-op if 'Férias' doesn't exist)
UPDATE public.clients
SET modules = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(modules) AS elem
  WHERE elem != to_jsonb('Férias'::text)
)
WHERE modules @> to_jsonb('Férias'::text);
