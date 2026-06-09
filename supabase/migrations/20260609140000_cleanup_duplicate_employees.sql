DO $$
DECLARE
  r RECORD;
BEGIN
  -- Run the existing cleanup_duplicate_employees function for all active clients
  FOR r IN SELECT id FROM public.clients WHERE status = 'Ativo' LOOP
    -- The third param is p_dry_run. We pass false to actually delete duplicates
    PERFORM public.cleanup_duplicate_employees(r.id, NULL, false);
  END LOOP;
END $$;

-- Create the trigger to prevent future duplicates in employees
CREATE OR REPLACE FUNCTION public.prevent_duplicate_employee()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.employees 
    WHERE client_id = NEW.client_id 
      AND lower(trim(name)) = lower(trim(NEW.name)) 
      AND lower(trim(company_name)) = lower(trim(NEW.company_name)) 
      AND reference_month = NEW.reference_month
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Um colaborador com o mesmo nome e empresa já existe neste mês de referência.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_duplicate_employee ON public.employees;
CREATE TRIGGER check_duplicate_employee
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_employee();
