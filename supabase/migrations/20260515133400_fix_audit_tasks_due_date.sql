DO $$
DECLARE
  v_exec RECORD;
  v_last_exec RECORD;
  v_audit RECORD;
  v_next_date DATE;
  v_target_date TIMESTAMP WITH TIME ZONE;
BEGIN
  FOR v_exec IN (
    SELECT ae.id, ae.audit_id, ae.plant_id, ae.task_id 
    FROM public.audit_executions ae
    JOIN public.tasks t ON t.id = ae.task_id
    WHERE ae.status = 'Pendente'
  ) LOOP
    -- Get audit details
    SELECT * INTO v_audit FROM public.audits WHERE id = v_exec.audit_id;
    
    IF v_audit.frequency != 'Única' THEN
      -- Get last finalized execution
      SELECT * INTO v_last_exec 
      FROM public.audit_executions 
      WHERE audit_id = v_exec.audit_id 
        AND plant_id = v_exec.plant_id 
        AND status = 'Finalizado'
      ORDER BY created_at DESC 
      LIMIT 1;

      IF FOUND THEN
        v_next_date := COALESCE(v_last_exec.realization_date, (v_last_exec.created_at AT TIME ZONE 'UTC')::DATE);
        
        IF v_audit.frequency = 'Diária' THEN
          v_next_date := v_next_date + INTERVAL '1 day';
        ELSIF v_audit.frequency = 'Semanal' THEN
          v_next_date := v_next_date + INTERVAL '1 week';
        ELSIF v_audit.frequency = 'Mensal' THEN
          v_next_date := v_next_date + INTERVAL '1 month';
        ELSIF v_audit.frequency = 'Semestral' THEN
          v_next_date := v_next_date + INTERVAL '6 months';
        ELSIF v_audit.frequency = 'Anual' THEN
          v_next_date := v_next_date + INTERVAL '1 year';
        END IF;

        v_target_date := v_next_date + TIME '23:59:59.999';

        -- Update the task due_date
        UPDATE public.tasks 
        SET due_date = v_target_date 
        WHERE id = v_exec.task_id;
      END IF;
    END IF;
  END LOOP;
END $$;
