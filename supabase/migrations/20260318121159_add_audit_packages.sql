-- Add audit trigger for packages table
DROP TRIGGER IF EXISTS audit_packages ON public.packages;
CREATE TRIGGER audit_packages 
AFTER INSERT OR UPDATE OR DELETE ON public.packages 
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
