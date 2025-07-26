-- Fix Missing Tables for Lamsa Mobile App
-- Run this script in your Supabase SQL editor

-- Add user_id column to providers table if it doesn't exist
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);

-- Update existing providers to link with users based on email
UPDATE providers p
SET user_id = u.id
FROM users u
WHERE p.email = u.email
AND p.user_id IS NULL;

-- Create service_tags table for tagging services
CREATE TABLE IF NOT EXISTS service_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en VARCHAR(50) NOT NULL,
  name_ar VARCHAR(50) NOT NULL,
  color_hex VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name_en),
  UNIQUE(name_ar)
);

-- Create junction table for many-to-many relationship between services and tags
CREATE TABLE IF NOT EXISTS service_service_tags (
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES service_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (service_id, tag_id)
);

-- Create indexes for the junction table
CREATE INDEX IF NOT EXISTS idx_service_service_tags_service ON service_service_tags(service_id);
CREATE INDEX IF NOT EXISTS idx_service_service_tags_tag ON service_service_tags(tag_id);

-- Insert some default service tags
INSERT INTO service_tags (name_en, name_ar, color_hex) VALUES
('Premium', 'مميز', '#FFD700'),
('Express', 'سريع', '#FF6B6B'),
('Organic', 'عضوي', '#4ECB71'),
('Bridal', 'عرائس', '#FF1493'),
('Men', 'رجال', '#4169E1'),
('Kids', 'أطفال', '#FFA500'),
('Home Service', 'خدمة منزلية', '#9B59B6')
ON CONFLICT (name_en) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE service_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_service_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_tags (public read)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view service tags" ON service_tags;
DROP POLICY IF EXISTS "Providers can create service tags" ON service_tags;
DROP POLICY IF EXISTS "Providers can update service tags" ON service_tags;
DROP POLICY IF EXISTS "Providers can delete service tags" ON service_tags;

CREATE POLICY "Anyone can view service tags"
ON service_tags FOR SELECT
USING (true);

-- RLS Policies for service_service_tags
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view service tag associations" ON service_service_tags;
DROP POLICY IF EXISTS "Providers can manage their service tags" ON service_service_tags;

CREATE POLICY "Anyone can view service tag associations"
ON service_service_tags FOR SELECT
USING (true);

CREATE POLICY "Providers can manage their service tags"
ON service_service_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM services s
    JOIN providers p ON s.provider_id = p.id
    WHERE s.id = service_service_tags.service_id
    AND p.user_id = auth.uid()
  )
);

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp triggers for new tables
DROP TRIGGER IF EXISTS update_service_tags_updated_at ON service_tags;
CREATE TRIGGER update_service_tags_updated_at BEFORE UPDATE ON service_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE service_tags IS 'Tags that can be applied to services for categorization and filtering';
COMMENT ON TABLE service_service_tags IS 'Junction table linking services to their tags';
COMMENT ON COLUMN providers.user_id IS 'Reference to the user account that owns this provider profile';