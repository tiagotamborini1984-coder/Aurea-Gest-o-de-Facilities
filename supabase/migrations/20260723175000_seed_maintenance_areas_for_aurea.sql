-- Seed maintenance_areas for the aurea client if none exist
INSERT INTO public.maintenance_areas (client_id, plant_id, name)
SELECT c.id, p.id, 'Geral'
FROM public.clients c
JOIN public.plants p ON p.client_id = c.id
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_areas ma 
    WHERE ma.client_id = c.id AND ma.plant_id = p.id
  );

-- Also seed a default maintenance status if none exist
INSERT INTO public.maintenance_statuses (client_id, name, color, step, is_terminal, order_index)
SELECT c.id, 'Aberto', '#3b82f6', 'Aberto', false, 0
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_statuses ms WHERE ms.client_id = c.id
  );

INSERT INTO public.maintenance_statuses (client_id, name, color, step, is_terminal, order_index)
SELECT c.id, 'Em Execução', '#f59e0b', 'Em Execução', false, 1
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_statuses ms 
    WHERE ms.client_id = c.id AND ms.step = 'Em Execução'
  );

INSERT INTO public.maintenance_statuses (client_id, name, color, step, is_terminal, order_index)
SELECT c.id, 'Concluído', '#22c55e', 'Concluído', true, 2
FROM public.clients c
WHERE c.url_slug = 'aurea-facility-management'
  AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_statuses ms 
    WHERE ms.client_id = c.id AND ms.step = 'Concluído'
  );
