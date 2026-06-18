DO $$
BEGIN
  -- Create the trigger function that spawns a task when an inventory request is created
  CREATE OR REPLACE FUNCTION public.handle_inventory_request_task()
  RETURNS trigger AS $func$
  DECLARE
    v_task_type_id uuid;
    v_task_status_id uuid;
    v_task_description text;
    v_task_title text;
  BEGIN
    -- We only create a task if processed_by is set and it's a new request
    IF NEW.processed_by IS NOT NULL THEN
      
      -- Get or create Task Type 'Estoque' dynamically for the request's client
      SELECT id INTO v_task_type_id FROM public.task_types WHERE client_id = NEW.client_id AND name ILIKE 'Estoque' LIMIT 1;
      IF v_task_type_id IS NULL THEN
        v_task_type_id := gen_random_uuid();
        INSERT INTO public.task_types (id, client_id, name, sla_hours) VALUES (v_task_type_id, NEW.client_id, 'Estoque', 24);
      END IF;

      -- Get or create Task Status 'Aberto' dynamically for the request's client
      SELECT id INTO v_task_status_id FROM public.task_statuses WHERE client_id = NEW.client_id AND name ILIKE 'Aberto' LIMIT 1;
      IF v_task_status_id IS NULL THEN
        v_task_status_id := gen_random_uuid();
        INSERT INTO public.task_statuses (id, client_id, name, color, is_terminal) VALUES (v_task_status_id, NEW.client_id, 'Aberto', '#3b82f6', false);
      END IF;

      v_task_title := 'Processar Pedido de Estoque - ' || substr(NEW.id::text, 1, 8);
      v_task_description := 'Pedido de Estoque #' || substr(NEW.id::text, 1, 8) || ' aguardando processamento. Acesse o módulo de estoque para ver os itens e dar baixa na requisição.';

      -- Insert into tasks. 
      -- A system trigger 'set_task_number()' generally overwrites the task_number to a sequential one, 
      -- but we provide a unique-ish string to satisfy NOT NULL constraints if any exist.
      INSERT INTO public.tasks (
        client_id, plant_id, type_id, status_id, requester_id, assignee_id, 
        title, description, task_number
      ) VALUES (
        NEW.client_id, NEW.plant_id, v_task_type_id, v_task_status_id, NEW.requester_id, NEW.processed_by,
        v_task_title, v_task_description, 'EST-' || substr(NEW.id::text, 1, 8)
      );

    END IF;
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Bind the trigger to inventory_requests inserts
  DROP TRIGGER IF EXISTS on_inventory_request_created ON public.inventory_requests;
  CREATE TRIGGER on_inventory_request_created
    AFTER INSERT ON public.inventory_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_inventory_request_task();
END $$;
