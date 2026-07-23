-- Fix storage policies for maintenance_attachments bucket
-- Previous migrations reused the "Public Access" policy name for other buckets,
-- which dropped the maintenance_attachments SELECT policy via DROP POLICY IF EXISTS.
-- This migration recreates the policies with unique, bucket-specific names.

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('maintenance_attachments', 'maintenance_attachments', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access for maintenance_attachments
DROP POLICY IF EXISTS "maintenance_attachments_public_select" ON storage.objects;
CREATE POLICY "maintenance_attachments_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'maintenance_attachments');

-- Authenticated insert for maintenance_attachments
DROP POLICY IF EXISTS "maintenance_attachments_auth_insert" ON storage.objects;
CREATE POLICY "maintenance_attachments_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'maintenance_attachments');

-- Anon insert for maintenance_attachments (public form uploads)
DROP POLICY IF EXISTS "maintenance_attachments_anon_insert" ON storage.objects;
CREATE POLICY "maintenance_attachments_anon_insert" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'maintenance_attachments');

-- Authenticated update for maintenance_attachments
DROP POLICY IF EXISTS "maintenance_attachments_auth_update" ON storage.objects;
CREATE POLICY "maintenance_attachments_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'maintenance_attachments') WITH CHECK (bucket_id = 'maintenance_attachments');

-- Authenticated delete for maintenance_attachments
DROP POLICY IF EXISTS "maintenance_attachments_auth_delete" ON storage.objects;
CREATE POLICY "maintenance_attachments_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'maintenance_attachments');
