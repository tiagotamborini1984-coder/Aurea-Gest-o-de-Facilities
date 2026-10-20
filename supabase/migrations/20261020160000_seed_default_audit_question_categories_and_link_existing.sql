-- Migration: seed_default_audit_question_categories_and_link_existing
-- 1. Insere as categorias padrão sugeridas na proposta para todos os clientes existentes que ainda não as possuam
-- 2. Tenta inferir e vincular a categoria das perguntas existentes com base em prefixos conhecidos (DO, LOJA, RDC, COZINHA, BANHEIROS, etc.)

DO $$
DECLARE
  client_rec RECORD;
  limpeza_id UUID;
  organizacao_id UUID;
  seguranca_id UUID;
  estrutura_id UUID;
  processos_id UUID;
  treinamento_id UUID;
BEGIN
  -- Percorrer clientes existentes
  FOR client_rec IN SELECT id FROM public.clients LOOP
    -- Inserir categorias padrão idempotentemente (usando ON CONFLICT com base no índice único idx_audit_question_categories_client_name)
    INSERT INTO public.audit_question_categories (client_id, name, color, is_active)
    VALUES (client_rec.id, 'Limpeza e Higiene', '#10b981', true)
    ON CONFLICT (client_id, LOWER(TRIM(name))) DO NOTHING;

    INSERT INTO public.audit_question_categories (client_id, name, color, is_active)
    VALUES (client_rec.id, 'Organização e Armazenamento', '#f59e0b', true)
    ON CONFLICT (client_id, LOWER(TRIM(name))) DO NOTHING;

    INSERT INTO public.audit_question_categories (client_id, name, color, is_active)
    VALUES (client_rec.id, 'Segurança e EPIs', '#ef4444', true)
    ON CONFLICT (client_id, LOWER(TRIM(name))) DO NOTHING;

    INSERT INTO public.audit_question_categories (client_id, name, color, is_active)
    VALUES (client_rec.id, 'Estrutura e Conservação', '#3b82f6', true)
    ON CONFLICT (client_id, LOWER(TRIM(name))) DO NOTHING;

    INSERT INTO public.audit_question_categories (client_id, name, color, is_active)
    VALUES (client_rec.id, 'Processos e Documentação', '#8b5cf6', true)
    ON CONFLICT (client_id, LOWER(TRIM(name))) DO NOTHING;

    INSERT INTO public.audit_question_categories (client_id, name, color, is_active)
    VALUES (client_rec.id, 'Treinamento', '#06b6d4', true)
    ON CONFLICT (client_id, LOWER(TRIM(name))) DO NOTHING;

    -- Recuperar os IDs das categorias desse cliente
    SELECT id INTO limpeza_id FROM public.audit_question_categories 
    WHERE client_id = client_rec.id AND LOWER(TRIM(name)) = 'limpeza e higiene' LIMIT 1;

    SELECT id INTO organizacao_id FROM public.audit_question_categories 
    WHERE client_id = client_rec.id AND LOWER(TRIM(name)) = 'organização e armazenamento' LIMIT 1;

    SELECT id INTO seguranca_id FROM public.audit_question_categories 
    WHERE client_id = client_rec.id AND LOWER(TRIM(name)) = 'segurança e epis' LIMIT 1;

    SELECT id INTO estrutura_id FROM public.audit_question_categories 
    WHERE client_id = client_rec.id AND LOWER(TRIM(name)) = 'estrutura e conservação' LIMIT 1;

    SELECT id INTO processos_id FROM public.audit_question_categories 
    WHERE client_id = client_rec.id AND LOWER(TRIM(name)) = 'processos e documentação' LIMIT 1;

    SELECT id INTO treinamento_id FROM public.audit_question_categories 
    WHERE client_id = client_rec.id AND LOWER(TRIM(name)) = 'treinamento' LIMIT 1;

    -- Vincular perguntas existentes que ainda estejam sem categoria deste cliente
    -- 1. Processos e Documentação (prefixos: DO -, DOCUMENTAÇÃO -, RDC 216/04 ...)
    IF processos_id IS NOT NULL THEN
      UPDATE public.audit_actions aa
      SET category_id = processos_id
      FROM public.audits a
      WHERE aa.audit_id = a.id
        AND a.client_id = client_rec.id
        AND aa.category_id IS NULL
        AND (
          aa.title ILIKE 'DO - %'
          OR aa.title ILIKE 'DOCUMENTAÇÃO - %'
          OR aa.title ILIKE 'ADM - %'
          OR aa.title ILIKE 'RDC 216/04%'
          OR aa.title ILIKE 'POP - %'
        );
    END IF;

    -- 2. Limpeza e Higiene (prefixos ou menções: BANHEIROS -, LAVANDERIA -, HIGIENE, LIMPEZA)
    IF limpeza_id IS NOT NULL THEN
      UPDATE public.audit_actions aa
      SET category_id = limpeza_id
      FROM public.audits a
      WHERE aa.audit_id = a.id
        AND a.client_id = client_rec.id
        AND aa.category_id IS NULL
        AND (
          aa.title ILIKE 'BANHEIROS - %'
          OR aa.title ILIKE 'LAVANDERIA - %'
          OR aa.title ILIKE 'CONTAINER LIMP%'
          OR aa.title ILIKE '%HIGIEN%'
          OR aa.title ILIKE '%LIMPEZ%'
        );
    END IF;

    -- 3. Segurança e EPIs (prefixos ou menções: EPI, SEGURANÇA, EXTINTOR)
    IF seguranca_id IS NOT NULL THEN
      UPDATE public.audit_actions aa
      SET category_id = seguranca_id
      FROM public.audits a
      WHERE aa.audit_id = a.id
        AND a.client_id = client_rec.id
        AND aa.category_id IS NULL
        AND (
          aa.title ILIKE '%EPI%'
          OR aa.title ILIKE '%SEGURANÇA%'
          OR aa.title ILIKE '%EXTINTOR%'
          OR aa.title ILIKE '%PROTEÇÃO%'
        );
    END IF;

    -- 4. Organização e Armazenamento (prefixos: ALMOX -, DEPÓSITO %, TRIAGEM -, ARMAZENAMENTO)
    IF organizacao_id IS NOT NULL THEN
      UPDATE public.audit_actions aa
      SET category_id = organizacao_id
      FROM public.audits a
      WHERE aa.audit_id = a.id
        AND a.client_id = client_rec.id
        AND aa.category_id IS NULL
        AND (
          aa.title ILIKE 'ALMOX - %'
          OR aa.title ILIKE 'DEPÓSITO%'
          OR aa.title ILIKE 'TRIAGEM - %'
          OR aa.title ILIKE '%ARMAZEN%'
          OR aa.title ILIKE '%ROUPEIRO%'
        );
    END IF;

    -- 5. Estrutura e Conservação (prefixos: COZINHA -, SALA -, QUARTOS -, VARANDA/SACADA -, INSTALAÇÕES -, JARDINAGEM -, VESTIÁRIO -, MANUTENÇÃO -)
    IF estrutura_id IS NOT NULL THEN
      UPDATE public.audit_actions aa
      SET category_id = estrutura_id
      FROM public.audits a
      WHERE aa.audit_id = a.id
        AND a.client_id = client_rec.id
        AND aa.category_id IS NULL
        AND (
          aa.title ILIKE 'COZINHA - %'
          OR aa.title ILIKE 'SALA - %'
          OR aa.title ILIKE 'QUARTOS - %'
          OR aa.title ILIKE 'VARANDA%'
          OR aa.title ILIKE 'INSTALAÇÕES - %'
          OR aa.title ILIKE 'JARDINAGEM - %'
          OR aa.title ILIKE 'ARDINAGEM - %'
          OR aa.title ILIKE 'CONFORTO - %'
          OR aa.title ILIKE 'VESTIÁRIO - %'
          OR aa.title ILIKE 'MANUTENÇÃO - %'
          OR aa.title ILIKE 'CONTAINER MANUTENÇÃO - %'
          OR aa.title ILIKE 'PORTARIA - %'
          OR aa.title ILIKE 'LOJA - %'
          OR aa.title ILIKE 'CDE - %'
          OR aa.title ILIKE 'COI %'
          OR aa.title ILIKE 'ÁREA DE TERCEIROS - %'
        );
    END IF;

    -- 6. Treinamento
    IF treinamento_id IS NOT NULL THEN
      UPDATE public.audit_actions aa
      SET category_id = treinamento_id
      FROM public.audits a
      WHERE aa.audit_id = a.id
        AND a.client_id = client_rec.id
        AND aa.category_id IS NULL
        AND (
          aa.title ILIKE '%TREINAMENTO%'
          OR aa.title ILIKE '%CAPACITAÇÃO%'
        );
    END IF;

  END LOOP;
END $$;
