-- ============================================================
-- Step 3 (Storage): Create progress-photos bucket
-- Run AFTER the main schema migration
-- ============================================================

-- Create the bucket (idempotent — will error if already exists, safe to ignore)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  false,                              -- private bucket
  5242880,                            -- 5 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket
DROP POLICY IF EXISTS "progress_photos_upload_own" ON storage.objects;
CREATE POLICY "progress_photos_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "progress_photos_select_own" ON storage.objects;
CREATE POLICY "progress_photos_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "progress_photos_delete_own" ON storage.objects;
CREATE POLICY "progress_photos_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
