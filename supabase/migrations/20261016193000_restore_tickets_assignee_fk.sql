-- Migration: Restore maintenance_tickets_assignee_id_fkey so PostgREST embeds continue to work
-- and add foreign key or keep maintenance_preventive_plans unconstrained or constrained.

ALTER TABLE public.maintenance_tickets
  DROP CONSTRAINT IF EXISTS maintenance_tickets_assignee_id_fkey;

ALTER TABLE public.maintenance_tickets
  ADD CONSTRAINT maintenance_tickets_assignee_id_fkey
  FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
