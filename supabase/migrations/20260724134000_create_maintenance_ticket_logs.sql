CREATE TABLE IF NOT EXISTS public.maintenance_ticket_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.maintenance_ticket_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_logs_ticket_id ON public.maintenance_ticket_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_logs_created_at ON public.maintenance_ticket_logs(created_at);

DROP POLICY IF EXISTS "tenant_isolation_maintenance_ticket_logs_select" ON public.maintenance_ticket_logs;
CREATE POLICY "tenant_isolation_maintenance_ticket_logs_select" ON public.maintenance_ticket_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_tickets t
      WHERE t.id = maintenance_ticket_logs.ticket_id
      AND (get_user_role() = 'Master' OR t.client_id = get_user_client_id())
    )
  );

DROP POLICY IF EXISTS "tenant_isolation_maintenance_ticket_logs_insert" ON public.maintenance_ticket_logs;
CREATE POLICY "tenant_isolation_maintenance_ticket_logs_insert" ON public.maintenance_ticket_logs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_tickets t
      WHERE t.id = maintenance_ticket_logs.ticket_id
      AND (get_user_role() = 'Master' OR t.client_id = get_user_client_id())
    )
  );

DROP POLICY IF EXISTS "tenant_isolation_maintenance_ticket_logs_update" ON public.maintenance_ticket_logs;
CREATE POLICY "tenant_isolation_maintenance_ticket_logs_update" ON public.maintenance_ticket_logs
  FOR UPDATE TO authenticated USING (
    get_user_role() IN ('Master', 'Admin', 'Administrador')
  ) WITH CHECK (
    get_user_role() IN ('Master', 'Admin', 'Administrador')
  );

DROP POLICY IF EXISTS "tenant_isolation_maintenance_ticket_logs_delete" ON public.maintenance_ticket_logs;
CREATE POLICY "tenant_isolation_maintenance_ticket_logs_delete" ON public.maintenance_ticket_logs
  FOR DELETE TO authenticated USING (
    get_user_role() IN ('Master', 'Admin', 'Administrador')
  );

CREATE OR REPLACE FUNCTION public.log_maintenance_ticket_changes()
RETURNS trigger AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_old_status_name TEXT;
  v_new_status_name TEXT;
  v_old_assignee_name TEXT;
  v_new_assignee_name TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, new_value)
    VALUES (NEW.id, v_user_id, 'Abertura', NEW.ticket_number);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
      SELECT name INTO v_old_status_name FROM public.maintenance_statuses WHERE id = OLD.status_id;
      SELECT name INTO v_new_status_name FROM public.maintenance_statuses WHERE id = NEW.status_id;
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'Alteração de Status', COALESCE(v_old_status_name, 'N/A'), COALESCE(v_new_status_name, 'N/A'));
    END IF;

    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      SELECT name INTO v_old_assignee_name FROM public.profiles WHERE id = OLD.assignee_id;
      SELECT name INTO v_new_assignee_name FROM public.profiles WHERE id = NEW.assignee_id;
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'Alteração de Executor', COALESCE(v_old_assignee_name, 'Não atribuído'), COALESCE(v_new_assignee_name, 'Não atribuído'));
    END IF;

    IF OLD.planned_start IS DISTINCT FROM NEW.planned_start THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'Planejamento - Início', OLD.planned_start::text, NEW.planned_start::text);
    END IF;

    IF OLD.planned_end IS DISTINCT FROM NEW.planned_end THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'Planejamento - Fim', OLD.planned_end::text, NEW.planned_end::text);
    END IF;

    IF OLD.actual_start IS DISTINCT FROM NEW.actual_start THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'Início de Atendimento', OLD.actual_start::text, NEW.actual_start::text);
    END IF;

    IF OLD.actual_end IS DISTINCT FROM NEW.actual_end THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'Finalização', OLD.actual_end::text, NEW.actual_end::text);
    END IF;

    IF OLD.closure_notes IS DISTINCT FROM NEW.closure_notes THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'Notas de Fechamento', OLD.closure_notes, NEW.closure_notes);
    END IF;

    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_maintenance_ticket_changes ON public.maintenance_tickets;
CREATE TRIGGER trigger_log_maintenance_ticket_changes
  AFTER INSERT OR UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_maintenance_ticket_changes();

CREATE OR REPLACE FUNCTION public.prevent_non_admin_edit_finalized()
RETURNS trigger AS $$
DECLARE
  v_role TEXT := get_user_role();
  v_is_terminal BOOLEAN;
BEGIN
  IF v_role IN ('Master', 'Admin', 'Administrador') THEN
    RETURN NEW;
  END IF;

  SELECT is_terminal INTO v_is_terminal
  FROM public.maintenance_statuses
  WHERE id = OLD.status_id;

  IF v_is_terminal THEN
    RAISE EXCEPTION 'Chamado finalizado nao pode ser editado por usuarios nao administradores';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_non_admin_edit_finalized ON public.maintenance_tickets;
CREATE TRIGGER trigger_prevent_non_admin_edit_finalized
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_edit_finalized();
