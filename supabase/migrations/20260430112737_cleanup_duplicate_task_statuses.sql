DO $$
DECLARE
  v_client record;
  v_dup record;
  v_keep_id uuid;
BEGIN
  -- For each client
  FOR v_client IN SELECT id FROM public.clients LOOP
    -- Clean up duplicated task_statuses (same name)
    FOR v_dup IN 
      SELECT name, count(*) as c 
      FROM public.task_statuses 
      WHERE client_id = v_client.id 
      GROUP BY name 
      HAVING count(*) > 1 
    LOOP
      -- Get the oldest one to keep
      SELECT id INTO v_keep_id 
      FROM public.task_statuses 
      WHERE client_id = v_client.id AND name = v_dup.name 
      ORDER BY created_at ASC 
      LIMIT 1;

      -- Update tasks pointing to the other duplicates to point to the kept one
      UPDATE public.tasks 
      SET status_id = v_keep_id 
      WHERE client_id = v_client.id 
        AND status_id IN (
          SELECT id FROM public.task_statuses 
          WHERE client_id = v_client.id 
            AND name = v_dup.name 
            AND id != v_keep_id
        );

      -- Delete the other duplicates
      DELETE FROM public.task_statuses 
      WHERE client_id = v_client.id 
        AND name = v_dup.name 
        AND id != v_keep_id;
    END LOOP;
    
    -- Clean up duplicated task_types (same name)
    FOR v_dup IN 
      SELECT name, count(*) as c 
      FROM public.task_types 
      WHERE client_id = v_client.id 
      GROUP BY name 
      HAVING count(*) > 1 
    LOOP
      SELECT id INTO v_keep_id 
      FROM public.task_types 
      WHERE client_id = v_client.id AND name = v_dup.name 
      ORDER BY created_at ASC 
      LIMIT 1;

      UPDATE public.tasks 
      SET type_id = v_keep_id 
      WHERE client_id = v_client.id 
        AND type_id IN (
          SELECT id FROM public.task_types 
          WHERE client_id = v_client.id 
            AND name = v_dup.name 
            AND id != v_keep_id
        );

      DELETE FROM public.task_types 
      WHERE client_id = v_client.id 
        AND name = v_dup.name 
        AND id != v_keep_id;
    END LOOP;

  END LOOP;
END $$;
