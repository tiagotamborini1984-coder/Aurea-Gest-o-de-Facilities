-- Facilita — FRENTE 2: cache de respostas de conhecimento (economia de tokens)
-- Respostas do Maestro com fontes só de conhecimento (pop/know-how/web) são cacheadas
-- por client; perguntas similares (pg_trgm >= 0.85) reutilizam a resposta sem acionar o Maestro.
-- Invalidação: gatilho na exclusão de chunks (reindexação ou exclusão de POP) + TTL de 30 dias.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.facilita_answer_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_norm TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS facilita_answer_cache_client_idx ON public.facilita_answer_cache(client_id);
CREATE INDEX IF NOT EXISTS facilita_answer_cache_trgm_idx ON public.facilita_answer_cache USING gin (question_norm gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS facilita_answer_cache_uniq ON public.facilita_answer_cache(client_id, question_norm);

ALTER TABLE public.facilita_answer_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_facilita_answer_cache" ON public.facilita_answer_cache;
CREATE POLICY "tenant_isolation_facilita_answer_cache" ON public.facilita_answer_cache
  FOR ALL TO authenticated
  USING ((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id()))
  WITH CHECK ((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id()));

-- Lookup do cache (somente service role — chamado pela Edge Function facilities-copilot)
CREATE OR REPLACE FUNCTION public.facilita_cache_lookup(p_client UUID, p_qnorm TEXT)
RETURNS TABLE(answer TEXT, sources JSONB, score REAL)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT c.answer, c.sources, similarity(c.question_norm, p_qnorm) AS score
  FROM public.facilita_answer_cache c
  WHERE c.client_id = p_client
    AND c.created_at > NOW() - INTERVAL '30 days'
    AND similarity(c.question_norm, p_qnorm) >= 0.85
  ORDER BY similarity(c.question_norm, p_qnorm) DESC
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.facilita_cache_lookup(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.facilita_cache_lookup(UUID, TEXT) TO service_role;

-- Invalidação do cache quando chunks são removidos (reindexação de POP ou exclusão de documento)
CREATE OR REPLACE FUNCTION public.facilita_cache_invalidate()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.facilita_answer_cache
  WHERE client_id IN (
    SELECT DISTINCT client_id FROM deleted_rows WHERE client_id IS NOT NULL
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS facilita_chunks_invalidate_cache ON public.facilita_chunks;
CREATE TRIGGER facilita_chunks_invalidate_cache
AFTER DELETE ON public.facilita_chunks
REFERENCING OLD TABLE AS deleted_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.facilita_cache_invalidate();