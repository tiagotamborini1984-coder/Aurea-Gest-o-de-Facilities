-- Facilita — ajuste do limiar do cache de respostas (paráfrases: 0.62 pega variações naturais)
CREATE OR REPLACE FUNCTION public.facilita_cache_lookup(p_client UUID, p_qnorm TEXT)
RETURNS TABLE(answer TEXT, sources JSONB, score REAL)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT c.answer, c.sources, similarity(c.question_norm, p_qnorm) AS score
  FROM public.facilita_answer_cache c
  WHERE c.client_id = p_client
    AND c.created_at > NOW() - INTERVAL '30 days'
    AND similarity(c.question_norm, p_qnorm) >= 0.62
  ORDER BY similarity(c.question_norm, p_qnorm) DESC
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.facilita_cache_lookup(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.facilita_cache_lookup(UUID, TEXT) TO service_role;