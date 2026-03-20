ALTER TABLE public.task_statuses ADD COLUMN IF NOT EXISTS return_to_requester BOOLEAN NOT NULL DEFAULT false;

DROP TRIGGER IF EXISTS on_task_status_change ON public.tasks;

CREATE OR REPLACE FUNCTION public.handle_task_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status_freeze BOOLEAN;
  v_new_status_return BOOLEAN;
BEGIN
  -- If status changes
  IF NEW.status_id <> OLD.status_id THEN
    -- Check if the old status was flagged to freeze SLA
    SELECT freeze_sla INTO v_old_status_freeze FROM public.task_statuses WHERE id = OLD.status_id;
    
    IF v_old_status_freeze THEN
      -- Accumulate the frozen time spent in the old status
      NEW.frozen_time_minutes := OLD.frozen_time_minutes + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(OLD.status_updated_at, OLD.created_at)))/60);
    END IF;
    
    -- Reset the timer start for the new status
    NEW.status_updated_at := NOW();

    -- Check if new status returns to requester
    SELECT return_to_requester INTO v_new_status_return FROM public.task_statuses WHERE id = NEW.status_id;
    IF v_new_status_return THEN
      NEW.assignee_id := NEW.requester_id;
    END IF;

  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_status_change
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.handle_task_status_change();
