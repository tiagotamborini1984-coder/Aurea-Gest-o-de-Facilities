-- Fix storage policies for org_photos bucket
-- Drop existing policies if any to ensure idempotency
DROP POLICY IF EXISTS "org_photos_public_select" ON storage.objects;
DROP POLICY IF EXISTS "org_photos_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "org_photos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "org_photos_auth_delete" ON storage.objects;

-- Ensure org_photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('org_photos', 'org_photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public can read org_photos
CREATE POLICY "org_photos_public_select" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'org_photos');

-- Authenticated users can insert/upload into org_photos
CREATE POLICY "org_photos_auth_insert" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'org_photos');

-- Authenticated users can update objects in org_photos
CREATE POLICY "org_photos_auth_update" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'org_photos')
WITH CHECK (bucket_id = 'org_photos');

-- Authenticated users can delete objects in org_photos
CREATE POLICY "org_photos_auth_delete" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'org_photos');
