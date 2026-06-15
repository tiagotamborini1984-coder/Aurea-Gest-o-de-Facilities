-- Create get_user_client_id if it doesn't exist
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT client_id INTO v_client_id FROM public.profiles WHERE id = auth.uid();
  RETURN v_client_id;
END;
$$;

DO $$
BEGIN
  -- Cleanup duplicates before applying unique constraint
  DELETE FROM public.daily_logs
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY date, type, reference_id ORDER BY updated_at DESC, id ASC) as rnum
      FROM public.daily_logs
    ) t
    WHERE t.rnum > 1
  );

  -- Add unique constraint for upsert
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_date_type_reference_id_key'
  ) THEN
    ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_date_type_reference_id_key UNIQUE (date, type, reference_id);
  END IF;

  -- Ensure user_plants table exists for RLS policies
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_plants') THEN
    CREATE TABLE public.user_plants (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      plant_id uuid REFERENCES public.plants(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id, plant_id)
    );
    ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "user_plants_select" ON public.user_plants FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Recreate policies to ensure Gestor, Administrador and Master have correct access
DROP POLICY IF EXISTS "daily_logs_select" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_insert" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_update" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_delete" ON public.daily_logs;

CREATE POLICY "daily_logs_select" ON public.daily_logs
  FOR SELECT TO authenticated
  USING (
    client_id = public.get_user_client_id()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true)
  );

CREATE POLICY "daily_logs_insert" ON public.daily_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (client_id = public.get_user_client_id() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true))
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_master = true))
      OR plant_id IN (SELECT plant_id FROM public.user_plants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "daily_logs_update" ON public.daily_logs
  FOR UPDATE TO authenticated
  USING (
    (client_id = public.get_user_client_id() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true))
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_master = true))
      OR plant_id IN (SELECT plant_id FROM public.user_plants WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    (client_id = public.get_user_client_id() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true))
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_master = true))
      OR plant_id IN (SELECT plant_id FROM public.user_plants WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "daily_logs_delete" ON public.daily_logs
  FOR DELETE TO authenticated
  USING (
    (client_id = public.get_user_client_id() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true))
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_master = true))
      OR plant_id IN (SELECT plant_id FROM public.user_plants WHERE user_id = auth.uid())
    )
  );

-- Optional Seed Data for Sorriso plant
DO $$
DECLARE
  v_client_id uuid;
  v_plant_id uuid;
  v_employee_id uuid;
BEGIN
  -- Get or create a client
  SELECT id INTO v_client_id FROM public.clients LIMIT 1;
  IF v_client_id IS NULL THEN
    v_client_id := gen_random_uuid();
    INSERT INTO public.clients (id, name, status) VALUES (v_client_id, 'Cliente Exemplo', 'ativo') ON CONFLICT DO NOTHING;
  END IF;

  -- Create or find Sorriso plant
  SELECT id INTO v_plant_id FROM public.plants WHERE name ILIKE '%Sorriso%' LIMIT 1;
  IF v_plant_id IS NULL THEN
    v_plant_id := gen_random_uuid();
    INSERT INTO public.plants (id, client_id, name) VALUES (v_plant_id, v_client_id, 'Unidade Sorriso') ON CONFLICT DO NOTHING;
  END IF;

  -- Add employee to Sorriso
  SELECT id INTO v_employee_id FROM public.employees WHERE plant_id = v_plant_id LIMIT 1;
  IF v_employee_id IS NULL THEN
    v_employee_id := gen_random_uuid();
    INSERT INTO public.employees (id, client_id, plant_id, name, company_name, reference_month, status) 
    VALUES (v_employee_id, v_client_id, v_plant_id, 'Colaborador Teste (Sorriso)', 'Empresa Teste', to_char(now(), 'YYYY-MM-01'), 'Ativo') ON CONFLICT DO NOTHING;
  END IF;

  -- Seed daily log
  IF v_employee_id IS NOT NULL THEN
    INSERT INTO public.daily_logs (client_id, plant_id, type, reference_id, date, status)
    VALUES (v_client_id, v_plant_id, 'staff', v_employee_id, current_date, true)
    ON CONFLICT (date, type, reference_id) DO NOTHING;
  END IF;
END $$;
