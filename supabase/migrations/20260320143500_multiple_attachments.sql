-- Add attachment_urls JSONB column to support multiple files
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachment_urls JSONB DEFAULT '[]'::jsonb;

-- Ensure storage bucket is fully configured for multiple attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments', 
  'task-attachments', 
  true, 
  52428800, -- 50MB
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/jpg', 
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure storage policies exist and are correct
DROP POLICY IF EXISTS "tasks_public_access" ON storage.objects;
DROP POLICY IF EXISTS "tasks_auth_insert" ON storage.objects;

CREATE POLICY "tasks_public_access" ON storage.objects 
  FOR SELECT USING (bucket_id = 'task-attachments');

CREATE POLICY "tasks_auth_insert" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-attachments');
