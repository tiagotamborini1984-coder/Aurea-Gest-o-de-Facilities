-- Additional pass for relinking tasks
DO $$
DECLARE
  v_relinked_audit_tasks integer := 0;
  v_relinked_nc_tasks integer := 0;
BEGIN
  -- 1. Religar tasks de Auditoria pelo título da tarefa com o título da auditoria e plant_id
  WITH audit_matches AS (
    SELECT DISTINCT ON (t.id)
      t.id AS task_id,
      a.id AS matched_audit_id
    FROM public.tasks t
    JOIN public.audits a ON a.client_id = t.client_id
    WHERE t.title ILIKE 'Auditoria:%'
      AND t.audit_id IS NULL
      AND (
        lower(trim(substring(t.title from 'Auditoria:\s*(.*)'))) = lower(trim(a.title))
        OR lower(trim(a.title)) ILIKE '%' || lower(trim(substring(t.title from 'Auditoria:\s*(.*)'))) || '%'
        OR lower(trim(substring(t.title from 'Auditoria:\s*(.*)'))) ILIKE '%' || lower(trim(a.title)) || '%'
      )
    ORDER BY t.id, a.created_at DESC
  )
  UPDATE public.tasks t
  SET audit_id = am.matched_audit_id
  FROM audit_matches am
  WHERE t.id = am.task_id
    AND t.audit_id IS NULL;

  -- 2. Religar tasks de Não Conformidade pela descrição da tarefa
  -- A descrição contém "Por favor, atue sobre a Não Conformidade identificada na auditoria "<nome da auditoria>""
  WITH nc_desc_matches AS (
    SELECT DISTINCT ON (t.id)
      t.id AS task_id,
      a.id AS matched_audit_id
    FROM public.tasks t
    JOIN public.audits a ON a.client_id = t.client_id
    WHERE t.title ILIKE 'Não Conformidade:%'
      AND t.audit_id IS NULL
      AND t.description ILIKE '%' || a.title || '%'
    ORDER BY t.id, a.created_at DESC
  )
  UPDATE public.tasks t
  SET audit_id = ndm.matched_audit_id
  FROM nc_desc_matches ndm
  WHERE t.id = ndm.task_id
    AND t.audit_id IS NULL;

  -- 3. Vincular task_id em audit_executions onde task_id estiver nulo ou apontar para task que não tem audit_id
  UPDATE public.audit_executions ae
  SET task_id = t.id
  FROM public.tasks t
  WHERE ae.task_id IS NULL
    AND t.audit_id = ae.audit_id
    AND t.plant_id = ae.plant_id
    AND t.title ILIKE 'Auditoria:%'
    AND NOT EXISTS (
      SELECT 1 FROM public.audit_executions ae2 WHERE ae2.task_id = t.id
    );

END $$;
