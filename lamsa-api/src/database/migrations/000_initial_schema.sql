-- ====================================================================
-- Lamsa Initial Database Schema
-- Date: 2025-07-21
-- Description: Complete database schema for Lamsa beauty booking platform
-- ====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ====================================================================
-- ENUMS
-- ====================================================================

-- User language preference
CREATE TYPE user_language AS ENUM ('ar', 'en');

-- Booking status workflow
CREATE TYPE booking_status AS ENUM (
  'pending',      -- Initial state
  'confirmed',    -- Provider accepted
  'cancelled',    -- Cancelled by user/provider
  'completed',    -- Service delivered
  'no_show'       -- Customer didn't show up
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded'
);

-- Payment method types
CREATE TYPE payment_method AS ENUM (
  'cash',
  'card',
  'wallet'
);

-- Provider status
CREATE TYPE provider_status AS ENUM (
  'pending_verification',
  'active',
  'suspended',
  'inactive'
);

-- Settlement status
CREATE TYPE settlement_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- ====================================================================
-- TABLES
-- ====================================================================

-- Users table (customers)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  language user_language DEFAULT 'ar',
  avatar_url TEXT,
  device_tokens TEXT[], -- For push notifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Service categories
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon_name VARCHAR(50),
  color_hex VARCHAR(7),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Providers table (service providers/salons)
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  business_name_ar VARCHAR(200) NOT NULL,
  business_name_en VARCHAR(200) NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  
  -- Location (PostGIS point)
  location GEOGRAPHY(Point, 4326),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address JSONB NOT NULL, -- {street_ar, street_en, area_ar, area_en, city_ar, city_en, building_no}
  
  -- Business details
  commercial_registration_no VARCHAR(50),
  tax_number VARCHAR(50),
  logo_url TEXT,
  cover_image_url TEXT,
  images TEXT[], -- Gallery images
  
  -- Operational details
  status provider_status DEFAULT 'pending_verification',
  rating DECIMAL(3, 2) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  
  -- Settings
  accepts_cash BOOLEAN DEFAULT true,
  accepts_card BOOLEAN DEFAULT false,
  advance_booking_days INTEGER DEFAULT 30,
  cancellation_hours INTEGER DEFAULT 24,
  
  -- Metadata
  features TEXT[], -- ['wifi', 'parking', 'wheelchair_accessible']
  payment_methods payment_method[] DEFAULT '{cash}'::payment_method[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create spatial index for location queries
CREATE INDEX idx_providers_location ON providers USING GIST(location);

-- Services offered by providers
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id),
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  
  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Availability
  active BOOLEAN DEFAULT true,
  max_advance_days INTEGER DEFAULT 30,
  
  -- Statistics
  total_bookings INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT positive_price CHECK (price > 0),
  CONSTRAINT positive_duration CHECK (duration_minutes > 0)
);

-- Provider availability schedule
CREATE TABLE IF NOT EXISTS provider_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  
  UNIQUE(provider_id, day_of_week)
);

-- Special dates (holidays, exceptions)
CREATE TABLE IF NOT EXISTS provider_special_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_holiday BOOLEAN DEFAULT true,
  opens_at TIME,
  closes_at TIME,
  reason VARCHAR(200),
  
  UNIQUE(provider_id, date)
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  service_id UUID NOT NULL REFERENCES services(id),
  
  -- Booking details
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Financial
  service_amount DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  provider_fee DECIMAL(10, 2), -- Platform commission
  platform_fee DECIMAL(10, 2), -- What provider pays
  
  -- Status
  status booking_status DEFAULT 'pending',
  payment_method payment_method DEFAULT 'cash',
  payment_status payment_status DEFAULT 'pending',
  
  -- Notes
  customer_notes TEXT,
  provider_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID, -- user_id or provider_id
  cancellation_reason TEXT,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT future_booking CHECK (booking_date >= CURRENT_DATE),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES users(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  
  -- Detailed ratings (optional)
  service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
  
  -- Response
  provider_response TEXT,
  provider_response_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'JOD',
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  
  -- Payment gateway details
  gateway_payment_id VARCHAR(255),
  gateway_response JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  -- Refund details
  refund_amount DECIMAL(10, 2),
  refund_reason TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Provider settlements
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id),
  
  -- Period
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  
  -- Amounts
  total_bookings INTEGER DEFAULT 0,
  gross_amount DECIMAL(10, 2) DEFAULT 0,
  platform_fee DECIMAL(10, 2) DEFAULT 0,
  net_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Status
  status settlement_status DEFAULT 'pending',
  
  -- Payment details
  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider_id, month, year)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES providers(id),
  
  title_ar VARCHAR(200) NOT NULL,
  title_en VARCHAR(200) NOT NULL,
  body_ar TEXT NOT NULL,
  body_en TEXT NOT NULL,
  
  type VARCHAR(50) NOT NULL, -- booking_reminder, status_update, promotion
  data JSONB DEFAULT '{}'::jsonb,
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT has_recipient CHECK (user_id IS NOT NULL OR provider_id IS NOT NULL)
);

-- User favorites
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, provider_id)
);

-- OTP verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  purpose VARCHAR(50) NOT NULL, -- signup, login, reset_password
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT max_attempts CHECK (attempts <= 3)
);

-- ====================================================================
-- INDEXES
-- ====================================================================

-- Users
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Providers
CREATE INDEX idx_providers_status ON providers(status);
CREATE INDEX idx_providers_rating ON providers(rating DESC);

-- Services
CREATE INDEX idx_services_provider ON services(provider_id);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(active);

-- Bookings
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- Reviews
CREATE INDEX idx_reviews_provider ON reviews(provider_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_provider ON notifications(provider_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- OTP
CREATE INDEX idx_otp_phone_expires ON otp_verifications(phone, expires_at);

-- ====================================================================
-- FUNCTIONS & TRIGGERS
-- ====================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update provider location from lat/lng
CREATE OR REPLACE FUNCTION update_provider_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_location_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON providers
FOR EACH ROW EXECUTE FUNCTION update_provider_location();

-- Function to search providers by distance
CREATE OR REPLACE FUNCTION search_providers_nearby(
  user_lat DECIMAL,
  user_lng DECIMAL,
  radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  business_name_ar VARCHAR,
  business_name_en VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  rating DECIMAL,
  total_reviews INTEGER,
  address JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.business_name_ar,
    p.business_name_en,
    p.latitude,
    p.longitude,
    ROUND((ST_Distance(
      p.location,
      ST_MakePoint(user_lng, user_lat)::geography
    ) / 1000)::DECIMAL, 2) as distance_km,
    p.rating,
    p.total_reviews,
    p.address
  FROM providers p
  WHERE 
    p.status = 'active'
    AND ST_DWithin(
      p.location,
      ST_MakePoint(user_lng, user_lat)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to check provider availability
CREATE OR REPLACE FUNCTION check_provider_availability(
  p_provider_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_is_available BOOLEAN;
  v_opens_at TIME;
  v_closes_at TIME;
  v_has_conflict BOOLEAN;
BEGIN
  -- Get day of week (0=Sunday, 6=Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_booking_date);
  
  -- Check special dates first
  SELECT NOT is_holiday, opens_at, closes_at
  INTO v_is_available, v_opens_at, v_closes_at
  FROM provider_special_dates
  WHERE provider_id = p_provider_id AND date = p_booking_date;
  
  -- If no special date, check regular availability
  IF NOT FOUND THEN
    SELECT is_available, opens_at, closes_at
    INTO v_is_available, v_opens_at, v_closes_at
    FROM provider_availability
    WHERE provider_id = p_provider_id AND day_of_week = v_day_of_week;
  END IF;
  
  -- Provider not available on this day
  IF NOT v_is_available OR v_opens_at IS NULL OR v_closes_at IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if requested time is within business hours
  IF p_start_time < v_opens_at OR p_end_time > v_closes_at THEN
    RETURN FALSE;
  END IF;
  
  -- Check for booking conflicts
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE provider_id = p_provider_id
      AND booking_date = p_booking_date
      AND status IN ('pending', 'confirmed')
      AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
      )
  ) INTO v_has_conflict;
  
  RETURN NOT v_has_conflict;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate platform fees
-- Fee Structure:
-- - Services ≤25 JOD: 2 JOD platform fee
-- - Services >25 JOD: 5 JOD platform fee
CREATE OR REPLACE FUNCTION calculate_booking_fees()
RETURNS TRIGGER AS $$
DECLARE
  v_low_tier_threshold DECIMAL := 25.00; -- JOD
  v_low_tier_fee DECIMAL := 2.00; -- JOD
  v_high_tier_fee DECIMAL := 5.00; -- JOD
BEGIN
  -- Calculate platform fee based on service amount
  IF NEW.service_amount <= v_low_tier_threshold THEN
    NEW.platform_fee := v_low_tier_fee;
  ELSE
    NEW.platform_fee := v_high_tier_fee;
  END IF;
  
  -- Calculate provider earnings
  NEW.provider_fee := NEW.service_amount - NEW.platform_fee;
  
  -- Ensure provider earnings are not negative
  IF NEW.provider_fee < 0 THEN
    RAISE EXCEPTION 'Platform fee (%) cannot exceed service amount (%)', NEW.platform_fee, NEW.service_amount;
  END IF;
  
  -- Round to 2 decimal places
  NEW.platform_fee := ROUND(NEW.platform_fee, 2);
  NEW.provider_fee := ROUND(NEW.provider_fee, 2);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_booking_fees_trigger
BEFORE INSERT OR UPDATE OF service_amount ON bookings
FOR EACH ROW EXECUTE FUNCTION calculate_booking_fees();

-- Function to update provider rating after review
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE providers
  SET 
    rating = (
      SELECT ROUND(AVG(rating)::DECIMAL, 2)
      FROM reviews
      WHERE provider_id = NEW.provider_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE provider_id = NEW.provider_id
    )
  WHERE id = NEW.provider_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_rating_trigger
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_provider_rating();

-- Function to generate monthly settlements
CREATE OR REPLACE FUNCTION generate_monthly_settlements(
  target_month INTEGER,
  target_year INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO settlements (provider_id, month, year, total_bookings, gross_amount, platform_fee, net_amount)
  SELECT 
    provider_id,
    target_month,
    target_year,
    COUNT(*) as total_bookings,
    SUM(total_amount) as gross_amount,
    SUM(platform_fee) as platform_fee,
    SUM(provider_fee) as net_amount
  FROM bookings
  WHERE 
    status = 'completed'
    AND payment_status = 'completed'
    AND EXTRACT(MONTH FROM completed_at) = target_month
    AND EXTRACT(YEAR FROM completed_at) = target_year
  GROUP BY provider_id
  ON CONFLICT (provider_id, month, year) 
  DO UPDATE SET
    total_bookings = EXCLUDED.total_bookings,
    gross_amount = EXCLUDED.gross_amount,
    platform_fee = EXCLUDED.platform_fee,
    net_amount = EXCLUDED.net_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- INITIAL DATA
-- ====================================================================

-- Insert default service categories
INSERT INTO service_categories (name_ar, name_en, icon_name, color_hex, sort_order) VALUES
('قص الشعر', 'Hair Cut', 'content-cut', '#FF8FAB', 1),
('صبغة الشعر', 'Hair Color', 'palette', '#FFC2D1', 2),
('العناية بالبشرة', 'Facial', 'face-woman', '#FFB3C6', 3),
('المكياج', 'Makeup', 'brush', '#FF8FAB', 4),
('العناية بالأظافر', 'Nails', 'hand-heart', '#FFC2D1', 5),
('إزالة الشعر', 'Hair Removal', 'flash', '#FFB3C6', 6),
('التدليك', 'Massage', 'spa', '#FF8FAB', 7),
('العناية بالجسم', 'Body Care', 'human', '#FFC2D1', 8)
ON CONFLICT DO NOTHING;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be created based on your authentication strategy
-- These will be added in a separate migration after auth is configured

-- ====================================================================
-- COMMENTS
-- ====================================================================

COMMENT ON TABLE users IS 'Customer accounts for the Lamsa platform';
COMMENT ON TABLE providers IS 'Beauty service providers (salons, freelancers)';
COMMENT ON TABLE services IS 'Services offered by providers';
COMMENT ON TABLE bookings IS 'Customer bookings for services';
COMMENT ON TABLE reviews IS 'Customer reviews for completed bookings';
COMMENT ON TABLE payments IS 'Payment records for bookings';
COMMENT ON TABLE settlements IS 'Monthly settlement records for providers';

COMMENT ON COLUMN providers.location IS 'PostGIS geography point for spatial queries';
COMMENT ON COLUMN bookings.platform_fee IS 'Amount retained by platform';
COMMENT ON COLUMN bookings.provider_fee IS 'Amount to be paid to provider';