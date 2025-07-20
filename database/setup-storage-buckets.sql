-- Setup Supabase Storage Buckets for Lamsa
-- Run this in Supabase SQL Editor to create the required storage buckets

-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('services', 'services', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('reviews', 'reviews', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('certificates', 'certificates', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create RLS policies for services bucket
CREATE POLICY "Service images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'services');

CREATE POLICY "Providers can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'services' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Providers can update their service images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'services' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Providers can delete their service images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'services' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create RLS policies for reviews bucket
CREATE POLICY "Review images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'reviews');

CREATE POLICY "Users can upload review images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reviews' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create RLS policies for certificates bucket
CREATE POLICY "Certificate images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates');

CREATE POLICY "Providers can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificates' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Providers can update their certificates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'certificates' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Providers can delete their certificates"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'certificates' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create helper function to get user's images
CREATE OR REPLACE FUNCTION get_user_images(user_id UUID, bucket_name TEXT)
RETURNS TABLE (
  name TEXT,
  url TEXT,
  created_at TIMESTAMPTZ,
  size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    storage.objects.name,
    CONCAT(
      current_setting('app.settings.supabase_url', true),
      '/storage/v1/object/public/',
      bucket_name,
      '/',
      storage.objects.name
    ) as url,
    storage.objects.created_at,
    storage.objects.metadata->>'size' as size
  FROM storage.objects
  WHERE 
    bucket_id = bucket_name 
    AND (storage.foldername(name))[1] = user_id::text
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;