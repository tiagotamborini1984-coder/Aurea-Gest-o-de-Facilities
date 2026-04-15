DO $$
BEGIN
  -- Atualiza o usuário admin@aurea.com para o perfil Master estrito sem client_id
  UPDATE public.profiles
  SET role = 'Master', client_id = NULL
  WHERE email = 'admin@aurea.com';
END $$;
