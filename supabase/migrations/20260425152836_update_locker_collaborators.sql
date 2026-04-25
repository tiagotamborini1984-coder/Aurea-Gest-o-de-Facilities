ALTER TABLE public.locker_collaborators ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.locker_collaborators ADD COLUMN IF NOT EXISTS department text;
