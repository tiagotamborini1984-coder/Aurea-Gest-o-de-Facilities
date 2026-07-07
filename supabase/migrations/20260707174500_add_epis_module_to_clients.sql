-- Add 'Gestão de EPIs' module to all clients that already have 'Gestão de Ferramentas'
-- This ensures the EPIs module appears in the sidebar for administrators
UPDATE public.clients
SET modules = modules || '["Gestão de EPIs"]'::jsonb
WHERE modules @> '["Gestão de Ferramentas"]'::jsonb
  AND NOT modules @> '["Gestão de EPIs"]'::jsonb;
