-- Marina Management System - Storage Bucket Setup
-- Run this in Supabase SQL Editor

-- =============================================
-- CREATE STORAGE BUCKET FOR VESSEL PHOTOS
-- =============================================

-- Create the bucket (run this in Supabase Dashboard > Storage > New Bucket)
-- Or use the SQL below:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vessel-photos',
  'vessel-photos',
  true,  -- Public bucket so images can be viewed
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vessel-photos'
);

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'vessel-photos')
WITH CHECK (bucket_id = 'vessel-photos');

-- Allow authenticated users to delete photos
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'vessel-photos');

-- Allow public read access to all photos
CREATE POLICY "Public read access to photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'vessel-photos');


-- =============================================
-- ALTERNATIVE: Manual Setup via Dashboard
-- =============================================
--
-- If the SQL above doesn't work, create the bucket manually:
--
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Name: vessel-photos
-- 4. Check "Public bucket"
-- 5. Click "Create bucket"
--
-- Then set policies:
-- 1. Click on the bucket > Policies
-- 2. Add policy for INSERT (authenticated users)
-- 3. Add policy for SELECT (public access)
-- =============================================
