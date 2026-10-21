-- Desativar temporariamente triggers reativos das tabelas de auditoria
ALTER TABLE public.audits DISABLE TRIGGER tr_generate_initial_executions;
ALTER TABLE public.audit_assignments DISABLE TRIGGER tr_handle_audit_assignment_inserted;
ALTER TABLE public.audit_assignments DISABLE TRIGGER tr_generate_initial_executions;
ALTER TABLE public.audit_assignments DISABLE TRIGGER on_audit_assignment_created;
ALTER TABLE public.audit_assignments DISABLE TRIGGER on_audit_assignment_inserted;
ALTER TABLE public.audit_executions DISABLE TRIGGER on_audit_execution_finalized;
ALTER TABLE public.audit_executions DISABLE TRIGGER trigger_calculate_audit_execution_score;
ALTER TABLE public.audit_executions DISABLE TRIGGER ensure_task_audit_id_trigger;
ALTER TABLE public.audit_actions DISABLE TRIGGER ensure_audit_action_id;
