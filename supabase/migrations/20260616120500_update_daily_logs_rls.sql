-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "daily_logs_insert" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_update" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_delete" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_select" ON public.daily_logs;

DROP POLICY IF EXISTS "Users can insert daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can update daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can delete daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can view daily_logs" ON public.daily_logs;

-- Recreate policies using appropriate functions for client and plant authorization
CREATE POLICY "daily_logs_select" ON public.daily_logs
    FOR SELECT TO authenticated
    USING (
        (client_id = public.get_user_client_id() OR public.get_user_role() = 'Master'::text)
        AND public.is_plant_authorized(plant_id)
    );

CREATE POLICY "daily_logs_insert" ON public.daily_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        (client_id = public.get_user_client_id() OR public.get_user_role() = 'Master'::text)
        AND public.is_plant_authorized(plant_id)
    );

CREATE POLICY "daily_logs_update" ON public.daily_logs
    FOR UPDATE TO authenticated
    USING (
        (client_id = public.get_user_client_id() OR public.get_user_role() = 'Master'::text)
        AND public.is_plant_authorized(plant_id)
    )
    WITH CHECK (
        (client_id = public.get_user_client_id() OR public.get_user_role() = 'Master'::text)
        AND public.is_plant_authorized(plant_id)
    );

CREATE POLICY "daily_logs_delete" ON public.daily_logs
    FOR DELETE TO authenticated
    USING (
        (client_id = public.get_user_client_id() OR public.get_user_role() = 'Master'::text)
        AND public.is_plant_authorized(plant_id)
    );

-- Ensure the unique constraint exists for the upsert operation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'daily_logs_date_type_reference_id_key'
    ) THEN
        ALTER TABLE public.daily_logs 
        ADD CONSTRAINT daily_logs_date_type_reference_id_key UNIQUE (date, type, reference_id);
    END IF;
END $$;
