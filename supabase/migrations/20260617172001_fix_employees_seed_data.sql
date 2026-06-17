DO $$
BEGIN
  UPDATE public.employees
  SET 
    reference_month = COALESCE(reference_month, TO_CHAR(created_at, 'YYYY-MM-01')),
    status = COALESCE(status, 'Ativo')
  WHERE reference_month IS NULL OR status IS NULL OR status = '';
END $$;
