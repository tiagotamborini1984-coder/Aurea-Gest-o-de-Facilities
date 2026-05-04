DO $$
BEGIN
  ALTER TABLE public.locker_collaborators ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE;

  DROP POLICY IF EXISTS "tenant_isolation_locker_collaborators" ON public.locker_collaborators;
  DROP POLICY IF EXISTS "plant_isolation_locker_collaborators" ON public.locker_collaborators;

  CREATE POLICY "plant_isolation_locker_collaborators" ON public.locker_collaborators
    AS PERMISSIVE FOR ALL TO authenticated
    USING (
      ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) 
      AND 
      (plant_id IS NULL OR is_plant_authorized(plant_id))
    )
    WITH CHECK (
      ((get_user_role() = 'Master'::text) OR (client_id = get_user_client_id())) 
      AND 
      (plant_id IS NULL OR is_plant_authorized(plant_id))
    );
END $$;
