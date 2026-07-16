-- 1. Seed user (idempotent)
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lptamborini@hotmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'lptamborini@hotmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "LP Tamborini"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, name, role)
    VALUES (new_user_id, 'lptamborini@hotmail.com', 'LP Tamborini', 'Master')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 2. Revert task TSK-2026-0754 to pending state
DO $$
DECLARE
  v_task_id uuid;
  v_execution_id uuid;
  v_client_id uuid;
  v_non_terminal_status_id uuid;
BEGIN
  SELECT id INTO v_task_id FROM public.tasks WHERE task_number = 'TSK-2026-0754';

  IF v_task_id IS NOT NULL THEN
    SELECT ae.id, a.client_id INTO v_execution_id, v_client_id
    FROM public.audit_executions ae
    JOIN public.audits a ON a.id = ae.audit_id
    WHERE ae.task_id = v_task_id
    LIMIT 1;

    IF v_execution_id IS NOT NULL THEN
      DELETE FROM public.audit_execution_answers
      WHERE execution_id = v_execution_id AND score IS NULL;

      UPDATE public.audit_executions
      SET status = 'Em Andamento',
          final_score = NULL,
          realization_date = NULL
      WHERE id = v_execution_id
        AND status NOT IN ('Em Andamento', 'Pendente', 'Rascunho');

      IF v_client_id IS NOT NULL THEN
        SELECT id INTO v_non_terminal_status_id
        FROM public.task_statuses
        WHERE client_id = v_client_id AND is_terminal = false
        ORDER BY created_at ASC LIMIT 1;

        IF v_non_terminal_status_id IS NOT NULL THEN
          UPDATE public.tasks
          SET status_id = v_non_terminal_status_id,
              closed_at = NULL
          WHERE id = v_task_id
            AND closed_at IS NOT NULL;
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- 3. Create reopen_audit_execution function (idempotent via CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.reopen_audit_execution(p_execution_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_audit_id uuid;
  v_task_id uuid;
  v_client_id uuid;
  v_non_terminal_status_id uuid;
BEGIN
  SELECT audit_id, task_id INTO v_audit_id, v_task_id
  FROM public.audit_executions
  WHERE id = p_execution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Execution not found';
  END IF;

  SELECT client_id INTO v_client_id FROM public.audits WHERE id = v_audit_id;

  UPDATE public.audit_executions
  SET status = 'Em Andamento',
      final_score = NULL,
      realization_date = NULL
  WHERE id = p_execution_id;

  IF v_task_id IS NOT NULL AND v_client_id IS NOT NULL THEN
    SELECT id INTO v_non_terminal_status_id
    FROM public.task_statuses
    WHERE client_id = v_client_id AND is_terminal = false
    ORDER BY created_at ASC LIMIT 1;

    IF v_non_terminal_status_id IS NOT NULL THEN
      UPDATE public.tasks
      SET status_id = v_non_terminal_status_id,
          closed_at = NULL
      WHERE id = v_task_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
