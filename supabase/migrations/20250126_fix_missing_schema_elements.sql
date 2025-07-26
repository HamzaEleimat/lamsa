-- ====================================================================
-- Fix Missing Schema Elements
-- Date: 2025-07-26
-- Description: Add missing columns and tables identified in runtime errors
-- ====================================================================

-- Add user_id column to providers table
-- This links providers to their user accounts for authentication
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);

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

-- Add foreign key relationship name for Supabase query builder
COMMENT ON CONSTRAINT service_service_tags_tag_id_fkey ON service_service_tags 
IS '@foreignFieldName tag';

-- Create service_variations table for service pricing variations
CREATE TABLE IF NOT EXISTS service_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT positive_variation_price CHECK (price > 0),
  CONSTRAINT positive_variation_duration CHECK (duration_minutes > 0)
);

-- Create index for service variations
CREATE INDEX IF NOT EXISTS idx_service_variations_service ON service_variations(service_id);

-- Update existing providers to link with users based on email
-- This is a one-time data migration
UPDATE providers p
SET user_id = u.id
FROM users u
WHERE p.email = u.email
AND p.user_id IS NULL;

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
ALTER TABLE service_variations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_tags (public read)
CREATE POLICY "Anyone can view service tags"
ON service_tags FOR SELECT
USING (true);

-- RLS Policies for service_service_tags
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

-- RLS Policies for service_variations
CREATE POLICY "Anyone can view service variations"
ON service_variations FOR SELECT
USING (true);

CREATE POLICY "Providers can manage their service variations"
ON service_variations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM services s
    JOIN providers p ON s.provider_id = p.id
    WHERE s.id = service_variations.service_id
    AND p.user_id = auth.uid()
  )
);

-- Update timestamp triggers for new tables
CREATE TRIGGER update_service_tags_updated_at BEFORE UPDATE ON service_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_variations_updated_at BEFORE UPDATE ON service_variations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE service_tags IS 'Tags that can be applied to services for categorization and filtering';
COMMENT ON TABLE service_service_tags IS 'Junction table linking services to their tags';
COMMENT ON TABLE service_variations IS 'Different variations of a service with different prices/durations';
COMMENT ON COLUMN providers.user_id IS 'Reference to the user account that owns this provider profile';