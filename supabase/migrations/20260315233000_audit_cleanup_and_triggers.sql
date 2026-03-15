-- Strictly enforce 2 months retention for audit logs
CREATE OR REPLACE FUNCTION public.clean_old_audit_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '2 months';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_clean_audit_logs ON public.audit_logs;
CREATE TRIGGER trigger_clean_audit_logs
  AFTER INSERT ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.clean_old_audit_logs();

-- Audit triggers constrained to INSERT and DELETE (Inclusão e Exclusão)
DROP TRIGGER IF EXISTS audit_plants ON public.plants;
CREATE TRIGGER audit_plants AFTER INSERT OR DELETE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS audit_locations ON public.locations;
CREATE TRIGGER audit_locations AFTER INSERT OR DELETE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS audit_functions ON public.functions;
CREATE TRIGGER audit_functions AFTER INSERT OR DELETE ON public.functions FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS audit_employees ON public.employees;
CREATE TRIGGER audit_employees AFTER INSERT OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS audit_equipment ON public.equipment;
CREATE TRIGGER audit_equipment AFTER INSERT OR DELETE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS audit_daily_logs ON public.daily_logs;
CREATE TRIGGER audit_daily_logs AFTER INSERT OR DELETE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
