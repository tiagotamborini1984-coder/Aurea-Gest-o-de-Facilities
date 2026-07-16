-- Prevent editing planning fields of cleaning/gardening schedules on or after the activity date
-- Only execution-related fields (status, evidence, justification) can still be updated

CREATE OR REPLACE FUNCTION public.prevent_schedule_planning_edit()
RETURNS trigger AS $$
BEGIN
  -- If either the old or new activity_date is today or in the past, block planning field changes
  IF OLD.activity_date <= CURRENT_DATE OR NEW.activity_date <= CURRENT_DATE THEN
    IF NEW.activity_date IS DISTINCT FROM OLD.activity_date
       OR NEW.start_time IS DISTINCT FROM OLD.start_time
       OR NEW.end_time IS DISTINCT FROM OLD.end_time
       OR NEW.area_id IS DISTINCT FROM OLD.area_id
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.is_urgent IS DISTINCT FROM OLD.is_urgent
       OR NEW.plant_id IS DISTINCT FROM OLD.plant_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id THEN
      RAISE EXCEPTION 'Não é permitido alterar dados de planejamento de atividades com data igual ou anterior ao dia atual.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_schedule_planning_edit ON public.cleaning_gardening_schedules;
CREATE TRIGGER prevent_schedule_planning_edit
  BEFORE UPDATE ON public.cleaning_gardening_schedules
  FOR EACH ROW EXECUTE FUNCTION public.prevent_schedule_planning_edit();
