DO $$
DECLARE
  v_rec RECORD;
  v_new_due TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Fix all tasks associated with audit executions so that their due_date = created_at + frequency
  -- This ensures the history UI matches the explicit business rule: SLA = Data Gerada + Periodicidade
  FOR v_rec IN 
    SELECT ae.id as exec_id, ae.created_at, ae.task_id, a.frequency, a.start_date
    FROM public.audit_executions ae
    JOIN public.audits a ON a.id = ae.audit_id
    WHERE ae.task_id IS NOT NULL
  LOOP
    IF v_rec.frequency = 'Única' THEN
      v_new_due := v_rec.start_date::date;
    ELSE
      v_new_due := v_rec.created_at::date;
      
      IF v_rec.frequency = 'Diária' THEN
        v_new_due := v_new_due + INTERVAL '1 day';
      ELSIF v_rec.frequency = 'Semanal' THEN
        v_new_due := v_new_due + INTERVAL '1 week';
      ELSIF v_rec.frequency = 'Mensal' THEN
        v_new_due := v_new_due + INTERVAL '1 month';
      ELSIF v_rec.frequency = 'Semestral' THEN
        v_new_due := v_new_due + INTERVAL '6 months';
      ELSIF v_rec.frequency = 'Anual' THEN
        v_new_due := v_new_due + INTERVAL '1 year';
      END IF;
    END IF;

    -- Set to end of day to match SLA requirements
    v_new_due := v_new_due + TIME '23:59:59.999';
    
    UPDATE public.tasks
    SET due_date = v_new_due
    WHERE id = v_rec.task_id;
    
  END LOOP;
END $$;
