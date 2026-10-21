-- Migration: Ensure "Finalizado" terminal status exists for all clients and enforce NC approval flow
-- Date: 2026-10-21

-- 1. Ensure "Finalizado" exists as a terminal status for all clients
INSERT INTO public.task_statuses (client_id, name, color, is_terminal, freeze_sla, sla_days, return_to_requester)
SELECT c.id, 'Finalizado', '#10b981', true, false, 0, false
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 FROM public.task_statuses ts 
  WHERE ts.client_id = c.id 
    AND (ts.name ILIKE '%Finalizado%' OR ts.name ILIKE '%Concluído%' OR ts.name ILIKE '%Concluido%')
);

-- 2. Ensure "Aguardando Aprovação" exists for all clients
INSERT INTO public.task_statuses (client_id, name, color, is_terminal, freeze_sla, sla_days, return_to_requester)
SELECT c.id, 'Aguardando Aprovação', '#f59e0b', false, true, 2, false
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 FROM public.task_statuses ts 
  WHERE ts.client_id = c.id 
    AND (ts.name ILIKE '%Aguardando Aprovação%' OR ts.name ILIKE '%Aguardando Aprovacao%')
);
