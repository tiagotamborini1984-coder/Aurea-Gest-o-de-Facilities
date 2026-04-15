CREATE TABLE IF NOT EXISTS property_cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  daily_rate NUMERIC NOT NULL DEFAULT 0,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cost_center_id UUID REFERENCES property_cost_centers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES property_rooms(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES property_guests(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Confirmada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE property_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_reservations ENABLE ROW LEVEL SECURITY;

DO $DO$
BEGIN
  -- cost_centers
  DROP POLICY IF EXISTS "tenant_isolation_property_cost_centers" ON property_cost_centers;
  CREATE POLICY "tenant_isolation_property_cost_centers" ON property_cost_centers FOR ALL TO authenticated
  USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

  -- properties
  DROP POLICY IF EXISTS "tenant_isolation_properties" ON properties;
  CREATE POLICY "tenant_isolation_properties" ON properties FOR ALL TO authenticated
  USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

  -- property_rooms
  DROP POLICY IF EXISTS "tenant_isolation_property_rooms" ON property_rooms;
  CREATE POLICY "tenant_isolation_property_rooms" ON property_rooms FOR ALL TO authenticated
  USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

  -- property_guests
  DROP POLICY IF EXISTS "tenant_isolation_property_guests" ON property_guests;
  CREATE POLICY "tenant_isolation_property_guests" ON property_guests FOR ALL TO authenticated
  USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());

  -- property_reservations
  DROP POLICY IF EXISTS "tenant_isolation_property_reservations" ON property_reservations;
  CREATE POLICY "tenant_isolation_property_reservations" ON property_reservations FOR ALL TO authenticated
  USING (get_user_role() = 'Master' OR client_id = get_user_client_id())
  WITH CHECK (get_user_role() = 'Master' OR client_id = get_user_client_id());
END $DO$;

-- Seed Data
DO $DO$
DECLARE
  v_client_id UUID;
  v_prop_id UUID;
  v_room_id UUID;
  v_cc_id UUID;
  v_guest_id UUID;
BEGIN
  SELECT id INTO v_client_id FROM clients LIMIT 1;
  
  IF v_client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM properties WHERE name = 'Residencial Aurea') THEN
    INSERT INTO property_cost_centers (client_id, name) VALUES (v_client_id, 'Diretoria') RETURNING id INTO v_cc_id;
    
    INSERT INTO properties (client_id, name, city, address, description, daily_rate, photos) 
    VALUES (v_client_id, 'Residencial Aurea', 'São Paulo', 'Rua Central, 100', 'Apartamento executivo padrão premium', 350.00, '["https://img.usecurling.com/p/800/600?q=apartment", "https://img.usecurling.com/p/800/600?q=living%20room"]'::jsonb) 
    RETURNING id INTO v_prop_id;
    
    INSERT INTO property_rooms (client_id, property_id, name, capacity) VALUES (v_client_id, v_prop_id, 'Quarto 1 - Suíte Master', 2) RETURNING id INTO v_room_id;
    INSERT INTO property_rooms (client_id, property_id, name, capacity) VALUES (v_client_id, v_prop_id, 'Quarto 2 - Solteiro', 1);
    
    INSERT INTO property_guests (client_id, name, email, phone, cost_center_id) VALUES (v_client_id, 'Carlos Silveira', 'carlos@exemplo.com', '11999999999', v_cc_id) RETURNING id INTO v_guest_id;
    
    INSERT INTO property_reservations (client_id, property_id, room_id, guest_id, check_in_date, check_out_date, total_amount, status)
    VALUES (v_client_id, v_prop_id, v_room_id, v_guest_id, CURRENT_DATE, CURRENT_DATE + INTERVAL '4 days', 1400.00, 'Confirmada');
  END IF;
END $DO$;
