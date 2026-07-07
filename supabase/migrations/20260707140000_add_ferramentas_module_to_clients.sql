DO $$
BEGIN
  UPDATE public.clients
  SET modules = modules || to_jsonb('Gestão de Ferramentas'::text)
  WHERE NOT modules @> to_jsonb('Gestão de Ferramentas'::text);
END $$;
