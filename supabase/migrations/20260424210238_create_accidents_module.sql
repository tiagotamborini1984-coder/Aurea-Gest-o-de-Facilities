CREATE TABLE IF NOT EXISTS public.accidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
    event_date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    department TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Leve', 'Moderado', 'Grave')),
    description TEXT NOT NULL,
    photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.accidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plant_isolation_accidents" ON public.accidents;
CREATE POLICY "plant_isolation_accidents" ON public.accidents
    FOR ALL TO authenticated
    USING (((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id())) AND public.is_plant_authorized(plant_id))
    WITH CHECK (((public.get_user_role() = 'Master') OR (client_id = public.get_user_client_id())) AND public.is_plant_authorized(plant_id));
