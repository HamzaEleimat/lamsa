-- Service Management Enhanced Schema
-- This file adds comprehensive service management features for the BeautyCort platform
-- Designed specifically for the Jordan beauty market

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Service Tags Table
CREATE TABLE IF NOT EXISTS service_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en VARCHAR(50) NOT NULL,
    name_ar VARCHAR(50) NOT NULL,
    category VARCHAR(50), -- Optional category grouping for tags
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color for UI
    is_system BOOLEAN DEFAULT FALSE, -- System tags vs user-created
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name_en),
    UNIQUE(name_ar)
);

-- Service Variations Table (for gender-specific or style variations)
CREATE TABLE IF NOT EXISTS service_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name_en VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    price_modifier DECIMAL(10,2) DEFAULT 0.00, -- Can be positive or negative
    duration_modifier INTEGER DEFAULT 0, -- Additional minutes (can be negative)
    sort_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb, -- For additional attributes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Packages Table
CREATE TABLE IF NOT EXISTS service_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    name_en VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    package_type VARCHAR(50) DEFAULT 'bundle', -- bundle, subscription, promotional
    total_duration_minutes INTEGER NOT NULL,
    package_price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) NOT NULL, -- Sum of individual services
    discount_percentage DECIMAL(5,2) GENERATED ALWAYS AS 
        (CASE WHEN original_price > 0 
         THEN ((original_price - package_price) / original_price * 100)
         ELSE 0 END) STORED,
    valid_from DATE,
    valid_until DATE,
    max_bookings INTEGER, -- NULL for unlimited
    bookings_used INTEGER DEFAULT 0,
    image_url TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Package Services Junction Table
CREATE TABLE IF NOT EXISTS package_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1, -- For packages that include multiple sessions
    sequence_order INTEGER DEFAULT 0, -- Order of service in package
    is_optional BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(package_id, service_id)
);

-- Service Price History Table
CREATE TABLE IF NOT EXISTS service_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2) NOT NULL,
    change_reason VARCHAR(200),
    changed_by UUID REFERENCES providers(id),
    promotional BOOLEAN DEFAULT FALSE,
    promotion_end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Templates Table (Pre-defined services for quick setup)
CREATE TABLE IF NOT EXISTS service_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES service_categories(id),
    subcategory VARCHAR(100),
    name_en VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    typical_duration_minutes INTEGER,
    typical_price_min DECIMAL(10,2),
    typical_price_max DECIMAL(10,2),
    suggested_tags JSONB DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT FALSE,
    market_segment VARCHAR(50), -- 'budget', 'standard', 'premium', 'luxury'
    gender_specific VARCHAR(20), -- 'unisex', 'male', 'female'
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Tags Junction Table
CREATE TABLE IF NOT EXISTS service_service_tags (
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES service_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (service_id, tag_id)
);

-- Service Analytics Table
CREATE TABLE IF NOT EXISTS service_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views_count INTEGER DEFAULT 0,
    bookings_count INTEGER DEFAULT 0,
    revenue_total DECIMAL(10,2) DEFAULT 0.00,
    average_rating DECIMAL(3,2),
    cancellation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, date)
);

-- Add new columns to existing services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS member_price DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS express_price DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS home_service_price DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS preparation_time_minutes INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS cleanup_time_minutes INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER DEFAULT 30;
ALTER TABLE services ADD COLUMN IF NOT EXISTS min_advance_booking_hours INTEGER DEFAULT 2;
ALTER TABLE services ADD COLUMN IF NOT EXISTS requires_consultation BOOLEAN DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS allow_parallel_booking BOOLEAN DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS max_parallel_bookings INTEGER DEFAULT 1;
ALTER TABLE services ADD COLUMN IF NOT EXISTS gender_preference VARCHAR(20) DEFAULT 'unisex'; -- 'unisex', 'male', 'female'
ALTER TABLE services ADD COLUMN IF NOT EXISTS age_restrictions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS prerequisites TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS aftercare_instructions_en TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS aftercare_instructions_ar TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS seo_keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS boost_score INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_count INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS last_booked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_tags_category ON service_tags(category);
CREATE INDEX IF NOT EXISTS idx_service_tags_system ON service_tags(is_system);
CREATE INDEX IF NOT EXISTS idx_service_variations_service ON service_variations(service_id);
CREATE INDEX IF NOT EXISTS idx_service_variations_active ON service_variations(service_id, active);
CREATE INDEX IF NOT EXISTS idx_service_packages_provider ON service_packages(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_active ON service_packages(active, provider_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_featured ON service_packages(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_packages_valid_dates ON service_packages(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_package_services_package ON package_services(package_id);
CREATE INDEX IF NOT EXISTS idx_service_price_history_service ON service_price_history(service_id);
CREATE INDEX IF NOT EXISTS idx_service_price_history_date ON service_price_history(created_at);
CREATE INDEX IF NOT EXISTS idx_service_templates_category ON service_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_service_templates_popular ON service_templates(is_popular) WHERE is_popular = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_service_tags_service ON service_service_tags(service_id);
CREATE INDEX IF NOT EXISTS idx_service_service_tags_tag ON service_service_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_service_analytics_service_date ON service_analytics(service_id, date);
CREATE INDEX IF NOT EXISTS idx_services_featured ON services(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_gender ON services(gender_preference);
CREATE INDEX IF NOT EXISTS idx_services_popularity ON services(popularity_score);

-- Create update triggers for new tables
CREATE TRIGGER update_service_tags_updated_at 
    BEFORE UPDATE ON service_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_variations_updated_at 
    BEFORE UPDATE ON service_variations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_packages_updated_at 
    BEFORE UPDATE ON service_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_templates_updated_at 
    BEFORE UPDATE ON service_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_analytics_updated_at 
    BEFORE UPDATE ON service_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate service popularity score
CREATE OR REPLACE FUNCTION calculate_service_popularity_score(p_service_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_score INTEGER := 0;
    v_bookings_30d INTEGER;
    v_revenue_30d DECIMAL;
    v_avg_rating DECIMAL;
    v_views_30d INTEGER;
BEGIN
    -- Get metrics from last 30 days
    SELECT 
        COALESCE(SUM(bookings_count), 0),
        COALESCE(SUM(revenue_total), 0),
        COALESCE(AVG(average_rating), 0),
        COALESCE(SUM(views_count), 0)
    INTO v_bookings_30d, v_revenue_30d, v_avg_rating, v_views_30d
    FROM service_analytics
    WHERE service_id = p_service_id
    AND date >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Calculate score based on multiple factors
    v_score := v_score + (v_bookings_30d * 10); -- Weight bookings heavily
    v_score := v_score + (v_revenue_30d / 10)::INTEGER; -- Revenue contribution
    v_score := v_score + (v_avg_rating * 20)::INTEGER; -- Rating importance
    v_score := v_score + (v_views_30d / 5)::INTEGER; -- View engagement
    
    -- Update the service
    UPDATE services 
    SET popularity_score = v_score
    WHERE id = p_service_id;
    
    RETURN v_score;
END;
$$;

-- Function to validate service package
CREATE OR REPLACE FUNCTION validate_service_package()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_duration INTEGER := 0;
    v_total_price DECIMAL := 0;
BEGIN
    -- Calculate total duration and price from included services
    SELECT 
        COALESCE(SUM(s.duration_minutes * ps.quantity), 0),
        COALESCE(SUM(s.price * ps.quantity), 0)
    INTO v_total_duration, v_total_price
    FROM package_services ps
    JOIN services s ON s.id = ps.service_id
    WHERE ps.package_id = NEW.id;
    
    -- Update package with calculated values
    NEW.total_duration_minutes := v_total_duration;
    NEW.original_price := v_total_price;
    
    -- Validate package price is less than original
    IF NEW.package_price >= NEW.original_price THEN
        RAISE EXCEPTION 'Package price must be less than the sum of individual services';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for package validation
CREATE TRIGGER validate_package_before_save
    BEFORE INSERT OR UPDATE ON service_packages
    FOR EACH ROW EXECUTE FUNCTION validate_service_package();

-- Insert default service tags for Jordan market
INSERT INTO service_tags (name_en, name_ar, category, icon, color, is_system) VALUES
-- Service type tags
('Express', 'سريع', 'service_type', 'clock', '#FF6B6B', TRUE),
('Premium', 'مميز', 'service_type', 'star', '#FFD93D', TRUE),
('Luxury', 'فاخر', 'service_type', 'crown', '#6BCF7F', TRUE),
('Organic', 'عضوي', 'service_type', 'leaf', '#4ECDC4', TRUE),
('Natural', 'طبيعي', 'service_type', 'flower', '#95E1D3', TRUE),

-- Gender tags
('Women Only', 'نساء فقط', 'gender', 'woman', '#FF6B9D', TRUE),
('Men Only', 'رجال فقط', 'gender', 'man', '#4834D4', TRUE),
('Unisex', 'للجنسين', 'gender', 'people', '#7B68EE', TRUE),
('Kids', 'أطفال', 'gender', 'child', '#FEC868', TRUE),

-- Occasion tags
('Bridal', 'عرائس', 'occasion', 'heart', '#E84393', TRUE),
('Party', 'حفلات', 'occasion', 'celebration', '#9B59B6', TRUE),
('Graduation', 'تخرج', 'occasion', 'graduation', '#3498DB', TRUE),
('Eid Special', 'عروض العيد', 'occasion', 'moon', '#1ABC9C', TRUE),
('Ramadan', 'رمضان', 'occasion', 'crescent', '#16A085', TRUE),

-- Service features
('Home Service', 'خدمة منزلية', 'feature', 'home', '#E74C3C', TRUE),
('Group Booking', 'حجز جماعي', 'feature', 'group', '#F39C12', TRUE),
('24/7 Available', 'متاح 24/7', 'feature', 'clock-24', '#27AE60', TRUE),
('Appointment Only', 'بموعد مسبق', 'feature', 'calendar', '#8E44AD', TRUE),
('Walk-in', 'بدون موعد', 'feature', 'walk', '#34495E', TRUE)
ON CONFLICT (name_en) DO NOTHING;

-- Insert service templates for Jordan market
INSERT INTO service_templates (
    category_id, subcategory, name_en, name_ar, 
    description_en, description_ar,
    typical_duration_minutes, typical_price_min, typical_price_max,
    suggested_tags, is_popular, market_segment, gender_specific
) 
SELECT 
    sc.id,
    st.subcategory,
    st.name_en,
    st.name_ar,
    st.description_en,
    st.description_ar,
    st.typical_duration_minutes,
    st.typical_price_min,
    st.typical_price_max,
    st.suggested_tags,
    st.is_popular,
    st.market_segment,
    st.gender_specific
FROM service_categories sc
CROSS JOIN (VALUES
    -- Hair Services
    ('Hair Styling', 'basic', 'Men''s Haircut', 'قص شعر رجالي', 
     'Professional men''s haircut and styling', 'قص شعر احترافي للرجال',
     30, 5, 15, '["Men Only", "Express"]'::jsonb, TRUE, 'standard', 'male'),
    
    ('Hair Styling', 'basic', 'Women''s Haircut', 'قص شعر نسائي',
     'Professional women''s haircut and styling', 'قص شعر احترافي للنساء',
     45, 15, 35, '["Women Only"]'::jsonb, TRUE, 'standard', 'female'),
    
    ('Hair Styling', 'coloring', 'Hair Coloring', 'صبغة شعر',
     'Professional hair coloring service', 'خدمة صبغ الشعر الاحترافية',
     120, 30, 100, '["Premium", "Women Only"]'::jsonb, TRUE, 'premium', 'female'),
    
    ('Hair Styling', 'treatment', 'Protein Treatment', 'بروتين',
     'Hair protein treatment for smooth and healthy hair', 'علاج البروتين للشعر الناعم والصحي',
     180, 100, 300, '["Luxury", "Women Only"]'::jsonb, TRUE, 'luxury', 'female'),
    
    ('Hair Styling', 'treatment', 'Keratin Treatment', 'كيراتين',
     'Professional keratin treatment', 'علاج الكيراتين الاحترافي',
     180, 120, 350, '["Luxury", "Women Only"]'::jsonb, TRUE, 'luxury', 'female'),
    
    -- Makeup Services
    ('Makeup', 'bridal', 'Bridal Makeup', 'مكياج عروس',
     'Complete bridal makeup service', 'خدمة مكياج العروس الكاملة',
     90, 100, 500, '["Bridal", "Luxury", "Women Only"]'::jsonb, TRUE, 'luxury', 'female'),
    
    ('Makeup', 'party', 'Party Makeup', 'مكياج سهرة',
     'Evening and party makeup', 'مكياج المساء والحفلات',
     60, 30, 80, '["Party", "Women Only"]'::jsonb, TRUE, 'premium', 'female'),
    
    ('Makeup', 'daily', 'Daily Makeup', 'مكياج يومي',
     'Natural daily makeup look', 'مكياج يومي طبيعي',
     45, 20, 50, '["Express", "Women Only"]'::jsonb, FALSE, 'standard', 'female'),
    
    -- Nails Services
    ('Nails', 'manicure', 'Classic Manicure', 'مانيكير كلاسيكي',
     'Classic manicure service', 'خدمة مانيكير كلاسيكية',
     45, 10, 25, '["Women Only"]'::jsonb, TRUE, 'standard', 'female'),
    
    ('Nails', 'pedicure', 'Classic Pedicure', 'باديكير كلاسيكي',
     'Classic pedicure service', 'خدمة باديكير كلاسيكية',
     60, 15, 30, '["Women Only"]'::jsonb, TRUE, 'standard', 'female'),
    
    ('Nails', 'extensions', 'Gel Extensions', 'تركيب أظافر جل',
     'Gel nail extensions', 'تركيب أظافر جل',
     90, 30, 60, '["Premium", "Women Only"]'::jsonb, TRUE, 'premium', 'female'),
    
    -- Skincare Services
    ('Skincare', 'facial', 'Deep Cleansing Facial', 'تنظيف بشرة عميق',
     'Deep cleansing facial treatment', 'علاج تنظيف البشرة العميق',
     60, 25, 50, '["Unisex"]'::jsonb, TRUE, 'standard', 'unisex'),
    
    ('Skincare', 'facial', 'Hydrafacial', 'هايدرا فيشل',
     'Advanced hydrafacial treatment', 'علاج هايدرا فيشل المتقدم',
     75, 50, 100, '["Luxury", "Unisex"]'::jsonb, TRUE, 'luxury', 'unisex'),
    
    -- Traditional Services
    ('Skincare', 'traditional', 'Moroccan Bath', 'حمام مغربي',
     'Traditional Moroccan bath experience', 'تجربة الحمام المغربي التقليدي',
     90, 30, 60, '["Traditional", "Women Only"]'::jsonb, TRUE, 'premium', 'female'),
    
    ('Eyebrows & Lashes', 'threading', 'Eyebrow Threading', 'خيط حواجب',
     'Professional eyebrow threading', 'خيط حواجب احترافي',
     15, 3, 10, '["Express", "Women Only"]'::jsonb, TRUE, 'budget', 'female'),
    
    ('Eyebrows & Lashes', 'henna', 'Henna Brows', 'حنة حواجب',
     'Natural henna for eyebrows', 'حنة طبيعية للحواجب',
     30, 10, 20, '["Natural", "Women Only"]'::jsonb, TRUE, 'standard', 'female'),
    
    -- Massage Services
    ('Massage', 'relaxation', 'Swedish Massage', 'مساج سويدي',
     'Relaxing Swedish massage', 'مساج سويدي للاسترخاء',
     60, 30, 60, '["Unisex", "Premium"]'::jsonb, TRUE, 'premium', 'unisex'),
    
    ('Massage', 'therapeutic', 'Deep Tissue Massage', 'مساج الأنسجة العميقة',
     'Therapeutic deep tissue massage', 'مساج علاجي للأنسجة العميقة',
     60, 40, 80, '["Unisex", "Premium"]'::jsonb, FALSE, 'premium', 'unisex')
) AS st(category_name, subcategory, name_en, name_ar, description_en, description_ar, 
        typical_duration_minutes, typical_price_min, typical_price_max, 
        suggested_tags, is_popular, market_segment, gender_specific)
WHERE sc.name_en = st.category_name;

-- Create view for service search with all details
CREATE OR REPLACE VIEW service_search_view AS
SELECT 
    s.id,
    s.provider_id,
    s.category_id,
    s.name_en,
    s.name_ar,
    s.description_en,
    s.description_ar,
    s.price,
    s.duration_minutes,
    s.active,
    s.gender_preference,
    s.popularity_score,
    s.booking_count,
    s.featured_until,
    p.business_name,
    p.business_name_ar,
    p.location,
    p.city,
    p.rating as provider_rating,
    p.verified as provider_verified,
    sc.name_en as category_name_en,
    sc.name_ar as category_name_ar,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', st.id,
                'name_en', st.name_en,
                'name_ar', st.name_ar,
                'color', st.color
            )
        ) FILTER (WHERE st.id IS NOT NULL), 
        '[]'
    ) as tags,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', sv.id,
                'name_en', sv.name_en,
                'name_ar', sv.name_ar,
                'price_modifier', sv.price_modifier,
                'duration_modifier', sv.duration_modifier
            )
        ) FILTER (WHERE sv.id IS NOT NULL AND sv.active = TRUE), 
        '[]'
    ) as variations
FROM services s
JOIN providers p ON p.id = s.provider_id
JOIN service_categories sc ON sc.id = s.category_id
LEFT JOIN service_service_tags sst ON sst.service_id = s.id
LEFT JOIN service_tags st ON st.id = sst.tag_id
LEFT JOIN service_variations sv ON sv.service_id = s.id
WHERE s.active = TRUE AND p.active = TRUE AND p.verified = TRUE
GROUP BY s.id, p.id, sc.id;

-- Function to duplicate a service
CREATE OR REPLACE FUNCTION duplicate_service(
    p_service_id UUID,
    p_new_name_en VARCHAR(200) DEFAULT NULL,
    p_new_name_ar VARCHAR(200) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_service_id UUID;
    v_service RECORD;
BEGIN
    -- Get original service
    SELECT * INTO v_service
    FROM services
    WHERE id = p_service_id;
    
    IF v_service IS NULL THEN
        RAISE EXCEPTION 'Service not found';
    END IF;
    
    -- Create new service
    INSERT INTO services (
        provider_id, category_id,
        name_en, name_ar,
        description_en, description_ar,
        price, duration_minutes,
        base_price, member_price, express_price, home_service_price,
        preparation_time_minutes, cleanup_time_minutes,
        max_advance_booking_days, min_advance_booking_hours,
        requires_consultation, allow_parallel_booking, max_parallel_bookings,
        gender_preference, age_restrictions, prerequisites,
        aftercare_instructions_en, aftercare_instructions_ar,
        seo_keywords, image_urls, video_url,
        active
    )
    VALUES (
        v_service.provider_id, v_service.category_id,
        COALESCE(p_new_name_en, v_service.name_en || ' (Copy)'),
        COALESCE(p_new_name_ar, v_service.name_ar || ' (نسخة)'),
        v_service.description_en, v_service.description_ar,
        v_service.price, v_service.duration_minutes,
        v_service.base_price, v_service.member_price, 
        v_service.express_price, v_service.home_service_price,
        v_service.preparation_time_minutes, v_service.cleanup_time_minutes,
        v_service.max_advance_booking_days, v_service.min_advance_booking_hours,
        v_service.requires_consultation, v_service.allow_parallel_booking, 
        v_service.max_parallel_bookings,
        v_service.gender_preference, v_service.age_restrictions, 
        v_service.prerequisites,
        v_service.aftercare_instructions_en, v_service.aftercare_instructions_ar,
        v_service.seo_keywords, v_service.image_urls, v_service.video_url,
        TRUE
    )
    RETURNING id INTO v_new_service_id;
    
    -- Copy tags
    INSERT INTO service_service_tags (service_id, tag_id)
    SELECT v_new_service_id, tag_id
    FROM service_service_tags
    WHERE service_id = p_service_id;
    
    -- Copy variations
    INSERT INTO service_variations (
        service_id, name_en, name_ar,
        description_en, description_ar,
        price_modifier, duration_modifier,
        sort_order, is_default, active, metadata
    )
    SELECT 
        v_new_service_id, name_en, name_ar,
        description_en, description_ar,
        price_modifier, duration_modifier,
        sort_order, is_default, active, metadata
    FROM service_variations
    WHERE service_id = p_service_id;
    
    RETURN v_new_service_id;
END;
$$;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Service management enhanced schema created successfully!';
END$$;