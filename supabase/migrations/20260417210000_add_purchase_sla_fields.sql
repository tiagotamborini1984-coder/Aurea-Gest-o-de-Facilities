ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS rc_created_date TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS po_generated_date TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.handle_task_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_old_status_freeze BOOLEAN;
  v_old_status_ignore BOOLEAN;
  v_new_status_return BOOLEAN;
  v_new_status_name TEXT;
BEGIN
  -- If status changes
  IF NEW.status_id <> OLD.status_id THEN
    -- Check if the old status was flagged to freeze SLA or ignore SLA
    SELECT freeze_sla, ignore_sla INTO v_old_status_freeze, v_old_status_ignore FROM public.task_statuses WHERE id = OLD.status_id;
    
    IF v_old_status_freeze OR v_old_status_ignore THEN
      -- Accumulate the frozen time spent in the old status
      NEW.frozen_time_minutes := OLD.frozen_time_minutes + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(OLD.status_updated_at, OLD.created_at)))/60);
    END IF;
    
    -- Reset the timer start for the new status
    NEW.status_updated_at := NOW();

    -- Check if new status returns to requester
    SELECT return_to_requester, name INTO v_new_status_return, v_new_status_name FROM public.task_statuses WHERE id = NEW.status_id;
    IF v_new_status_return THEN
      NEW.assignee_id := NEW.requester_id;
    END IF;

    -- Capture RC created date if status implies it
    IF v_new_status_name ILIKE '%requisição criada%' OR v_new_status_name ILIKE '%requisicao criada%' OR v_new_status_name ILIKE '%rc criada%' THEN
      IF NEW.rc_created_date IS NULL THEN
        NEW.rc_created_date := NOW();
      END IF;
    END IF;

  END IF;
  
  RETURN NEW;
END;
$function$;
