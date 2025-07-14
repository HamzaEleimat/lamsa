-- Enhanced Provider Onboarding Schema
-- This file adds the necessary tables and updates for the multi-step provider onboarding flow

-- Add new columns to providers table for onboarding process
ALTER TABLE providers ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS license_type VARCHAR(100);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS license_document_url TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS license_document_number VARCHAR(100);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS alternative_verification JSONB;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS business_type VARCHAR(50); -- salon, spa, mobile, home_based
ALTER TABLE providers ADD COLUMN IF NOT EXISTS service_radius_km INTEGER DEFAULT 5;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS portfolio_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS business_references JSONB DEFAULT '[]'::jsonb;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS social_media_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS quality_tier INTEGER DEFAULT 1; -- 1=basic, 2=verified, 3=premium

-- Create provider_onboarding_steps table to track completion
CREATE TABLE IF NOT EXISTS provider_onboarding_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, step_number)
);

-- Create provider_verification_documents table
CREATE TABLE IF NOT EXISTS provider_verification_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- license, portfolio, reference, etc.
    document_url TEXT NOT NULL,
    document_number VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create provider_business_hours table (enhanced version of provider_availability)
CREATE TABLE IF NOT EXISTS provider_business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_working_day BOOLEAN DEFAULT TRUE,
    opening_time TIME,
    closing_time TIME,
    break_start_time TIME,
    break_end_time TIME,
    is_24_hours BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, day_of_week)
);

-- Create service_templates table for predefined services
CREATE TABLE IF NOT EXISTS service_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES service_categories(id),
    name_en VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    typical_duration_minutes INTEGER,
    typical_price_range_min DECIMAL(10,2),
    typical_price_range_max DECIMAL(10,2),
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update providers table with new onboarding status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_status') THEN
        CREATE TYPE onboarding_status AS ENUM (
            'pending',
            'in_progress', 
            'completed',
            'approved',
            'rejected'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM (
            'pending',
            'documents_submitted',
            'under_review',
            'verified',
            'rejected',
            'alternative_verified'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type') THEN
        CREATE TYPE business_type AS ENUM (
            'salon',
            'spa',
            'mobile',
            'home_based',
            'clinic'
        );
    END IF;
END$$;

-- Insert default service templates
INSERT INTO service_templates (category_id, name_en, name_ar, description_en, description_ar, typical_duration_minutes, typical_price_range_min, typical_price_range_max, is_popular)
SELECT 
    sc.id,
    template.name_en,
    template.name_ar,
    template.description_en,
    template.description_ar,
    template.duration,
    template.min_price,
    template.max_price,
    template.is_popular
FROM service_categories sc
CROSS JOIN (
    VALUES 
    -- Hair services
    ('Hair Styling', 'Hair Cut & Style', 'قص وتسريح الشعر', 'Professional haircut and styling', 'قص وتسريح شعر احترافي', 60, 15.00, 35.00, true),
    ('Hair Styling', 'Hair Color', 'صبغ الشعر', 'Professional hair coloring service', 'خدمة صبغ الشعر الاحترافية', 120, 25.00, 60.00, true),
    ('Hair Styling', 'Hair Wash & Blow Dry', 'غسيل وتجفيف الشعر', 'Hair washing and professional blow dry', 'غسيل وتجفيف احترافي للشعر', 45, 10.00, 20.00, true),
    
    -- Makeup services  
    ('Makeup', 'Bridal Makeup', 'مكياج عروس', 'Complete bridal makeup package', 'باقة مكياج العروس الكاملة', 90, 50.00, 150.00, true),
    ('Makeup', 'Party Makeup', 'مكياج سهرة', 'Evening and party makeup', 'مكياج المناسبات والسهرات', 60, 25.00, 60.00, true),
    ('Makeup', 'Daily Makeup', 'مكياج يومي', 'Natural daily makeup look', 'مكياج يومي طبيعي', 30, 15.00, 30.00, false),
    
    -- Nail services
    ('Nails', 'Manicure', 'باديكير اليدين', 'Professional manicure service', 'خدمة باديكير احترافية لليدين', 45, 8.00, 20.00, true),
    ('Nails', 'Pedicure', 'باديكير القدمين', 'Professional pedicure service', 'خدمة باديكير احترافية للقدمين', 60, 10.00, 25.00, true),
    ('Nails', 'Gel Polish', 'طلاء جل', 'Long-lasting gel nail polish', 'طلاء أظافر جل طويل المدى', 30, 12.00, 25.00, true),
    
    -- Skincare services
    ('Skincare', 'Facial Treatment', 'علاج الوجه', 'Deep cleansing facial treatment', 'علاج عميق لتنظيف الوجه', 75, 20.00, 50.00, true),
    ('Skincare', 'Acne Treatment', 'علاج حب الشباب', 'Specialized acne treatment', 'علاج متخصص لحب الشباب', 60, 25.00, 45.00, false),
    
    -- Massage services
    ('Massage', 'Relaxing Massage', 'مساج استرخاء', 'Full body relaxing massage', 'مساج استرخاء للجسم كامل', 60, 30.00, 60.00, true),
    ('Massage', 'Therapeutic Massage', 'مساج علاجي', 'Therapeutic and healing massage', 'مساج علاجي وشفائي', 75, 40.00, 70.00, false),
    
    -- Eyebrows & Lashes
    ('Eyebrows & Lashes', 'Eyebrow Threading', 'نتف الحواجب', 'Professional eyebrow shaping', 'تشكيل الحواجب الاحترافي', 20, 5.00, 15.00, true),
    ('Eyebrows & Lashes', 'Eyelash Extensions', 'تمديد الرموش', 'Individual eyelash extensions', 'تمديد الرموش الفردية', 90, 35.00, 80.00, true)
) AS template(category_name, name_en, name_ar, description_en, description_ar, duration, min_price, max_price, is_popular)
WHERE sc.name_en = template.category_name
AND NOT EXISTS (
    SELECT 1 FROM service_templates st 
    WHERE st.category_id = sc.id 
    AND st.name_en = template.name_en
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_onboarding_steps_provider ON provider_onboarding_steps(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_onboarding_steps_completion ON provider_onboarding_steps(provider_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_provider_verification_documents_provider ON provider_verification_documents(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_verification_documents_type ON provider_verification_documents(provider_id, document_type);
CREATE INDEX IF NOT EXISTS idx_provider_business_hours_provider ON provider_business_hours(provider_id);
CREATE INDEX IF NOT EXISTS idx_providers_onboarding_status ON providers(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_providers_verification_status ON providers(verification_status);
CREATE INDEX IF NOT EXISTS idx_providers_business_type ON providers(business_type);

-- Create triggers for updated_at
CREATE TRIGGER update_provider_onboarding_steps_updated_at BEFORE UPDATE ON provider_onboarding_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_verification_documents_updated_at BEFORE UPDATE ON provider_verification_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_business_hours_updated_at BEFORE UPDATE ON provider_business_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate provider profile completion percentage
CREATE OR REPLACE FUNCTION calculate_provider_completion_percentage(p_provider_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_steps INTEGER := 7;
    v_completed_steps INTEGER;
    v_percentage INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_completed_steps
    FROM provider_onboarding_steps
    WHERE provider_id = p_provider_id
    AND is_completed = TRUE;
    
    v_percentage := ROUND((v_completed_steps::DECIMAL / v_total_steps) * 100);
    
    -- Update the provider record
    UPDATE providers 
    SET profile_completion_percentage = v_percentage
    WHERE id = p_provider_id;
    
    RETURN v_percentage;
END;
$$;

-- Function to initialize provider onboarding steps
CREATE OR REPLACE FUNCTION initialize_provider_onboarding(p_provider_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO provider_onboarding_steps (provider_id, step_number, step_name, is_completed)
    VALUES 
        (p_provider_id, 1, 'personal_information', FALSE),
        (p_provider_id, 2, 'business_details', FALSE),
        (p_provider_id, 3, 'location_setup', FALSE),
        (p_provider_id, 4, 'service_categories', FALSE),
        (p_provider_id, 5, 'license_verification', FALSE),
        (p_provider_id, 6, 'working_hours', FALSE),
        (p_provider_id, 7, 'review_submit', FALSE)
    ON CONFLICT (provider_id, step_number) DO NOTHING;
END;
$$;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Provider onboarding schema enhancements completed successfully!';
END$$;
