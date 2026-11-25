-- Migration: Anexo em Solicitações de Horas Extras
-- Totalmente ADITIVA (sem DELETE/DROP/UPDATE em massa), seguindo regra permanente do projeto.
--
-- Objetivo:
--  1) Referência do anexo (bucket privado do Supabase Storage) na tabela horas_extras_solicitacoes;
--  2) Bucket PRIVADO 'he-solicitacoes-attachments' (sem acesso anônimo) com policies por empresa:
--     o usuário só acessa anexos de solicitações que a policy de SELECT de horas_extras_solicitacoes
--     já deixa ver (mesma expressão usada em he_solicitacoes_select).

-- ============================================================
-- 1. Colunas de anexo (aditivas, idempotentes, NULLABLE)
-- ============================================================
ALTER TABLE public.horas_extras_solicitacoes
  ADD COLUMN IF NOT EXISTS attachment_bucket text;

ALTER TABLE public.horas_extras_solicitacoes
  ADD COLUMN IF NOT EXISTS attachment_path text;

ALTER TABLE public.horas_extras_solicitacoes
  ADD COLUMN IF NOT EXISTS attachment_name text;

ALTER TABLE public.horas_extras_solicitacoes
  ADD COLUMN IF NOT EXISTS attachment_size bigint;

ALTER TABLE public.horas_extras_solicitacoes
  ADD COLUMN IF NOT EXISTS attachment_content_type text;

COMMENT ON COLUMN public.horas_extras_solicitacoes.attachment_bucket IS
  'Bucket privado do Supabase Storage que guarda o anexo da solicitação (NULL = sem anexo).';
COMMENT ON COLUMN public.horas_extras_solicitacoes.attachment_path IS
  'Caminho do objeto dentro do bucket de anexos de HE.';

-- ============================================================
-- 2. Bucket PRIVADO de anexos de HE
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'he-solicitacoes-attachments',
  'he-solicitacoes-attachments',
  false, -- PRIVADO: sem acesso anônimo; download somente via Signed URL autenticada
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'message/rfc822',                  -- .eml
    'application/vnd.ms-outlook',      -- .msg
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 10485760,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 3. Policies do bucket privado — espelham a visibilidade de he_solicitacoes_select:
--    Master, ou mesmo client_id sendo Administrador, ou mesmo client_id com planta autorizada.
--    O caminho do objeto é '<client_id>/<solicitacao_id>/<uuid>-<arquivo>',
--    então o client_id da solicitação é recuperável a partir do caminho.
-- ============================================================

-- SELECT (leitura / criação de Signed URL): quem pode ver a solicitação pode baixar o anexo
CREATE POLICY "he_anexos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'he-solicitacoes-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.horas_extras_solicitacoes he
      WHERE he.attachment_bucket = 'he-solicitacoes-attachments'
        AND he.attachment_path = storage.objects.name
        AND (
          public.get_user_role() = 'Master'
          OR (
            he.client_id = public.get_user_client_id()
            AND (
              public.get_user_role() = 'Administrador'
              OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND (
                    p.authorized_plants IS NULL
                    OR p.authorized_plants = '[]'::jsonb
                    OR p.authorized_plants ? (he.plant_id)::text
                  )
              )
            )
          )
        )
    )
  );

-- INSERT (upload): mesmo cliente; planta autorizada para usuários operacionais
CREATE POLICY "he_anexos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'he-solicitacoes-attachments'
    AND (
      public.get_user_role() = 'Master'
      OR (
        (storage.objects.name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/')
        AND (
          public.get_user_role() = 'Administrador'
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.client_id = (split_part(storage.objects.name, '/', 1))::uuid
              AND (
                p.authorized_plants IS NULL
                OR p.authorized_plants = '[]'::jsonb
              )
          )
        )
      )
    )
  );

-- DELETE: remove o objeto quando a solicitação de HE é excluída (service_role) ou
-- por Master/Admin do mesmo cliente (exclusão manual pelo painel Admin)
CREATE POLICY "he_anexos_delete"
  ON storage.objects FOR DELETE
  TO authenticated, service_role
  USING (
    bucket_id = 'he-solicitacoes-attachments'
    AND (
      (SELECT auth.role()) = 'service_role'
      OR public.get_user_role() = 'Master'
      OR (
        public.get_user_role() = 'Administrador'
        AND EXISTS (
          SELECT 1 FROM public.horas_extras_solicitacoes he
          WHERE he.attachment_path = storage.objects.name
            AND he.client_id = public.get_user_client_id()
        )
      )
    )
  );
