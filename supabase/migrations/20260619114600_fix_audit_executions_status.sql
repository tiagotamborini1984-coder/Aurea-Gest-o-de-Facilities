DO $$
BEGIN
  -- Normalize existing records to ensure audits with final score and realization date are marked as Finalizado
  UPDATE public.audit_executions
  SET status = 'Finalizado'
  WHERE realization_date IS NOT NULL
    AND final_score IS NOT NULL
    AND LOWER(status) NOT IN (
      'finalizado', 'finalizada', 'concluido', 'concluído', 
      'concluida', 'concluída', 'realizado', 'realizada', 
      'finished', 'completed'
    );
END $$;
