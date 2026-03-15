-- Create clients table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url_slug TEXT UNIQUE NOT NULL,
    admin_name TEXT NOT NULL DEFAULT '',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#1e293b',
    secondary_color TEXT DEFAULT '#0ea5e9',
    status TEXT NOT NULL DEFAULT 'Ativo',
    modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage clients
CREATE POLICY "Allow authenticated full access on clients" 
  ON public.clients FOR ALL TO authenticated USING (true);

-- Create logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket policies
CREATE POLICY "Logos are publicly accessible" 
  ON storage.objects FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Users can upload logos" 
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update logos" 
  ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete logos" 
  ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Seed Admin User
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current,
    phone, phone_change, phone_change_token, reauthentication_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@aurea.com',
    crypt('admin123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Master User"}',
    false, 'authenticated', 'authenticated',
    '', '', '', '', '',
    NULL, '', '', ''
  );
END $$;
