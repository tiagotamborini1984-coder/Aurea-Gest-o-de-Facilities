-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Allow authenticated full access on companies"
  ON public.companies FOR ALL TO authenticated USING (true);

-- Update employees table
ALTER TABLE public.employees
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
