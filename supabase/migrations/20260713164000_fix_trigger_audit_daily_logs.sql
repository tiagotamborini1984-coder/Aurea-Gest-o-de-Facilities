-- Fix: trigger_audit_daily_logs() inserts audit_logs with a sentinel UUID
-- when auth.uid() is NULL. That UUID is not in auth.users, violating the
-- audit_logs_user_id_fkey FK. Skip the audit insert when there is no session.

CREATE OR REPLACE FUNCTION public.trigger_audit_daily_logs()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Only log when a real authenticated user exists
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.audit_logs (action_type, client_id, user_id, details)
  VALUES (
    TG_OP,
    COALESCE(NEW.client_id, OLD.client_id),
    v_user_id,
    'Daily Log ' || TG_OP || ' for reference ' || COALESCE(NEW.reference_id, OLD.reference_id) || ' on date ' || COALESCE(NEW.date, OLD.date)::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
