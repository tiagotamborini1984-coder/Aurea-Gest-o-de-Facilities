DO $$ 
BEGIN
  -- Add sla_days to task_statuses for SLA by status feature
  ALTER TABLE public.task_statuses ADD COLUMN IF NOT EXISTS sla_days NUMERIC NOT NULL DEFAULT 1;
END $$;
