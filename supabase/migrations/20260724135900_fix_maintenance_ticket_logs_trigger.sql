CREATE OR REPLACE FUNCTION public.log_maintenance_ticket_changes()
RETURNS trigger AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_old_status_name TEXT;
  v_new_status_name TEXT;
  v_old_assignee_name TEXT;
  v_new_assignee_name TEXT;
  v_old_priority_name TEXT;
  v_new_priority_name TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'ticket_created', NULL, COALESCE(NEW.ticket_number, NEW.id::text));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
      SELECT name INTO v_old_status_name FROM public.maintenance_statuses WHERE id = OLD.status_id;
      SELECT name INTO v_new_status_name FROM public.maintenance_statuses WHERE id = NEW.status_id;
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'status_changed',
        COALESCE(v_old_status_name, COALESCE(OLD.status_id::text, 'null')),
        COALESCE(v_new_status_name, COALESCE(NEW.status_id::text, 'null')));
    END IF;

    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      SELECT name INTO v_old_assignee_name FROM public.profiles WHERE id = OLD.assignee_id;
      SELECT name INTO v_new_assignee_name FROM public.profiles WHERE id = NEW.assignee_id;
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'field_updated',
        'assignee_id: ' || COALESCE(v_old_assignee_name, 'null'),
        'assignee_id: ' || COALESCE(v_new_assignee_name, 'null'));
    END IF;

    IF OLD.priority_id IS DISTINCT FROM NEW.priority_id THEN
      SELECT name INTO v_old_priority_name FROM public.maintenance_priorities WHERE id = OLD.priority_id;
      SELECT name INTO v_new_priority_name FROM public.maintenance_priorities WHERE id = NEW.priority_id;
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'field_updated',
        'priority_id: ' || COALESCE(v_old_priority_name, COALESCE(OLD.priority_id::text, 'null')),
        'priority_id: ' || COALESCE(v_new_priority_name, COALESCE(NEW.priority_id::text, 'null')));
    END IF;

    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'field_updated',
        'description: ' || COALESCE(OLD.description, 'null'),
        'description: ' || COALESCE(NEW.description, 'null'));
    END IF;

    IF OLD.planned_start IS DISTINCT FROM NEW.planned_start THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'field_updated',
        'planned_start: ' || COALESCE(OLD.planned_start::text, 'null'),
        'planned_start: ' || COALESCE(NEW.planned_start::text, 'null'));
    END IF;

    IF OLD.planned_end IS DISTINCT FROM NEW.planned_end THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'field_updated',
        'planned_end: ' || COALESCE(OLD.planned_end::text, 'null'),
        'planned_end: ' || COALESCE(NEW.planned_end::text, 'null'));
    END IF;

    IF OLD.actual_start IS DISTINCT FROM NEW.actual_start THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'field_updated',
        'actual_start: ' || COALESCE(OLD.actual_start::text, 'null'),
        'actual_start: ' || COALESCE(NEW.actual_start::text, 'null'));
    END IF;

    IF OLD.actual_end IS DISTINCT FROM NEW.actual_end THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'field_updated',
        'actual_end: ' || COALESCE(OLD.actual_end::text, 'null'),
        'actual_end: ' || COALESCE(NEW.actual_end::text, 'null'));
    END IF;

    IF OLD.closure_notes IS DISTINCT FROM NEW.closure_notes THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'field_updated',
        'closure_notes: ' || COALESCE(OLD.closure_notes, 'null'),
        'closure_notes: ' || COALESCE(NEW.closure_notes, 'null'));
    END IF;

    IF OLD.closure_photos IS DISTINCT FROM NEW.closure_photos THEN
      INSERT INTO public.maintenance_ticket_logs (ticket_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'field_updated',
        'closure_photos: ' || COALESCE(OLD.closure_photos::text, 'null'),
        'closure_photos: ' || COALESCE(NEW.closure_photos::text, 'null'));
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
