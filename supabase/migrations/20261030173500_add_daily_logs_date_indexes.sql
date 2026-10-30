-- Migração aditiva para otimizar consultas do Dashboard do Gestor e filtros de longo período
-- Cria índice composto em daily_logs (date, plant_id, id) e índices de apoio sem qualquer impacto destrutivo

CREATE INDEX IF NOT EXISTS idx_daily_logs_date_plant_id_id 
  ON public.daily_logs (date, plant_id, id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_date_id 
  ON public.daily_logs (date, id);

CREATE INDEX IF NOT EXISTS idx_plant_non_working_days_date_plant 
  ON public.plant_non_working_days (date, plant_id);
