-- Add participants_ids array column to tasks table to support multiple participants
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS participants_ids UUID[] DEFAULT '{}'::UUID[];

-- Add a comment explaining the column
COMMENT ON COLUMN public.tasks.participants_ids IS 'Array of User UUIDs who are participating in the task, but are neither the assignee nor the requester.';
