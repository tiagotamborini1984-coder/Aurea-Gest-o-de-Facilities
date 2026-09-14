DO $$
DECLARE
  v_new_audit_id uuid;
  v_today date := '2026-09-14'::date;
  v_parent_id uuid := '74da3e47-b697-4085-8ccd-5240d889ee64'::uuid;
  v_client_id uuid := '00bb5b84-1e10-414f-9c74-88b1b0ff257c'::uuid;
  v_title text;
  v_type text;
  v_freq text;
  v_scoring jsonb;
  v_sla integer;
  v_advance integer;
  v_type_id uuid;
  v_status_id uuid;
  v_admin_id uuid;
  v_assignee record;
  v_task_id uuid;
  v_due timestamptz;
BEGIN
  -- Verificar se já existe child para 2026-09-28
  IF NOT EXISTS (
    SELECT 1 FROM public.audits 
    WHERE parent_audit_id = v_parent_id AND start_date = '2026-09-28'
  ) THEN
    -- Obter dados do template parent
    SELECT title, type, frequency, scoring_settings, sla_days, advance_notice_days
    INTO v_title, v_type, v_freq, v_scoring, v_sla, v_advance
    FROM public.audits
    WHERE id = v_parent_id;

    -- Criar child audit
    INSERT INTO public.audits (
      parent_audit_id,
      client_id,
      title,
      type,
      frequency,
      start_date,
      status,
      scoring_settings,
      sla_days,
      advance_notice_days
    ) VALUES (
      v_parent_id,
      v_client_id,
      v_title,
      v_type,
      v_freq,
      '2026-09-28',
      'Ativo',
      v_scoring,
      v_sla,
      v_advance
    ) RETURNING id INTO v_new_audit_id;

    -- Clonar audit_actions do parent
    INSERT INTO public.audit_actions (
      audit_id,
      title,
      evidence_required,
      order_index,
      weight,
      comments_required
    )
    SELECT
      v_new_audit_id,
      title,
      evidence_required,
      order_index,
      weight,
      comments_required
    FROM public.audit_actions
    WHERE audit_id = v_parent_id
    ORDER BY order_index ASC;

    -- Obter tipo e status para as tarefas
    SELECT id INTO v_type_id FROM public.task_types
    WHERE client_id = v_client_id AND name ILIKE '%Auditoria%'
    LIMIT 1;

    IF v_type_id IS NULL THEN
      SELECT id INTO v_type_id FROM public.task_types
      WHERE client_id = v_client_id
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    SELECT id INTO v_status_id FROM public.task_statuses
    WHERE client_id = v_client_id AND is_terminal = false
    ORDER BY created_at ASC
    LIMIT 1;

    SELECT id INTO v_admin_id FROM public.profiles
    WHERE client_id = v_client_id AND role IN ('Administrador', 'Master')
    LIMIT 1;

    -- Copiar assignments e gerar tarefas + audit_executions
    FOR v_assignee IN (
      SELECT plant_id, assignee_id
      FROM public.audit_assignments
      WHERE audit_id = v_parent_id AND assignee_id IS NOT NULL
    ) LOOP
      -- Inserir assignment para o novo child
      INSERT INTO public.audit_assignments (audit_id, plant_id, assignee_id)
      VALUES (v_new_audit_id, v_assignee.plant_id, v_assignee.assignee_id);

      -- Calcular due_date
      IF v_sla IS NOT NULL THEN
        v_due := (v_today + (v_sla || ' days')::interval)::timestamptz;
      ELSE
        v_due := (v_today + interval '1 day' - interval '1 millisecond')::timestamptz;
      END IF;

      -- Inserir task
      INSERT INTO public.tasks (
        client_id,
        plant_id,
        type_id,
        status_id,
        requester_id,
        assignee_id,
        task_number,
        title,
        due_date,
        status_updated_at,
        description,
        audit_id
      ) VALUES (
        v_client_id,
        v_assignee.plant_id,
        v_type_id,
        v_status_id,
        COALESCE(v_admin_id, v_assignee.assignee_id),
        v_assignee.assignee_id,
        'GERANDO...',
        'Auditoria: ' || v_title,
        v_due,
        NOW(),
        'Por favor, realize a auditoria "' || v_title || '" agendada.',
        v_new_audit_id
      ) RETURNING id INTO v_task_id;

      -- Inserir audit_execution
      INSERT INTO public.audit_executions (
        audit_id,
        task_id,
        assignee_id,
        plant_id,
        status
      ) VALUES (
        v_new_audit_id,
        v_task_id,
        v_assignee.assignee_id,
        v_assignee.plant_id,
        'Pendente'
      );

      -- Task timeline
      INSERT INTO public.task_timeline (
        task_id,
        user_id,
        content,
        action_type
      ) VALUES (
        v_task_id,
        COALESCE(v_admin_id, v_assignee.assignee_id),
        'Tarefa gerada para "' || v_title || '".',
        'system'
      );
    END LOOP;

    -- Registrar log
    INSERT INTO public.audit_logs (
      client_id,
      user_id,
      action_type,
      details
    ) VALUES (
      v_client_id,
      COALESCE(v_admin_id, '00000000-0000-0000-0000-000000000000'::uuid),
      'audit_generated',
      'Generated "' || v_title || '" for 2026-09-28 (child: ' || v_new_audit_id || ')'
    );
  END IF;
END $$;
