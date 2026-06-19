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

-- 2. Update stuck audits
UPDATE public.audit_executions 
SET 
  status = 'Finalizada',
  realization_date = COALESCE(realization_date, created_at::date)
WHERE 
  status NOT ILIKE '%finalizad%' 
  AND status NOT ILIKE '%concluid%'
  AND status NOT ILIKE '%realizad%'
  AND id IN (SELECT execution_id FROM public.audit_execution_answers);

-- 3. Ensure RLS policies for audit_executions and audit_execution_answers
DO $$
BEGIN
  ALTER TABLE public.audit_executions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.audit_execution_answers ENABLE ROW LEVEL SECURITY;

  -- Policies for audit_executions
  DROP POLICY IF EXISTS "auth_select_audit_executions" ON public.audit_executions;
  CREATE POLICY "auth_select_audit_executions" ON public.audit_executions FOR SELECT TO authenticated USING (true);

  DROP POLICY IF EXISTS "auth_update_audit_executions" ON public.audit_executions;
  CREATE POLICY "auth_update_audit_executions" ON public.audit_executions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "auth_insert_audit_executions" ON public.audit_executions;
  CREATE POLICY "auth_insert_audit_executions" ON public.audit_executions FOR INSERT TO authenticated WITH CHECK (true);

  DROP POLICY IF EXISTS "auth_delete_audit_executions" ON public.audit_executions;
  CREATE POLICY "auth_delete_audit_executions" ON public.audit_executions FOR DELETE TO authenticated USING (true);

  -- Policies for audit_execution_answers
  DROP POLICY IF EXISTS "auth_select_audit_execution_answers" ON public.audit_execution_answers;
  CREATE POLICY "auth_select_audit_execution_answers" ON public.audit_execution_answers FOR SELECT TO authenticated USING (true);

  DROP POLICY IF EXISTS "auth_update_audit_execution_answers" ON public.audit_execution_answers;
  CREATE POLICY "auth_update_audit_execution_answers" ON public.audit_execution_answers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "auth_insert_audit_execution_answers" ON public.audit_execution_answers;
  CREATE POLICY "auth_insert_audit_execution_answers" ON public.audit_execution_answers FOR INSERT TO authenticated WITH CHECK (true);

  DROP POLICY IF EXISTS "auth_delete_audit_execution_answers" ON public.audit_execution_answers;
  CREATE POLICY "auth_delete_audit_execution_answers" ON public.audit_execution_answers FOR DELETE TO authenticated USING (true);
END $$;
