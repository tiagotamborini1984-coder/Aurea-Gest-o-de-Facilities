-- 1. Add requester_id column to maintenance_tickets
ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_requester_id ON public.maintenance_tickets (requester_id);

-- 2. Update handle_new_user to set client_id and authorized_plants for chamado role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_client_id UUID;
  v_authorized_plants JSONB;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'Operacional');
  v_client_id := NULLIF(NEW.raw_user_meta_data ->> 'client_id', '')::UUID;

  IF v_role = 'chamado' AND v_client_id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(id), '[]'::jsonb) INTO v_authorized_plants
    FROM public.plants WHERE client_id = v_client_id;
  END IF;

  INSERT INTO public.profiles (id, email, name, role, client_id, authorized_plants)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    v_role,
    v_client_id,
    COALESCE(v_authorized_plants, '[]'::jsonb)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Update handle_new_requester to also handle 'chamado' role
CREATE OR REPLACE FUNCTION public.handle_new_requester()
RETURNS trigger AS $$
BEGIN
  IF NEW.raw_user_meta_data ->> 'role' IN ('Solicitante', 'chamado') THEN
    INSERT INTO public.requesters (user_id, name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
      NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Update submit_maintenance_ticket to accept requester_id
DROP FUNCTION IF EXISTS public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text, uuid);

CREATE OR REPLACE FUNCTION public.submit_maintenance_ticket(
  p_client_id UUID,
  p_plant_id UUID,
  p_area_id UUID,
  p_sublocation_id UUID,
  p_asset_id UUID,
  p_requester_name TEXT,
  p_requester_email TEXT,
  p_description TEXT,
  p_photos JSONB,
  p_origin TEXT DEFAULT 'Manual',
  p_requester_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_number TEXT;
  v_status_id UUID;
  v_ticket_id UUID;
  v_year TEXT;
  v_seq INT;
BEGIN
  IF p_requester_id IS NOT NULL AND p_requester_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: requester_id mismatch';
  END IF;

  SELECT id INTO v_status_id FROM public.maintenance_statuses
  WHERE client_id = p_client_id ORDER BY order_index ASC LIMIT 1;

  v_year := to_char(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq FROM public.maintenance_tickets
  WHERE client_id = p_client_id AND ticket_number LIKE 'MAN-' || v_year || '-%';
  v_ticket_number := 'MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO public.maintenance_tickets (
    ticket_number, client_id, plant_id, area_id, sublocation_id, asset_id, status_id,
    requester_name, requester_email, requester_id, description, photos, origin
  ) VALUES (
    v_ticket_number, p_client_id, p_plant_id, p_area_id, p_sublocation_id, p_asset_id, v_status_id,
    p_requester_name, p_requester_email, p_requester_id, p_description, p_photos, COALESCE(p_origin, 'Manual')
  ) RETURNING id INTO v_ticket_id;

  RETURN jsonb_build_object('success', true, 'ticket_number', v_ticket_number, 'id', v_ticket_id);
END;
$$;

-- 5. Revoke anon access, grant authenticated only
REVOKE EXECUTE ON FUNCTION public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_maintenance_ticket(uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb, text, uuid) TO authenticated;

-- 6. Update RLS policies for chamado role on maintenance_tickets
DROP POLICY IF EXISTS "tenant_isolation_maintenance_tickets" ON public.maintenance_tickets;
CREATE POLICY "tenant_isolation_maintenance_tickets" ON public.maintenance_tickets
  FOR ALL TO authenticated USING (
    get_user_role() = 'Master' OR
    (get_user_role() != 'chamado' AND client_id = get_user_client_id())
  )
  WITH CHECK (
    get_user_role() = 'Master' OR
    (get_user_role() != 'chamado' AND client_id = get_user_client_id())
  );

DROP POLICY IF EXISTS "requester_select_own_tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "chamado_select_own_tickets" ON public.maintenance_tickets;
CREATE POLICY "chamado_select_own_tickets" ON public.maintenance_tickets
  FOR SELECT TO authenticated USING (
    get_user_role() = 'chamado' AND (
      requester_id = auth.uid() OR requester_email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "chamado_insert_own_tickets" ON public.maintenance_tickets;
CREATE POLICY "chamado_insert_own_tickets" ON public.maintenance_tickets
  FOR INSERT TO authenticated WITH CHECK (
    get_user_role() = 'chamado' AND requester_id = auth.uid()
  );

DROP POLICY IF EXISTS "chamado_update_own_tickets" ON public.maintenance_tickets;
CREATE POLICY "chamado_update_own_tickets" ON public.maintenance_tickets
  FOR UPDATE TO authenticated USING (
    get_user_role() = 'chamado' AND (
      requester_id = auth.uid() OR requester_email = auth.jwt() ->> 'email'
    )
  ) WITH CHECK (
    get_user_role() = 'chamado' AND (
      requester_id = auth.uid() OR requester_email = auth.jwt() ->> 'email'
    )
  );

-- 7. RLS for profiles - chamado users can only see their own profile
DROP POLICY IF EXISTS "chamado_select_own_profile" ON public.profiles;
CREATE POLICY "chamado_select_own_profile" ON public.profiles
  FOR SELECT TO authenticated USING (
    get_user_role() = 'chamado' AND id = auth.uid()
  );
