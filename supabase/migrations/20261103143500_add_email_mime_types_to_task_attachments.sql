-- Adicionar suporte abrangente para e-mails (.eml, .msg) e documentos comuns no bucket task-attachments
-- Esta migration é aditiva e não-destrutiva, preservando todas as permissões e tipos existentes.
DO $$
DECLARE
  v_new_types text[] := ARRAY[
    -- Imagens
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    -- PDFs
    'application/pdf',
    -- Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    -- PowerPoint
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- Texto / CSV / XML
    'text/plain',
    'text/csv',
    'text/html',
    'text/xml',
    'application/xml',
    'application/json',
    'application/rtf',
    -- Emails (.eml, .msg)
    'message/rfc822',
    'application/vnd.ms-outlook',
    'application/x-msg',
    'application/msg',
    -- Compactados
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    -- Genérico / binário (frequentemente atribuído por navegadores Windows/macOS a arquivos .eml e .msg)
    'application/octet-stream'
  ];
  v_mime text;
BEGIN
  -- Garante que o bucket existe
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('task-attachments', 'task-attachments', true, 52428800, v_new_types)
  ON CONFLICT (id) DO UPDATE
  SET 
    public = true,
    file_size_limit = GREATEST(COALESCE(storage.buckets.file_size_limit, 52428800), 52428800);

  -- Realiza o append seguro e idempotente de cada tipo que porventura não esteja no bucket
  FOREACH v_mime IN ARRAY v_new_types LOOP
    UPDATE storage.buckets
    SET allowed_mime_types = array_append(allowed_mime_types, v_mime)
    WHERE id = 'task-attachments'
      AND allowed_mime_types IS NOT NULL
      AND NOT (v_mime = ANY(allowed_mime_types));
  END LOOP;

  -- Garante que as policies de SELECT público e INSERT autenticado estão presentes
  DROP POLICY IF EXISTS "tasks_public_access" ON storage.objects;
  DROP POLICY IF EXISTS "tasks_auth_insert" ON storage.objects;

  CREATE POLICY "tasks_public_access" ON storage.objects 
    FOR SELECT USING (bucket_id = 'task-attachments');

  CREATE POLICY "tasks_auth_insert" ON storage.objects 
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-attachments');
END $$;
