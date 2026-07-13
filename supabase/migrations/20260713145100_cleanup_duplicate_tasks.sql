-- Cleanup duplicate audit tasks and executions
-- Duplicates: tasks with same client_id, plant_id, title, description where status is non-terminal
-- Strategy: keep most recent (created_at DESC), re-link audit_executions, delete duplicates

-- Step 1: Re-link audit_executions from duplicate tasks to survivor, then delete duplicate tasks
DO $$
DECLARE
  v_dup RECORD;
  v_survivor_id UUID;
BEGIN
  FOR v_dup IN (
    SELECT t.client_id, t.plant_id, t.title, t.description
    FROM public.tasks t
    WHERE t.status_id IN (
      SELECT id FROM public.task_statuses WHERE is_terminal = false
    )
    AND t.title LIKE 'Auditoria: %'
    GROUP BY t.client_id, t.plant_id, t.title, t.description
    HAVING COUNT(*) > 1
  ) LOOP
    SELECT id INTO v_survivor_id
    FROM public.tasks
    WHERE client_id = v_dup.client_id
      AND plant_id = v_dup.plant_id
      AND title = v_dup.title
      AND description = v_dup.description
      AND status_id IN (SELECT id FROM public.task_statuses WHERE is_terminal = false)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_survivor_id IS NOT NULL THEN
      UPDATE public.audit_executions
      SET task_id = v_survivor_id
      WHERE task_id IN (
        SELECT id FROM public.tasks
        WHERE client_id = v_dup.client_id
          AND plant_id = v_dup.plant_id
          AND title = v_dup.title
          AND description = v_dup.description
          AND id != v_survivor_id
          AND status_id IN (SELECT id FROM public.task_statuses WHERE is_terminal = false)
      )
      AND task_id IS NOT NULL;

      DELETE FROM public.tasks
      WHERE client_id = v_dup.client_id
        AND plant_id = v_dup.plant_id
        AND title = v_dup.title
        AND description = v_dup.description
        AND id != v_survivor_id
        AND status_id IN (SELECT id FROM public.task_statuses WHERE is_terminal = false);

      RAISE NOTICE 'Cleaned up duplicate tasks for "%", kept %', v_dup.title, v_survivor_id;
    END IF;
  END LOOP;
END $$;

-- Step 2: Clean up duplicate pending audit_executions (same audit_id + plant_id)
-- Keep the one with a task_id (or most recent if multiple have tasks)
DO $$
DECLARE
  v_dup_exec RECORD;
  v_keep_id UUID;
  v_exec_to_delete RECORD;
BEGIN
  FOR v_dup_exec IN (
    SELECT audit_id, plant_id
    FROM public.audit_executions
    WHERE status IN ('Pendente', 'Rascunho', 'Em Andamento')
    GROUP BY audit_id, plant_id
    HAVING COUNT(*) > 1
  ) LOOP
    SELECT id INTO v_keep_id
    FROM public.audit_executions
    WHERE audit_id = v_dup_exec.audit_id
      AND plant_id = v_dup_exec.plant_id
      AND status IN ('Pendente', 'Rascunho', 'Em Andamento')
    ORDER BY
      (task_id IS NOT NULL) DESC,
      created_at DESC
    LIMIT 1;

    IF v_keep_id IS NOT NULL THEN
      FOR v_exec_to_delete IN (
        SELECT id, task_id
        FROM public.audit_executions
        WHERE audit_id = v_dup_exec.audit_id
          AND plant_id = v_dup_exec.plant_id
          AND status IN ('Pendente', 'Rascunho', 'Em Andamento')
          AND id != v_keep_id
      ) LOOP
        IF v_exec_to_delete.task_id IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.audit_executions
            WHERE task_id = v_exec_to_delete.task_id
              AND id != v_exec_to_delete.id
          ) THEN
            DELETE FROM public.tasks WHERE id = v_exec_to_delete.task_id;
          END IF;
        END IF;

        DELETE FROM public.audit_executions WHERE id = v_exec_to_delete.id;
      END LOOP;

      RAISE NOTICE 'Cleaned up duplicate executions for audit % plant %, kept %', v_dup_exec.audit_id, v_dup_exec.plant_id, v_keep_id;
    END IF;
  END LOOP;
END $$;

-- Step 3: Ensure all pending audit_executions have a task_id
-- (will be backfilled by the edge function or existing backfill migrations)
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.audit_executions
  WHERE task_id IS NULL
    AND status IN ('Pendente', 'Rascunho', 'Em Andamento');

  IF v_count > 0 THEN
    RAISE NOTICE 'Found % audit executions without task_id - will be backfilled by edge function', v_count;
  END IF;
END $$;
