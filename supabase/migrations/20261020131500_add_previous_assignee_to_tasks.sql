-- Migration: Add previous_assignee_id to tasks and support approval handoff
DO $$
BEGIN
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS previous_assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
END $$;
