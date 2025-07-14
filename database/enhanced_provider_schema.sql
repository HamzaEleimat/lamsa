-- Enhanced Provider Schema with Missing Fields
-- This file adds comprehensive provider profile fields for the Jordan market

-- Add missing fields to providers table
ALTER TABLE providers ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS awards JSONB DEFAULT '[]'::jsonb;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS specializations JSONB DEFAULT '[]'::jsonb;

-- Business information
ALTER TABLE providers ADD COLUMN IF NOT EXISTS established_year INTEGER;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS team_size INTEGER;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS languages_spoken JSONB DEFAULT '["ar", "en"]'::jsonb;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS payment_methods_accepted JSONB DEFAULT '["cash", "card"]'::jsonb;

-- Marketing and visibility
ALTER TABLE providers ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(200) UNIQUE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS meta_description_en TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS meta_description_ar TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS boost_score INTEGER DEFAULT 0;

-- Operational details
ALTER TABLE providers ADD COLUMN IF NOT EXISTS minimum_booking_notice_hours INTEGER DEFAULT 2;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS maximum_advance_booking_days INTEGER DEFAULT 30;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS cancellation_policy_en TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS cancellation_policy_ar TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS deposit_percentage DECIMAL(5,2) DEFAULT 0.00;

-- Contact and accessibility
ALTER TABLE providers ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(100);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS accessibility_features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT FALSE;

-- Create provider-service categories many-to-many relationship
CREATE TABLE IF NOT EXISTS provider_service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    expertise_level INTEGER DEFAULT 1 CHECK (expertise_level BETWEEN 1 AND 5),
    years_experience INTEGER DEFAULT 0,
    certification_url TEXT,
    portfolio_images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, category_id)
);

-- Create provider gallery table for comprehensive image management
CREATE TABLE IF NOT EXISTS provider_gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('portfolio', 'salon_interior', 'before_after', 'certificates', 'team')),
    title VARCHAR(200),
    title_ar VARCHAR(200),
    description TEXT,
    description_ar TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced working hours table for Jordan's Friday-Saturday weekend
DROP TABLE IF EXISTS provider_working_hours CASCADE;
CREATE TABLE provider_working_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    is_working_day BOOLEAN DEFAULT TRUE,
    shifts JSONB DEFAULT '[]'::jsonb, -- Array of shift objects
    special_notes TEXT,
    special_notes_ar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, day_of_week)
);

-- Provider special schedules for holidays and seasonal changes
CREATE TABLE IF NOT EXISTS provider_special_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    schedule_type VARCHAR(50) NOT NULL, -- 'ramadan', 'holiday', 'temporary'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    working_hours JSONB NOT NULL, -- Same structure as regular working hours
    name_en VARCHAR(200),
    name_ar VARCHAR(200),
    description_en TEXT,
    description_ar TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_providers_seo_slug ON providers(seo_slug) WHERE seo_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_providers_featured ON providers(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_providers_boost_score ON providers(boost_score) WHERE boost_score > 0;
CREATE INDEX IF NOT EXISTS idx_providers_business_type_city ON providers(business_type, city);
CREATE INDEX IF NOT EXISTS idx_provider_service_categories_provider ON provider_service_categories(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_service_categories_category ON provider_service_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_provider_service_categories_primary ON provider_service_categories(provider_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_provider_gallery_provider ON provider_gallery(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_gallery_category ON provider_gallery(provider_id, category);
CREATE INDEX IF NOT EXISTS idx_provider_gallery_active ON provider_gallery(provider_id, is_active);
CREATE INDEX IF NOT EXISTS idx_provider_working_hours_provider ON provider_working_hours(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_special_schedules_provider ON provider_special_schedules(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_special_schedules_dates ON provider_special_schedules(start_date, end_date, is_active);

-- Create triggers for updated_at columns
CREATE TRIGGER update_provider_service_categories_updated_at 
    BEFORE UPDATE ON provider_service_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_gallery_updated_at 
    BEFORE UPDATE ON provider_gallery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_working_hours_updated_at 
    BEFORE UPDATE ON provider_working_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_special_schedules_updated_at 
    BEFORE UPDATE ON provider_special_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate SEO-friendly slug
CREATE OR REPLACE FUNCTION generate_provider_slug(business_name TEXT, city TEXT, provider_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 1;
BEGIN
    -- Transliterate Arabic to Latin and clean up
    base_slug := lower(regexp_replace(
        regexp_replace(business_name, '[^a-zA-Z0-9\u0600-\u06FF\s]', '', 'g'),
        '\s+', '-', 'g'
    ));
    
    -- Add city for uniqueness
    base_slug := base_slug || '-' || lower(regexp_replace(city, '\s+', '-', 'g'));
    
    -- Ensure uniqueness
    final_slug := base_slug;
    WHILE EXISTS (
        SELECT 1 FROM providers 
        WHERE seo_slug = final_slug 
        AND (provider_id IS NULL OR id != provider_id)
    ) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_slug;
END;
$$;

-- Function to get provider working hours for a specific date (handles special schedules)
CREATE OR REPLACE FUNCTION get_provider_working_hours(
    p_provider_id UUID,
    p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_day_of_week INTEGER;
    v_working_hours JSONB;
    v_special_schedule JSONB;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Check for special schedule first
    SELECT working_hours INTO v_special_schedule
    FROM provider_special_schedules
    WHERE provider_id = p_provider_id
    AND start_date <= p_date
    AND end_date >= p_date
    AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_special_schedule IS NOT NULL THEN
        RETURN v_special_schedule->(v_day_of_week::TEXT);
    END IF;
    
    -- Get regular working hours
    SELECT COALESCE(shifts, '[]'::jsonb) INTO v_working_hours
    FROM provider_working_hours
    WHERE provider_id = p_provider_id
    AND day_of_week = v_day_of_week
    AND is_working_day = TRUE;
    
    RETURN COALESCE(v_working_hours, '[]'::jsonb);
END;
$$;

-- Function to initialize default Jordan working hours for a provider
CREATE OR REPLACE FUNCTION initialize_jordan_working_hours(p_provider_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert default Jordan working schedule (Friday-Saturday weekend)
    INSERT INTO provider_working_hours (provider_id, day_of_week, is_working_day, shifts)
    VALUES
        -- Sunday (working day)
        (p_provider_id, 0, TRUE, '[{"startTime": "09:00", "endTime": "18:00", "breakStart": "13:00", "breakEnd": "14:00"}]'::jsonb),
        -- Monday (working day)
        (p_provider_id, 1, TRUE, '[{"startTime": "09:00", "endTime": "18:00", "breakStart": "13:00", "breakEnd": "14:00"}]'::jsonb),
        -- Tuesday (working day)
        (p_provider_id, 2, TRUE, '[{"startTime": "09:00", "endTime": "18:00", "breakStart": "13:00", "breakEnd": "14:00"}]'::jsonb),
        -- Wednesday (working day)
        (p_provider_id, 3, TRUE, '[{"startTime": "09:00", "endTime": "18:00", "breakStart": "13:00", "breakEnd": "14:00"}]'::jsonb),
        -- Thursday (working day)
        (p_provider_id, 4, TRUE, '[{"startTime": "09:00", "endTime": "18:00", "breakStart": "13:00", "breakEnd": "14:00"}]'::jsonb),
        -- Friday (weekend)
        (p_provider_id, 5, FALSE, '[]'::jsonb),
        -- Saturday (weekend)
        (p_provider_id, 6, FALSE, '[]'::jsonb)
    ON CONFLICT (provider_id, day_of_week) DO NOTHING;
END;
$$;

-- Function to update provider profile completion percentage
CREATE OR REPLACE FUNCTION calculate_enhanced_profile_completion(p_provider_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_completion_score INTEGER := 0;
    v_provider RECORD;
    v_gallery_count INTEGER;
    v_working_hours_count INTEGER;
    v_categories_count INTEGER;
BEGIN
    -- Get provider data
    SELECT * INTO v_provider
    FROM providers
    WHERE id = p_provider_id;
    
    IF v_provider IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Basic information (40 points)
    IF v_provider.business_name IS NOT NULL AND length(trim(v_provider.business_name)) > 0 THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    IF v_provider.business_name_ar IS NOT NULL AND length(trim(v_provider.business_name_ar)) > 0 THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    IF v_provider.phone IS NOT NULL THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    IF v_provider.email IS NOT NULL THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    IF v_provider.location IS NOT NULL THEN
        v_completion_score := v_completion_score + 10;
    END IF;
    IF v_provider.address IS NOT NULL AND length(trim(v_provider.address)) > 0 THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    IF v_provider.bio IS NOT NULL AND length(trim(v_provider.bio)) > 0 THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    
    -- Profile enhancement (30 points)
    IF v_provider.avatar_url IS NOT NULL THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    IF v_provider.cover_image_url IS NOT NULL THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    IF v_provider.years_of_experience IS NOT NULL AND v_provider.years_of_experience > 0 THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    IF v_provider.specializations IS NOT NULL AND jsonb_array_length(v_provider.specializations) > 0 THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    IF v_provider.certifications IS NOT NULL AND jsonb_array_length(v_provider.certifications) > 0 THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    IF v_provider.social_media IS NOT NULL AND jsonb_array_length(v_provider.social_media) > 0 THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    
    -- Working hours (10 points)
    SELECT COUNT(*) INTO v_working_hours_count
    FROM provider_working_hours
    WHERE provider_id = p_provider_id AND is_working_day = TRUE;
    
    IF v_working_hours_count >= 3 THEN
        v_completion_score := v_completion_score + 10;
    ELSIF v_working_hours_count > 0 THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    
    -- Service categories (10 points)
    SELECT COUNT(*) INTO v_categories_count
    FROM provider_service_categories
    WHERE provider_id = p_provider_id;
    
    IF v_categories_count >= 2 THEN
        v_completion_score := v_completion_score + 10;
    ELSIF v_categories_count > 0 THEN
        v_completion_score := v_completion_score + 5;
    END IF;
    
    -- Gallery images (10 points)
    SELECT COUNT(*) INTO v_gallery_count
    FROM provider_gallery
    WHERE provider_id = p_provider_id AND is_active = TRUE;
    
    IF v_gallery_count >= 5 THEN
        v_completion_score := v_completion_score + 10;
    ELSIF v_gallery_count >= 2 THEN
        v_completion_score := v_completion_score + 5;
    ELSIF v_gallery_count > 0 THEN
        v_completion_score := v_completion_score + 2;
    END IF;
    
    -- Update the provider record
    UPDATE providers 
    SET profile_completion_percentage = v_completion_score
    WHERE id = p_provider_id;
    
    RETURN v_completion_score;
END;
$$;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Enhanced provider schema with Jordan-specific features created successfully!';
END$$;
