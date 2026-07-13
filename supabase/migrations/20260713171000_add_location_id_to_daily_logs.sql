-- Add location_id to daily_logs for historical location snapshot
-- This captures the collaborator's location at the moment attendance is logged,
-- preventing historical data from being retroactively altered when reassigned.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'daily_logs'
        AND column_name = 'location_id'
    ) THEN
        ALTER TABLE public.daily_logs
        ADD COLUMN location_id UUID REFERENCES public.locations(id);
    END IF;
END $$;

-- Existing RLS policies on daily_logs already cover all columns at the row level
-- (SELECT, INSERT, UPDATE, DELETE for authenticated users), so the new location_id
-- column is automatically protected by the same policies. No additional policy changes needed.

-- Backfill location_id for existing staff logs from the employees table
-- This is best-effort: only updates rows where location_id is NULL and the employee still exists
DO $$
BEGIN
    UPDATE public.daily_logs
    SET location_id = sub.location_id
    FROM (
        SELECT e.id AS employee_id, e.location_id
        FROM public.employees e
        WHERE e.location_id IS NOT NULL
    ) AS sub
    WHERE daily_logs.type = 'staff'
      AND daily_logs.location_id IS NULL
      AND daily_logs.reference_id = sub.employee_id;
END $$;
