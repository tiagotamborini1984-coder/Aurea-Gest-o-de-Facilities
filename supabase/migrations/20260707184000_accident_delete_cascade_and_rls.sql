-- Update FK constraint on tasks.accident_id to ON DELETE CASCADE
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_accident_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_accident_id_fkey
  FOREIGN KEY (accident_id) REFERENCES public.accidents(id) ON DELETE CASCADE;

-- Update accidents DELETE RLS policy to explicitly allow admin role
DROP POLICY IF EXISTS "accidents_delete" ON public.accidents;
CREATE POLICY "accidents_delete" ON public.accidents
  FOR DELETE TO authenticated
  USING (
    is_client_active()
    AND (
      get_user_role() = 'Master'::text
      OR (
        get_user_role() = 'Administrador'::text
        AND client_id = get_user_client_id()
        AND is_plant_authorized(plant_id)
      )
    )
  );
