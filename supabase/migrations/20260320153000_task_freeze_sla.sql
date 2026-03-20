DO $
BEGIN
  -- Add freeze_sla to task_statuses
  ALTER TABLE public.task_statuses ADD COLUMN IF NOT EXISTS freeze_sla BOOLEAN NOT NULL DEFAULT false;
  
  -- Add tracking columns for frozen SLA logic in tasks
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS frozen_time_minutes INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  -- Backfill status_updated_at for any existing rows where it might be null
  UPDATE public.tasks SET status_updated_at = created_at WHERE status_updated_at IS NULL OR status_updated_at > NOW();
END $;

-- Create or replace trigger function to handle SLA pausing automatically
CREATE OR REPLACE FUNCTION public.handle_task_status_change()
RETURNS trigger AS $
DECLARE
  v_old_status_freeze BOOLEAN;
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
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_status_change ON public.tasks;

CREATE TRIGGER on_task_status_change
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_status_change();
