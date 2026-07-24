DO $$
BEGIN
  INSERT INTO public.maintenance_statuses (client_id, name, color, step, is_terminal, order_index, created_at)
  SELECT c.id, 'Em Execução', '#f59e0b', 'Em Execução', false, 2, NOW()
  FROM public.clients c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.maintenance_statuses ms
    WHERE ms.client_id = c.id AND ms.step = 'Em Execução'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.maintenance_statuses (client_id, name, color, step, is_terminal, order_index, created_at)
  SELECT c.id, 'Finalizado', '#22c55e', 'Concluído', true, 3, NOW()
  FROM public.clients c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.maintenance_statuses ms
    WHERE ms.client_id = c.id AND ms.is_terminal = true AND ms.step = 'Concluído'
  )
  ON CONFLICT DO NOTHING;
END $$;
