DO $$
DECLARE
  r RECORD;
  new_id UUID;
BEGIN
  -- 1. Restaura registros orfãos de colaboradores (Presença) religando-os aos novos IDs válidos do mesmo mês e planta
  FOR r IN 
    SELECT dl.id, dl.plant_id, dl.date
    FROM public.daily_logs dl
    LEFT JOIN public.employees e ON dl.reference_id = e.id
    WHERE dl.type = 'staff' AND e.id IS NULL
  LOOP
    SELECT e.id INTO new_id
    FROM public.employees e
    WHERE e.plant_id = r.plant_id
      AND e.reference_month = date_trunc('month', r.date)::date
      AND NOT EXISTS (
        SELECT 1 FROM public.daily_logs dl2 
        WHERE dl2.date = r.date AND dl2.type = 'staff' AND dl2.reference_id = e.id
      )
    LIMIT 1;

    IF new_id IS NOT NULL THEN
      UPDATE public.daily_logs SET reference_id = new_id WHERE id = r.id;
    ELSE
      -- Remove o registro fantasma caso não seja possível associá-lo para evitar divergências na visibilidade global
      DELETE FROM public.daily_logs WHERE id = r.id;
    END IF;
  END LOOP;

  -- 2. Restaura registros orfãos de equipamentos religando-os a IDs válidos da planta
  FOR r IN 
    SELECT dl.id, dl.plant_id, dl.date
    FROM public.daily_logs dl
    LEFT JOIN public.equipment eq ON dl.reference_id = eq.id
    WHERE dl.type = 'equipment' AND eq.id IS NULL
  LOOP
    SELECT eq.id INTO new_id
    FROM public.equipment eq
    WHERE eq.plant_id = r.plant_id
      AND NOT EXISTS (
        SELECT 1 FROM public.daily_logs dl2 
        WHERE dl2.date = r.date AND dl2.type = 'equipment' AND dl2.reference_id = eq.id
      )
    LIMIT 1;

    IF new_id IS NOT NULL THEN
      UPDATE public.daily_logs SET reference_id = new_id WHERE id = r.id;
    ELSE
      DELETE FROM public.daily_logs WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 3. Cria as travas de segurança solicitadas para impedir exclusão em cascata pelo "Duplicar Mês" quando houver dados
CREATE OR REPLACE FUNCTION public.prevent_employee_deletion_with_logs()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.daily_logs WHERE reference_id = OLD.id AND type = 'staff') THEN
    RAISE EXCEPTION 'Não é possível sobrescrever/excluir o colaborador pois existem lançamentos de presença vinculados a ele.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_employee_deletion_with_logs_trigger ON public.employees;
CREATE TRIGGER prevent_employee_deletion_with_logs_trigger
  BEFORE DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.prevent_employee_deletion_with_logs();

CREATE OR REPLACE FUNCTION public.prevent_equipment_deletion_with_logs()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.daily_logs WHERE reference_id = OLD.id AND type = 'equipment') THEN
    RAISE EXCEPTION 'Não é possível sobrescrever/excluir o equipamento pois existem lançamentos vinculados a ele.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_equipment_deletion_with_logs_trigger ON public.equipment;
CREATE TRIGGER prevent_equipment_deletion_with_logs_trigger
  BEFORE DELETE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.prevent_equipment_deletion_with_logs();
