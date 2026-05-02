-- ── InBody scan support ────────────────────────────────────────
-- Run this in Supabase SQL Editor

-- 1. Add inbody_url column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inbody_url TEXT;

-- 2. Create inbody-scans storage bucket (public, authenticated upload only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('inbody-scans', 'inbody-scans', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policy: users can upload their own InBody scans
CREATE POLICY "Users can upload own inbody scans"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inbody-scans'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Storage policy: users can view their own (public bucket serves all reads)
CREATE POLICY "InBody scans are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inbody-scans');

-- 5. Storage policy: users can update/replace their own scans
CREATE POLICY "Users can update own inbody scans"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inbody-scans'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
