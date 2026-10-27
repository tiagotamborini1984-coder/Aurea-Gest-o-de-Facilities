-- Migration: deduplicate_profiles_accessible_menus
-- Descrição: Cria backup prévio do perfil da usuária Leyva (e quaisquer perfis com duplicatas em accessible_menus)
-- e atualiza accessible_menus removendo valores duplicados de forma limpa e segura (apenas UPDATE com WHERE específico).

DO $$
DECLARE
  v_leyva_id uuid := '11f8e7a2-06ca-44d6-b958-ad026e16db01'::uuid;
  v_old_menus jsonb;
  v_new_menus jsonb;
BEGIN
  -- 1. Cria tabela de backup pontual se não existir
  CREATE TABLE IF NOT EXISTS public.backup_profiles_menus_dedupe (
    id uuid NOT NULL,
    email text,
    old_accessible_menus jsonb,
    deduped_accessible_menus jsonb,
    backup_timestamp timestamptz DEFAULT now()
  );

  -- 2. Lê os dados atuais da Leyva
  SELECT accessible_menus INTO v_old_menus
  FROM public.profiles
  WHERE id = v_leyva_id;

  IF v_old_menus IS NOT NULL THEN
    -- Calcula os menus únicos preservando apenas 1 ocorrência de cada item
    SELECT jsonb_agg(DISTINCT item ORDER BY item) INTO v_new_menus
    FROM (
      SELECT jsonb_array_elements_text(v_old_menus) AS item
    ) t;

    -- Salva o backup prévio antes do UPDATE
    INSERT INTO public.backup_profiles_menus_dedupe (id, email, old_accessible_menus, deduped_accessible_menus)
    VALUES (v_leyva_id, 'leyva.souza@fs.agr.br', v_old_menus, v_new_menus);

    -- Atualiza cirurgicamente apenas este registro
    UPDATE public.profiles
    SET accessible_menus = v_new_menus
    WHERE id = v_leyva_id;
  END IF;
END $$;
