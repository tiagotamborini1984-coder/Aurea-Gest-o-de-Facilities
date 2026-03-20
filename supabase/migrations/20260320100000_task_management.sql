-- Create Task Types Table
CREATE TABLE IF NOT EXISTS public.task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sla_hours NUMERIC NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Task Statuses Table
CREATE TABLE IF NOT EXISTS public.task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES public.task_types(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES public.task_statuses(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_number TEXT NOT NULL,
  description TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  UNIQUE(client_id, task_number)
);

-- Create Task Timeline Table
CREATE TABLE IF NOT EXISTS public.task_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'comment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select_tt" ON public.task_types;
CREATE POLICY "authenticated_select_tt" ON public.task_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_tt" ON public.task_types;
CREATE POLICY "authenticated_insert_tt" ON public.task_types FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_update_tt" ON public.task_types;
CREATE POLICY "authenticated_update_tt" ON public.task_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_tt" ON public.task_types;
CREATE POLICY "authenticated_delete_tt" ON public.task_types FOR DELETE TO authenticated USING (true);

ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select_ts" ON public.task_statuses;
CREATE POLICY "authenticated_select_ts" ON public.task_statuses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_ts" ON public.task_statuses;
CREATE POLICY "authenticated_insert_ts" ON public.task_statuses FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_update_ts" ON public.task_statuses;
CREATE POLICY "authenticated_update_ts" ON public.task_statuses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_ts" ON public.task_statuses;
CREATE POLICY "authenticated_delete_ts" ON public.task_statuses FOR DELETE TO authenticated USING (true);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select_t" ON public.tasks;
CREATE POLICY "authenticated_select_t" ON public.tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_t" ON public.tasks;
CREATE POLICY "authenticated_insert_t" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_update_t" ON public.tasks;
CREATE POLICY "authenticated_update_t" ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_t" ON public.tasks;
CREATE POLICY "authenticated_delete_t" ON public.tasks FOR DELETE TO authenticated USING (true);

ALTER TABLE public.task_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select_tl" ON public.task_timeline;
CREATE POLICY "authenticated_select_tl" ON public.task_timeline FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_tl" ON public.task_timeline;
CREATE POLICY "authenticated_insert_tl" ON public.task_timeline FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_tl" ON public.task_timeline;
CREATE POLICY "authenticated_delete_tl" ON public.task_timeline FOR DELETE TO authenticated USING (true);

-- Triggers for Audit Logging
DROP TRIGGER IF EXISTS audit_task_types ON public.task_types;
DROP TRIGGER IF EXISTS audit_task_statuses ON public.task_statuses;
DROP TRIGGER IF EXISTS audit_tasks ON public.tasks;

CREATE TRIGGER audit_task_types AFTER INSERT OR DELETE OR UPDATE ON public.task_types FOR EACH ROW EXECUTE FUNCTION log_audit_action();
CREATE TRIGGER audit_task_statuses AFTER INSERT OR DELETE OR UPDATE ON public.task_statuses FOR EACH ROW EXECUTE FUNCTION log_audit_action();
CREATE TRIGGER audit_tasks AFTER INSERT OR DELETE OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- Setup Storage for Attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-attachments', 'task-attachments', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "tasks_public_access" ON storage.objects;
DROP POLICY IF EXISTS "tasks_auth_insert" ON storage.objects;

CREATE POLICY "tasks_public_access" ON storage.objects FOR SELECT USING (bucket_id = 'task-attachments');
CREATE POLICY "tasks_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-attachments');
