-- Function to log generic audit actions securely
CREATE OR REPLACE FUNCTION public.log_audit_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_client_id uuid;
  v_action text;
  v_details text;
BEGIN
  -- Attempt to get the user ID making the request
  v_user_id := auth.uid();
  
  -- Gather details based on operation
  IF TG_OP = 'DELETE' THEN
    v_client_id := OLD.client_id;
    v_details := 'Registro removido da tabela ' || TG_TABLE_NAME || ' (ID: ' || OLD.id || ')';
    v_action := 'Exclusão';
  ELSIF TG_OP = 'INSERT' THEN
    v_client_id := NEW.client_id;
    v_details := 'Novo registro adicionado na tabela ' || TG_TABLE_NAME || ' (ID: ' || NEW.id || ')';
    v_action := 'Inclusão';
  ELSIF TG_OP = 'UPDATE' THEN
    v_client_id := NEW.client_id;
    v_details := 'Registro atualizado na tabela ' || TG_TABLE_NAME || ' (ID: ' || NEW.id || ')';
    v_action := 'Atualização';
  END IF;

  -- Only insert if we have context (user ID and client ID)
  IF v_user_id IS NOT NULL AND v_client_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (client_id, user_id, action_type, details)
    VALUES (v_client_id, v_user_id, v_action, v_details);
  END IF;

  -- Return appropriately
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Apply triggers for Cadastros
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

-- Apply trigger for Lancamentos
DROP TRIGGER IF EXISTS audit_daily_logs ON public.daily_logs;
CREATE TRIGGER audit_daily_logs AFTER INSERT OR UPDATE OR DELETE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

