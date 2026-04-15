DO $$
BEGIN
  -- Limpar dados fakes do módulo de Gestão de Imóveis
  -- A ordem de exclusão respeita as restrições de chaves estrangeiras (Foreign Keys)
  
  DELETE FROM public.property_reservations;
  DELETE FROM public.property_guests;
  DELETE FROM public.property_rooms;
  DELETE FROM public.properties;
  DELETE FROM public.property_cost_centers;
  
END $$;
