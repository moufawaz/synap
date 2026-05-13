-- Make progress-photos bucket private and add signed URL access policies
-- This replaces the public bucket setup from supabase-additions.sql

-- Update bucket to private
UPDATE storage.buckets
SET public = false
WHERE id = 'progress-photos';

-- Drop old public read policies
DROP POLICY IF EXISTS "Users can view own photos"       ON storage.objects;
DROP POLICY IF EXISTS "Anon can view all photos"        ON storage.objects;
DROP POLICY IF EXISTS "Public can view progress photos" ON storage.objects;

-- Users can upload only to their own folder
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/delete only their own photos
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can SELECT (needed for createSignedUrl) only their own photos
DROP POLICY IF EXISTS "Users can select own photos" ON storage.objects;
CREATE POLICY "Users can select own photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
