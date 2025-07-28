-- Create storage buckets for images

-- Create profile images bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create service images bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create service_images table to track service images
CREATE TABLE IF NOT EXISTS service_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_main BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one main image per service
  CONSTRAINT unique_main_image_per_service EXCLUDE USING btree (service_id WITH =) WHERE (is_main = true)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_service_images_service ON service_images(service_id);
CREATE INDEX IF NOT EXISTS idx_service_images_order ON service_images(service_id, display_order);

-- RLS Policies for profile-images bucket
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- RLS Policies for service-images bucket
CREATE POLICY "Anyone can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

CREATE POLICY "Providers can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-images' AND
  EXISTS (
    SELECT 1 FROM providers
    WHERE id::text = (storage.foldername(name))[2]
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their service images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-images' AND
  EXISTS (
    SELECT 1 FROM providers
    WHERE id::text = (storage.foldername(name))[2]
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete their service images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-images' AND
  EXISTS (
    SELECT 1 FROM providers
    WHERE id::text = (storage.foldername(name))[2]
    AND user_id = auth.uid()
  )
);

-- RLS Policies for service_images table
ALTER TABLE service_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service images"
ON service_images FOR SELECT
USING (true);

CREATE POLICY "Providers can insert service images"
ON service_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM services s
    JOIN providers p ON s.provider_id = p.id
    WHERE s.id = service_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their service images"
ON service_images FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM services s
    JOIN providers p ON s.provider_id = p.id
    WHERE s.id = service_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete their service images"
ON service_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM services s
    JOIN providers p ON s.provider_id = p.id
    WHERE s.id = service_id
    AND p.user_id = auth.uid()
  )
);

-- Add main_image_url column to services if it doesn't exist
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS main_image_url TEXT;

-- Function to update service main image when service_images changes
CREATE OR REPLACE FUNCTION update_service_main_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_main = true THEN
    UPDATE services
    SET main_image_url = NEW.image_url
    WHERE id = NEW.service_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_service_main_image_trigger
AFTER INSERT OR UPDATE ON service_images
FOR EACH ROW
WHEN (NEW.is_main = true)
EXECUTE FUNCTION update_service_main_image();