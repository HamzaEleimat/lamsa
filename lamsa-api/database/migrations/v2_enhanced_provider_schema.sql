-- Lamsa Database Migration v2: Enhanced Provider Features
-- Date: 2025-01-14
-- Description: Adds comprehensive provider features, onboarding, and availability management

-- Create new enum types
CREATE TYPE business_type AS ENUM ('salon', 'spa', 'mobile', 'home_based', 'clinic');
CREATE TYPE onboarding_status AS ENUM ('pending', 'in_progress', 'completed', 'approved', 'rejected');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE quality_tier AS ENUM ('1', '2', '3'); -- 1=Basic, 2=Premium, 3=Elite
CREATE TYPE shift_type AS ENUM ('regular', 'women_only', 'vip');
CREATE TYPE break_type AS ENUM ('lunch', 'prayer', 'personal', 'maintenance');
CREATE TYPE time_off_reason AS ENUM ('holiday', 'vacation', 'sick', 'personal', 'training');
CREATE TYPE expertise_level AS ENUM ('beginner', 'intermediate', 'expert', 'master');
CREATE TYPE gallery_image_type AS ENUM ('portfolio', 'salon', 'certificate', 'before_after');
CREATE TYPE social_media_platform AS ENUM ('instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'snapchat');

-- 1. Alter existing providers table
ALTER TABLE providers
  -- Business information
  ADD COLUMN IF NOT EXISTS business_type business_type DEFAULT 'salon',
  ADD COLUMN IF NOT EXISTS onboarding_status onboarding_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS quality_tier quality_tier DEFAULT '1',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  
  -- Bio and description
  ADD COLUMN IF NOT EXISTS bio_ar TEXT,
  ADD COLUMN IF NOT EXISTS bio_en TEXT,
  ADD COLUMN IF NOT EXISTS tagline_ar VARCHAR(200),
  ADD COLUMN IF NOT EXISTS tagline_en VARCHAR(200),
  
  -- Location and service area
  ADD COLUMN IF NOT EXISTS service_radius_km INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS serves_multiple_locations BOOLEAN DEFAULT FALSE,
  
  -- Experience and establishment
  ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
  ADD COLUMN IF NOT EXISTS established_year INTEGER,
  ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 1,
  
  -- SEO fields
  ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS meta_description_ar TEXT,
  ADD COLUMN IF NOT EXISTS meta_description_en TEXT,
  ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]',
  
  -- Operational settings
  ADD COLUMN IF NOT EXISTS minimum_booking_notice_hours INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS maximum_advance_booking_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS cancellation_policy_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_percentage INTEGER DEFAULT 0,
  
  -- Social media
  ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(100),
  ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS whatsapp_business VARCHAR(20),
  
  -- Features and amenities
  ADD COLUMN IF NOT EXISTS has_parking BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_wifi BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_wheelchair_accessible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepts_credit_cards BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS women_only_service BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS home_service_available BOOLEAN DEFAULT FALSE,
  
  -- Analytics
  ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(3,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create onboarding_steps table
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name VARCHAR(50) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, step_number)
);

-- 3. Create verification_documents table
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'license', 'certification', 'insurance', 'id'
  document_number VARCHAR(100),
  file_url TEXT NOT NULL,
  verification_status verification_status DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create provider_gallery_images table
CREATE TABLE IF NOT EXISTS provider_gallery_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  image_type gallery_image_type NOT NULL,
  caption_ar TEXT,
  caption_en TEXT,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create provider_service_categories table (many-to-many with expertise)
CREATE TABLE IF NOT EXISTS provider_service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  expertise_level expertise_level DEFAULT 'intermediate',
  years_experience INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, category_id)
);

-- 6. Create certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  issuing_organization VARCHAR(200),
  issue_date DATE,
  expiry_date DATE,
  certificate_number VARCHAR(100),
  certificate_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create awards table
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title_ar VARCHAR(200) NOT NULL,
  title_en VARCHAR(200) NOT NULL,
  issuer VARCHAR(200),
  year INTEGER,
  description_ar TEXT,
  description_en TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create specializations table
CREATE TABLE IF NOT EXISTS specializations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  category_id UUID REFERENCES service_categories(id),
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create social_media_profiles table
CREATE TABLE IF NOT EXISTS social_media_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  platform social_media_platform NOT NULL,
  profile_url TEXT NOT NULL,
  username VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  follower_count INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, platform)
);

-- 10. Create availability_settings table
CREATE TABLE IF NOT EXISTS availability_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID UNIQUE NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  advance_booking_days INTEGER DEFAULT 30,
  min_advance_booking_hours INTEGER DEFAULT 2,
  max_advance_booking_days INTEGER DEFAULT 90,
  default_preparation_minutes INTEGER DEFAULT 10,
  default_cleanup_minutes INTEGER DEFAULT 10,
  between_appointments_minutes INTEGER DEFAULT 5,
  enable_prayer_breaks BOOLEAN DEFAULT TRUE,
  prayer_time_flexibility_minutes INTEGER DEFAULT 15,
  auto_adjust_prayer_times BOOLEAN DEFAULT TRUE,
  prayer_calculation_method VARCHAR(50) DEFAULT 'UmmAlQura',
  auto_switch_ramadan_schedule BOOLEAN DEFAULT TRUE,
  allow_instant_booking BOOLEAN DEFAULT FALSE,
  require_deposit BOOLEAN DEFAULT FALSE,
  deposit_percentage INTEGER DEFAULT 0,
  cancellation_notice_hours INTEGER DEFAULT 24,
  women_only_hours_enabled BOOLEAN DEFAULT FALSE,
  women_only_start_time TIME,
  women_only_end_time TIME,
  women_only_days INTEGER[], -- Array of day numbers (0-6)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create working_schedules table
CREATE TABLE IF NOT EXISTS working_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  schedule_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 1,
  effective_from DATE,
  effective_to DATE,
  recurrence_rule VARCHAR(20), -- 'yearly', 'ramadan', 'none'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Create schedule_shifts table
CREATE TABLE IF NOT EXISTS schedule_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES working_schedules(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type shift_type DEFAULT 'regular',
  max_bookings INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Create schedule_breaks table
CREATE TABLE IF NOT EXISTS schedule_breaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES working_schedules(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  break_type break_type NOT NULL,
  break_name VARCHAR(100),
  start_time TIME,
  end_time TIME,
  is_dynamic BOOLEAN DEFAULT FALSE,
  prayer_name VARCHAR(20), -- 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha'
  duration_minutes INTEGER,
  is_flexible BOOLEAN DEFAULT FALSE,
  flexibility_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Create time_off table
CREATE TABLE IF NOT EXISTS time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason time_off_reason,
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  block_bookings BOOLEAN DEFAULT TRUE,
  auto_reschedule BOOLEAN DEFAULT FALSE,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Create prayer_times table
CREATE TABLE IF NOT EXISTS prayer_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city VARCHAR(100) NOT NULL,
  prayer_date DATE NOT NULL,
  fajr TIME NOT NULL,
  sunrise TIME NOT NULL,
  dhuhr TIME NOT NULL,
  asr TIME NOT NULL,
  maghrib TIME NOT NULL,
  isha TIME NOT NULL,
  calculation_method VARCHAR(50),
  timezone VARCHAR(50),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(city, prayer_date)
);

-- 16. Create ramadan_schedules table
CREATE TABLE IF NOT EXISTS ramadan_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  template_type VARCHAR(20) NOT NULL, -- 'early_shift', 'late_shift', 'split_shift', 'custom'
  early_start_time TIME,
  early_end_time TIME,
  late_start_time TIME,
  late_end_time TIME,
  iftar_break_minutes INTEGER DEFAULT 60,
  auto_adjust_maghrib BOOLEAN DEFAULT TRUE,
  offer_home_service_only BOOLEAN DEFAULT FALSE,
  special_ramadan_services TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, year)
);

-- 17. Create service_templates table
CREATE TABLE IF NOT EXISTS service_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  suggested_duration_minutes INTEGER NOT NULL,
  suggested_price_min DECIMAL(10,2),
  suggested_price_max DECIMAL(10,2),
  is_popular BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Create alternative_verifications table
CREATE TABLE IF NOT EXISTS alternative_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL, -- 'experience', 'portfolio', 'reference'
  details JSONB NOT NULL,
  status verification_status DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Create accessibility_features table
CREATE TABLE IF NOT EXISTS accessibility_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  feature_name_ar VARCHAR(100) NOT NULL,
  feature_name_en VARCHAR(100) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Create holiday_schedules table
CREATE TABLE IF NOT EXISTS holiday_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  holiday_name_ar VARCHAR(100),
  holiday_name_en VARCHAR(100),
  is_closed BOOLEAN DEFAULT TRUE,
  special_hours_start TIME,
  special_hours_end TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, holiday_date)
);

-- Create indexes for performance
CREATE INDEX idx_providers_business_type ON providers(business_type);
CREATE INDEX idx_providers_onboarding_status ON providers(onboarding_status);
CREATE INDEX idx_providers_verification_status ON providers(verification_status);
CREATE INDEX idx_providers_quality_tier ON providers(quality_tier);
CREATE INDEX idx_providers_seo_slug ON providers(seo_slug);
CREATE INDEX idx_providers_location ON providers USING GIST(location);

CREATE INDEX idx_onboarding_steps_provider ON onboarding_steps(provider_id);
CREATE INDEX idx_verification_documents_provider ON verification_documents(provider_id);
CREATE INDEX idx_gallery_images_provider ON provider_gallery_images(provider_id);
CREATE INDEX idx_gallery_images_type ON provider_gallery_images(image_type);

CREATE INDEX idx_working_schedules_provider ON working_schedules(provider_id);
CREATE INDEX idx_working_schedules_active ON working_schedules(is_active);
CREATE INDEX idx_schedule_shifts_schedule ON schedule_shifts(schedule_id);
CREATE INDEX idx_schedule_breaks_schedule ON schedule_breaks(schedule_id);

CREATE INDEX idx_time_off_provider ON time_off(provider_id);
CREATE INDEX idx_time_off_dates ON time_off(start_date, end_date);

CREATE INDEX idx_prayer_times_city_date ON prayer_times(city, prayer_date);

-- Create update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_steps_updated_at BEFORE UPDATE ON onboarding_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_documents_updated_at BEFORE UPDATE ON verification_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_settings_updated_at BEFORE UPDATE ON availability_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_schedules_updated_at BEFORE UPDATE ON working_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_off_updated_at BEFORE UPDATE ON time_off
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ramadan_schedules_updated_at BEFORE UPDATE ON ramadan_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies (if using Supabase)
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE ramadan_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE alternative_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessibility_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_schedules ENABLE ROW LEVEL SECURITY;

-- Sample RLS policies for provider-owned data
CREATE POLICY "Providers can view own onboarding steps" ON onboarding_steps
    FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Providers can update own onboarding steps" ON onboarding_steps
    FOR UPDATE USING (auth.uid() = provider_id);

-- Add more RLS policies as needed for each table

-- Migration completion message
DO $$ 
BEGIN 
    RAISE NOTICE 'Migration v2_enhanced_provider_schema completed successfully';
END $$;