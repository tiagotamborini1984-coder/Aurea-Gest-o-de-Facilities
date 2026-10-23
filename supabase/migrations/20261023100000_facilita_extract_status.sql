-- Facilita: status de extração automática de dados do documento
-- draft = dados extraídos aguardando revisão do usuário
-- extracting = Maestro lendo o arquivo

ALTER TABLE public.facilita_documents DROP CONSTRAINT IF EXISTS facilita_documents_status_check;
ALTER TABLE public.facilita_documents ADD CONSTRAINT facilita_documents_status_check
  CHECK (status IN ('draft','extracting','pending','analyzing','indexed','failed'));