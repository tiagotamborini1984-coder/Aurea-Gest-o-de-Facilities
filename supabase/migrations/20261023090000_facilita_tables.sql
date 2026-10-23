-- Facilita — robô tira-dúvidas Facilities (Aurea)
-- Tabelas: documentos (POPs) + chunks indexados + conversas/mensagens do chat

-- ============ DOCUMENTOS (POPs) ============
CREATE TABLE IF NOT EXISTS public.facilita_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'POP',
  revision TEXT,
  file_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','analyzing','indexed','failed')),
  status_message TEXT,
  indexed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS facilita_documents_client_idx ON public.facilita_documents(client_id);

-- ============ CHUNKS (trechos indexados para busca) ============
CREATE TABLE IF NOT EXISTS public.facilita_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.facilita_documents(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS facilita_chunks_document_idx ON public.facilita_chunks(document_id);
CREATE INDEX IF NOT EXISTS facilita_chunks_client_idx ON public.facilita_chunks(client_id);

-- ============ CONVERSAS DO CHAT ============
CREATE TABLE IF NOT EXISTS public.facilita_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS facilita_conversations_client_idx ON public.facilita_conversations(client_id);

CREATE TABLE IF NOT EXISTS public.facilita_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.facilita_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','processing','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS facilita_messages_conversation_idx ON public.facilita_messages(conversation_id);

-- ============ RLS ============
ALTER TABLE public.facilita_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilita_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilita_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilita_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_facilita_documents" ON public.facilita_documents;
CREATE POLICY "tenant_isolation_facilita_documents" ON public.facilita_documents
  FOR ALL TO authenticated
  USING ((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id()))
  WITH CHECK ((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id()));

DROP POLICY IF EXISTS "tenant_isolation_facilita_chunks" ON public.facilita_chunks;
CREATE POLICY "tenant_isolation_facilita_chunks" ON public.facilita_chunks
  FOR ALL TO authenticated
  USING ((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id()))
  WITH CHECK ((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id()));

DROP POLICY IF EXISTS "tenant_isolation_facilita_conversations" ON public.facilita_conversations;
CREATE POLICY "tenant_isolation_facilita_conversations" ON public.facilita_conversations
  FOR ALL TO authenticated
  USING ((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id()) OR (user_id = auth.uid()))
  WITH CHECK ((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id()) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "tenant_isolation_facilita_messages" ON public.facilita_messages;
CREATE POLICY "tenant_isolation_facilita_messages" ON public.facilita_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facilita_conversations c
      WHERE c.id = conversation_id
        AND ((public.get_user_role() = 'Master') OR (c.client_id = public.get_user_client_id()) OR (c.user_id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.facilita_conversations c
      WHERE c.id = conversation_id
        AND ((public.get_user_role() = 'Master') OR (c.client_id = public.get_user_client_id()) OR (c.user_id = auth.uid()))
    )
  );

-- ============ BUSCA FULL-TEXT nos chunks ============
CREATE INDEX IF NOT EXISTS facilita_chunks_fts_idx ON public.facilita_chunks
  USING gin (to_tsvector('portuguese', content));

-- updated_at automático
CREATE OR REPLACE FUNCTION public.facilita_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS facilita_documents_touch ON public.facilita_documents;
CREATE TRIGGER facilita_documents_touch
  BEFORE UPDATE ON public.facilita_documents
  FOR EACH ROW EXECUTE FUNCTION public.facilita_touch_updated_at();

DROP TRIGGER IF EXISTS facilita_conversations_touch ON public.facilita_conversations;
CREATE TRIGGER facilita_conversations_touch
  BEFORE UPDATE ON public.facilita_conversations
  FOR EACH ROW EXECUTE FUNCTION public.facilita_touch_updated_at();