DO $$
DECLARE
  rec RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'cleanup_duplicate_employees'
  ) THEN
    FOR rec IN SELECT id FROM public.plants LOOP
      BEGIN
        PERFORM public.cleanup_duplicate_employees(rec.id);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
  END IF;
END $$;
