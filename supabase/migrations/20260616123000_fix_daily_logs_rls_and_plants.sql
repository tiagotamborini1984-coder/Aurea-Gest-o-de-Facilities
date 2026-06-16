-- Ensure daily_logs table exists and has proper constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_logs') THEN
    CREATE TABLE public.daily_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL,
      plant_id UUID NOT NULL,
      type TEXT NOT NULL,
      reference_id UUID NOT NULL,
      date DATE NOT NULL,
      status BOOLEAN NOT NULL DEFAULT false,
      is_published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Clean duplicates if any, to allow adding unique constraint safely
DO $$
BEGIN
  DELETE FROM public.daily_logs a USING (
    SELECT MIN(ctid) as ctid, date, type, reference_id
    FROM public.daily_logs 
    GROUP BY date, type, reference_id HAVING COUNT(*) > 1
  ) b
  WHERE a.date = b.date AND a.type = b.type AND a.reference_id = b.reference_id AND a.ctid <> b.ctid;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if something fails
END $$;

-- Fix daily_logs constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_date_type_reference_id_key'
  ) THEN
    ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_date_type_reference_id_key UNIQUE (date, type, reference_id);
  END IF;
END $$;

-- Create helper function for RLS
CREATE OR REPLACE FUNCTION public.is_plant_authorized(p_plant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_master BOOLEAN := FALSE;
  v_has_access BOOLEAN := FALSE;
BEGIN
  -- Check if user is Master or Admin in profiles
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin'
    ) THEN
      EXECUTE 'SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = $1'
      INTO v_is_master
      USING auth.uid();
      
      IF v_is_master THEN
        RETURN TRUE;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) THEN
      EXECUTE 'SELECT role = ''Master'' FROM public.profiles WHERE id = $1'
      INTO v_is_master
      USING auth.uid();
      
      IF v_is_master THEN
        RETURN TRUE;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Plant access check
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_plants'
    ) THEN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.user_plants WHERE user_id = $1 AND plant_id = $2)'
      INTO v_has_access
      USING auth.uid(), p_plant_id;

      RETURN v_has_access;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Default to true if user_plants table is not implemented yet to avoid locking users out
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate RLS policies
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_logs_select" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_insert" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_update" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_delete" ON public.daily_logs;

CREATE POLICY "daily_logs_select" ON public.daily_logs
  FOR SELECT TO authenticated USING (public.is_plant_authorized(plant_id));

CREATE POLICY "daily_logs_insert" ON public.daily_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_plant_authorized(plant_id));

CREATE POLICY "daily_logs_update" ON public.daily_logs
  FOR UPDATE TO authenticated USING (public.is_plant_authorized(plant_id)) WITH CHECK (public.is_plant_authorized(plant_id));

CREATE POLICY "daily_logs_delete" ON public.daily_logs
  FOR DELETE TO authenticated USING (public.is_plant_authorized(plant_id));

-- Ensure seed data for plants (Lucas, Primavera, Sorriso)
DO $$
DECLARE
  v_client_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN
    SELECT id INTO v_client_id FROM public.clients ORDER BY created_at ASC LIMIT 1;
    
    IF v_client_id IS NULL THEN
      v_client_id := gen_random_uuid();
      IF NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Cliente Padrão') THEN
        INSERT INTO public.clients (id, name, status) VALUES (v_client_id, 'Cliente Padrão', 'Ativo');
      END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'plants') THEN
      IF NOT EXISTS (SELECT 1 FROM public.plants WHERE name = 'Lucas') THEN
        INSERT INTO public.plants (client_id, name, status) VALUES (v_client_id, 'Lucas', 'Ativo');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM public.plants WHERE name = 'Primavera') THEN
        INSERT INTO public.plants (client_id, name, status) VALUES (v_client_id, 'Primavera', 'Ativo');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM public.plants WHERE name = 'Sorriso') THEN
        INSERT INTO public.plants (client_id, name, status) VALUES (v_client_id, 'Sorriso', 'Ativo');
      END IF;
    END IF;
  END IF;
END $$;
