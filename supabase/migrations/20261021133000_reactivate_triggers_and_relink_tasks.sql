-- Reativar triggers desativados das tabelas de auditoria
ALTER TABLE public.audits ENABLE TRIGGER tr_generate_initial_executions;
ALTER TABLE public.audit_assignments ENABLE TRIGGER tr_handle_audit_assignment_inserted;
ALTER TABLE public.audit_assignments ENABLE TRIGGER tr_generate_initial_executions;
ALTER TABLE public.audit_assignments ENABLE TRIGGER on_audit_assignment_created;
ALTER TABLE public.audit_assignments ENABLE TRIGGER on_audit_assignment_inserted;
ALTER TABLE public.audit_executions ENABLE TRIGGER on_audit_execution_finalized;
ALTER TABLE public.audit_executions ENABLE TRIGGER trigger_calculate_audit_execution_score;
ALTER TABLE public.audit_executions ENABLE TRIGGER ensure_task_audit_id_trigger;
ALTER TABLE public.audit_actions ENABLE TRIGGER ensure_audit_action_id;

-- Religar audit_id nas tarefas de auditoria baseadas em audit_executions.task_id
DO $$
DECLARE
  v_relinked_audit_tasks integer := 0;
  v_relinked_nc_tasks integer := 0;
BEGIN
  -- 1. Religar tasks que estão apontadas diretamente por audit_executions.task_id
  UPDATE public.tasks t
  SET audit_id = ae.audit_id
  FROM public.audit_executions ae
  WHERE ae.task_id = t.id
    AND (t.audit_id IS NULL OR t.audit_id != ae.audit_id);
  GET DIAGNOSTICS v_relinked_audit_tasks = ROW_COUNT;

  -- 2. Religar tarefas de Não Conformidade ("Não Conformidade: %")
  -- Casar o título da NC com a pergunta da ação e planta/data da execução
  WITH nc_matches AS (
    SELECT DISTINCT ON (t.id)
      t.id AS task_id,
      ae.audit_id
    FROM public.tasks t
    JOIN public.audit_executions ae ON ae.plant_id = t.plant_id
    JOIN public.audit_execution_answers aea ON aea.execution_id = ae.id
    JOIN public.audit_actions aa ON aa.id = aea.action_id
    WHERE t.title ILIKE 'Não Conformidade:%'
      AND (
        lower(trim(substring(t.title from 'Não Conformidade:\s*(.*)'))) = lower(trim(aa.title))
        OR (
          length(aa.title) > 10 AND
          lower(trim(substring(t.title from 'Não Conformidade:\s*(.*)'))) ILIKE '%' || lower(trim(substring(aa.title from 1 for 30))) || '%'
        )
      )
      AND (
        (ae.realization_date IS NOT NULL AND abs(t.created_at::date - ae.realization_date) <= 3)
        OR (abs(t.created_at::date - ae.created_at::date) <= 3)
      )
    ORDER BY t.id, ae.created_at DESC
  )
  UPDATE public.tasks t
  SET audit_id = nm.audit_id
  FROM nc_matches nm
  WHERE t.id = nm.task_id
    AND t.audit_id IS NULL;
  GET DIAGNOSTICS v_relinked_nc_tasks = ROW_COUNT;

  RAISE NOTICE 'Relinked audit tasks: %, Relinked NC tasks: %', v_relinked_audit_tasks, v_relinked_nc_tasks;
END $$;
