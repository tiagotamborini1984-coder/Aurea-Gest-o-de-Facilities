-- Add configuration column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS package_alert_days INTEGER NOT NULL DEFAULT 3;

-- Create package_types table
CREATE TABLE IF NOT EXISTS public.package_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for package_types
ALTER TABLE public.package_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on package_types" 
  ON public.package_types FOR ALL TO authenticated USING (true);

-- Create packages table
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
    package_type_id UUID REFERENCES public.package_types(id) ON DELETE SET NULL,
    protocol_number TEXT NOT NULL,
    arrival_date DATE NOT NULL,
    sender TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    tracking_code TEXT,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'Aguardando Retirada',
    delivery_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, protocol_number)
);

-- Enable RLS for packages
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on packages" 
  ON public.packages FOR ALL TO authenticated USING (true);

-- Seed default package types for all existing clients
DO $$
DECLARE
    client_record RECORD;
BEGIN
    FOR client_record IN SELECT id FROM public.clients LOOP
        INSERT INTO public.package_types (client_id, name) VALUES
        (client_record.id, 'Caixa Pequena'),
        (client_record.id, 'Caixa Média'),
        (client_record.id, 'Caixa Grande'),
        (client_record.id, 'Envelope');
    END LOOP;
END $$;
