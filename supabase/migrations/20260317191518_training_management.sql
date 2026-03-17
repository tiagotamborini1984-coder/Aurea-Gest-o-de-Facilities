-- Migration to add Training Management Module

CREATE TABLE public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.function_required_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  function_id UUID NOT NULL REFERENCES public.functions(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  UNIQUE(function_id, training_id)
);

CREATE TABLE public.employee_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  completion_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, training_id)
);

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_required_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_training_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on trainings" ON public.trainings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on function_required_trainings" ON public.function_required_trainings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access on employee_training_records" ON public.employee_training_records FOR ALL TO authenticated USING (true);

-- Setup Storage Bucket for Training Documents
INSERT INTO storage.buckets (id, name, public) VALUES ('training-documents', 'training-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated read training-documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'training-documents');
CREATE POLICY "Allow authenticated insert training-documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'training-documents');
CREATE POLICY "Allow authenticated update training-documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'training-documents');
CREATE POLICY "Allow authenticated delete training-documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'training-documents');
