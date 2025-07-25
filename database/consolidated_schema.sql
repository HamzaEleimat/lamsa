-- =====================================================
-- Lamsa Consolidated Database Schema
-- Version: 2.0
-- Last Updated: 2025-01-22
-- =====================================================
-- This is the single source of truth for the Lamsa database schema
-- It consolidates all previous schema files and includes:
-- - Core tables with proper constraints
-- - Performance optimizations and indexes
-- - Security features (RLS policies, encryption support)
-- - Audit and analytics capabilities
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- For exclusion constraints

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- User roles
CREATE TYPE user_role AS ENUM (
  'customer',
  'provider',
  'admin',
  'super_admin'
);

-- Booking status
CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed', 
  'completed',
  'cancelled',
  'no_show'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'partially_refunded'
);

-- Service categories
CREATE TYPE service_category AS ENUM (
  'hair',
  'nails',
  'facial',
  'makeup',
  'spa',
  'waxing',
  'massage',
  'other'
);

-- Provider status
CREATE TYPE provider_status AS ENUM (
  'pending_verification',
  'active',
  'suspended',
  'inactive'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (customers)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  phone_hash VARCHAR(64), -- For encrypted phone lookups
  name VARCHAR(100),
  email VARCHAR(255),
  email_hash VARCHAR(64), -- For encrypted email lookups
  language VARCHAR(2) DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  profile_image TEXT,
  date_of_birth DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  
  -- Authentication
  auth_id UUID UNIQUE, -- Supabase Auth ID
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  
  -- Preferences
  notification_preferences JSONB DEFAULT '{"sms": true, "email": true, "push": true}'::jsonb,
  marketing_consent BOOLEAN DEFAULT false,
  
  -- PII Encryption tracking
  pii_encrypted BOOLEAN DEFAULT false,
  pii_encrypted_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_phone UNIQUE (phone),
  CONSTRAINT unique_email UNIQUE (email),
  CONSTRAINT valid_phone CHECK (phone ~ '^\+962(77|78|79)[0-9]{7}$')
);

-- Providers table
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic information
  business_name_ar VARCHAR(255) NOT NULL,
  business_name_en VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  phone_hash VARCHAR(64), -- For encrypted phone lookups
  email VARCHAR(255) NOT NULL,
  email_hash VARCHAR(64), -- For encrypted email lookups
  
  -- Business details
  commercial_register VARCHAR(50),
  license_number VARCHAR(50),
  license_image TEXT,
  tax_number VARCHAR(50),
  
  -- Location
  address TEXT,
  city VARCHAR(100),
  area VARCHAR(100),
  location GEOGRAPHY(POINT, 4326), -- PostGIS point
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  google_maps_url TEXT,
  
  -- Service details
  description_ar TEXT,
  description_en TEXT,
  bio_ar TEXT,
  bio_en TEXT,
  specialties TEXT[],
  amenities JSONB DEFAULT '[]'::jsonb,
  
  -- Business hours (JSON format for flexibility)
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "friday": {"open": "09:00", "close": "13:00", "is_closed": false},
    "saturday": {"open": "09:00", "close": "18:00", "is_closed": false},
    "sunday": {"is_closed": true}
  }'::jsonb,
  
  -- Media
  logo_url TEXT,
  cover_image_url TEXT,
  gallery_images TEXT[],
  instagram_handle VARCHAR(100),
  facebook_url TEXT,
  website_url TEXT,
  
  -- Status and verification
  status provider_status DEFAULT 'pending_verification',
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  active BOOLEAN DEFAULT true,
  
  -- Ratings and stats
  rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 100.0,
  
  -- Financial
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  iban VARCHAR(34),
  commission_rate DECIMAL(5,2) DEFAULT 20.0, -- Platform commission percentage
  
  -- Settings
  instant_booking BOOLEAN DEFAULT false,
  cancellation_policy JSONB DEFAULT '{"hours": 24, "fee_percentage": 0}'::jsonb,
  advance_booking_days INTEGER DEFAULT 30,
  minimum_booking_notice_hours INTEGER DEFAULT 2,
  
  -- Authentication
  auth_id UUID UNIQUE, -- Supabase Auth ID
  last_active_at TIMESTAMP WITH TIME ZONE,
  
  -- PII Encryption tracking
  pii_encrypted BOOLEAN DEFAULT false,
  pii_encrypted_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_provider_phone UNIQUE (phone),
  CONSTRAINT unique_provider_email UNIQUE (email),
  CONSTRAINT valid_provider_phone CHECK (phone ~ '^\+962(77|78|79)[0-9]{7}$'),
  CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT valid_commission CHECK (commission_rate >= 0 AND commission_rate <= 100)
);

-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  
  -- Service details
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  category service_category NOT NULL,
  subcategory VARCHAR(100),
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  
  -- Duration
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  buffer_time_minutes INTEGER DEFAULT 0,
  
  -- Availability
  active BOOLEAN DEFAULT true,
  max_daily_bookings INTEGER,
  requires_consultation BOOLEAN DEFAULT false,
  
  -- Additional options
  add_ons JSONB DEFAULT '[]'::jsonb,
  preparation_instructions_ar TEXT,
  preparation_instructions_en TEXT,
  
  -- Stats
  popularity_score INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_service_per_provider UNIQUE (provider_id, name_en, name_ar) WHERE deleted_at IS NULL
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number VARCHAR(20) UNIQUE NOT NULL, -- Format: BK-YYYYMMDD-XXXX
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  
  -- Booking details
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status DEFAULT 'pending',
  
  -- Location
  user_location GEOGRAPHY(POINT, 4326),
  user_address TEXT,
  is_home_service BOOLEAN DEFAULT false,
  
  -- Pricing (all amounts in JOD)
  service_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  platform_fee DECIMAL(10,2) NOT NULL, -- 2 JOD for ≤25, 5 JOD for >25
  provider_earning DECIMAL(10,2) NOT NULL, -- service_amount - platform_fee
  total_amount DECIMAL(10,2) NOT NULL, -- service_amount - discount_amount
  
  -- Notes
  customer_notes TEXT,
  provider_notes TEXT,
  internal_notes TEXT,
  
  -- Cancellation
  cancelled_by UUID,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  actual_start_time TIME,
  actual_end_time TIME,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_booking_future_date CHECK (
    (status IN ('completed', 'cancelled')) OR 
    (booking_date >= CURRENT_DATE)
  ),
  CONSTRAINT check_time_order CHECK (end_time > start_time),
  CONSTRAINT unique_provider_timeslot UNIQUE (provider_id, booking_date, start_time, status) 
    WHERE status IN ('pending', 'confirmed')
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  
  -- Review details
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Review aspects
  service_quality INTEGER CHECK (service_quality >= 1 AND service_quality <= 5),
  punctuality INTEGER CHECK (punctuality >= 1 AND punctuality <= 5),
  cleanliness INTEGER CHECK (cleanliness >= 1 AND cleanliness <= 5),
  value_for_money INTEGER CHECK (value_for_money >= 1 AND value_for_money <= 5),
  
  -- Provider response
  provider_response TEXT,
  provider_response_at TIMESTAMP WITH TIME ZONE,
  
  -- Moderation
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  moderated_at TIMESTAMP WITH TIME ZONE,
  moderated_by UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT one_review_per_booking UNIQUE (booking_id)
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_reference VARCHAR(50) UNIQUE NOT NULL,
  
  -- Relationships
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'JOD',
  status payment_status DEFAULT 'pending',
  payment_method VARCHAR(50), -- 'tap_card', 'tap_wallet', 'cash'
  
  -- Gateway details
  gateway_payment_id VARCHAR(100),
  gateway_response JSONB,
  
  -- Card details (encrypted)
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),
  
  -- Refund details
  refund_amount DECIMAL(10,2) DEFAULT 0,
  refund_reason TEXT,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Settlement
  settled_to_provider BOOLEAN DEFAULT false,
  settlement_amount DECIMAL(10,2),
  settled_at TIMESTAMP WITH TIME ZONE,
  settlement_reference VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Recipient
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  
  -- Notification details
  type VARCHAR(50) NOT NULL, -- 'booking_confirmation', 'reminder', 'review_request', etc.
  title_en VARCHAR(255) NOT NULL,
  title_ar VARCHAR(255) NOT NULL,
  body_en TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  
  -- Delivery
  channels TEXT[] DEFAULT ARRAY['in_app'], -- 'in_app', 'sms', 'email', 'push'
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- SMS/Email status
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Action
  action_type VARCHAR(50), -- 'view_booking', 'leave_review', etc.
  action_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT recipient_required CHECK (
    (user_id IS NOT NULL AND provider_id IS NULL) OR 
    (user_id IS NULL AND provider_id IS NOT NULL)
  )
);

-- Service Categories (for better organization)
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en VARCHAR(100) NOT NULL UNIQUE,
  name_ar VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  color VARCHAR(7), -- Hex color
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider Availability (for complex scheduling)
CREATE TABLE provider_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  
  -- Recurring availability
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  start_time TIME,
  end_time TIME,
  
  -- Specific date availability (overrides recurring)
  specific_date DATE,
  is_available BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_recurring_availability UNIQUE (provider_id, day_of_week) WHERE specific_date IS NULL,
  CONSTRAINT unique_specific_availability UNIQUE (provider_id, specific_date) WHERE specific_date IS NOT NULL,
  CONSTRAINT check_time_order CHECK (end_time > start_time)
);

-- Favorites table
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_favorite UNIQUE (user_id, provider_id)
);

-- OTP table (for authentication)
CREATE TABLE otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  purpose VARCHAR(20) DEFAULT 'login', -- 'login', 'verification', 'password_reset'
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_otp_phone CHECK (phone ~ '^\+962(77|78|79)[0-9]{7}$')
);

-- Audit Log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Actor
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  admin_id UUID,
  
  -- Action details
  action VARCHAR(100) NOT NULL, -- 'booking.create', 'provider.update', etc.
  entity_type VARCHAR(50) NOT NULL, -- 'booking', 'provider', 'user', etc.
  entity_id UUID NOT NULL,
  
  -- Change details
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_phone_hash ON users(phone_hash);
CREATE INDEX idx_users_email_hash ON users(email_hash);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Providers indexes
CREATE INDEX idx_providers_phone_hash ON providers(phone_hash);
CREATE INDEX idx_providers_email_hash ON providers(email_hash);
CREATE INDEX idx_providers_auth_id ON providers(auth_id);
CREATE INDEX idx_providers_location ON providers USING GIST (location) WHERE active = true AND verified = true;
CREATE INDEX idx_providers_city_area ON providers(city, area) WHERE active = true;
CREATE INDEX idx_providers_search ON providers(verified, active, rating) WHERE active = true AND verified = true;
CREATE INDEX idx_providers_status ON providers(status, verified);
CREATE INDEX idx_active_providers ON providers(created_at DESC) WHERE active = true AND verified = true;

-- Services indexes
CREATE INDEX idx_services_provider ON services(provider_id, active);
CREATE INDEX idx_services_category ON services(category, active);
CREATE INDEX idx_services_search ON services(provider_id, category, active, price);
CREATE INDEX idx_services_provider_lookup ON services(provider_id, active, category, price) WHERE active = true;

-- Bookings indexes
CREATE INDEX idx_bookings_user ON bookings(user_id, status, booking_date);
CREATE INDEX idx_bookings_provider ON bookings(provider_id, status, booking_date);
CREATE INDEX idx_bookings_date ON bookings(booking_date, status);
CREATE INDEX idx_bookings_status ON bookings(status) WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_bookings_availability_check ON bookings(provider_id, booking_date, start_time, end_time) 
  WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_bookings_user_activity ON bookings(user_id, created_at DESC) 
  WHERE created_at > NOW() - INTERVAL '90 days';
CREATE INDEX idx_bookings_financial ON bookings(created_at, status) WHERE status = 'completed';
CREATE INDEX idx_pending_bookings ON bookings(created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_bookings_date_range ON bookings(booking_date, provider_id, status);

-- Reviews indexes
CREATE INDEX idx_reviews_provider ON reviews(provider_id, rating, created_at);
CREATE INDEX idx_reviews_user ON reviews(user_id, created_at);
CREATE INDEX idx_reviews_booking ON reviews(booking_id);
CREATE INDEX idx_reviews_featured ON reviews(is_featured, created_at DESC) WHERE is_featured = true AND is_hidden = false;

-- Payments indexes
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_user ON payments(user_id, status);
CREATE INDEX idx_payments_provider ON payments(provider_id, settled_to_provider);
CREATE INDEX idx_payments_status ON payments(status, created_at);
CREATE INDEX idx_payments_settlement ON payments(settled_to_provider, provider_id) WHERE settled_to_provider = false;

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_provider ON notifications(provider_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Other indexes
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_provider ON favorites(provider_id);
CREATE INDEX idx_otps_phone_expires ON otps(phone, expires_at) WHERE verified = false;
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(user_id, provider_id, created_at DESC);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
  booking_count INTEGER;
  new_number VARCHAR(20);
BEGIN
  -- Get today's booking count
  SELECT COUNT(*) + 1 INTO booking_count
  FROM bookings
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Generate booking number: BK-YYYYMMDD-XXXX
  new_number := 'BK-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(booking_count::TEXT, 4, '0');
  
  NEW.booking_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_booking_number_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_number();

-- Function to calculate platform fees
CREATE OR REPLACE FUNCTION calculate_platform_fee(service_amount DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  IF service_amount <= 25 THEN
    RETURN 2.00; -- 2 JOD for services ≤25 JOD
  ELSE
    RETURN 5.00; -- 5 JOD for services >25 JOD
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update provider stats
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE providers 
    SET 
      total_bookings = total_bookings + 1,
      total_revenue = total_revenue + NEW.total_amount,
      last_active_at = NOW()
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_stats_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_stats();

-- Function to update provider rating
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
DECLARE
  new_rating DECIMAL(2,1);
  review_count INTEGER;
BEGIN
  -- Calculate new average rating
  SELECT AVG(rating), COUNT(*) INTO new_rating, review_count
  FROM reviews
  WHERE provider_id = NEW.provider_id AND is_hidden = false;
  
  -- Update provider rating
  UPDATE providers
  SET 
    rating = COALESCE(new_rating, 0.0),
    total_reviews = review_count
  WHERE id = NEW.provider_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_rating();

-- Function to validate booking time
CREATE OR REPLACE FUNCTION validate_booking_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure end_time is after start_time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  
  -- Ensure booking is within business hours (6 AM to 11 PM)
  IF EXTRACT(HOUR FROM NEW.start_time) < 6 OR EXTRACT(HOUR FROM NEW.end_time) > 23 THEN
    RAISE EXCEPTION 'Booking must be within business hours (6 AM to 11 PM)';
  END IF;
  
  -- Check for booking conflicts
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE provider_id = NEW.provider_id
    AND booking_date = NEW.booking_date
    AND status IN ('pending', 'confirmed')
    AND id != COALESCE(NEW.id, uuid_nil())
    AND (
      (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Time slot conflicts with existing booking';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_booking_time_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_time();

-- =====================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- =====================================================

-- Provider analytics view
CREATE MATERIALIZED VIEW provider_analytics AS
SELECT 
  p.id,
  p.business_name_en,
  p.business_name_ar,
  p.city,
  p.area,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_bookings,
  COUNT(DISTINCT b.user_id) as unique_customers,
  AVG(r.rating) as average_rating,
  COUNT(DISTINCT r.id) as total_reviews,
  SUM(b.total_amount) FILTER (WHERE b.status = 'completed') as total_revenue,
  SUM(b.platform_fee) FILTER (WHERE b.status = 'completed') as total_platform_fees,
  MAX(b.created_at) as last_booking_date,
  DATE_PART('day', NOW() - p.created_at) as days_active
FROM providers p
LEFT JOIN bookings b ON p.id = b.provider_id
LEFT JOIN reviews r ON p.id = r.provider_id
WHERE p.active = true
GROUP BY p.id, p.business_name_en, p.business_name_ar, p.city, p.area, p.created_at;

CREATE UNIQUE INDEX idx_provider_analytics_id ON provider_analytics(id);

-- Service popularity view
CREATE MATERIALIZED VIEW service_popularity AS
SELECT 
  s.id,
  s.provider_id,
  s.name_en,
  s.name_ar,
  s.category,
  s.price,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
  COUNT(DISTINCT b.user_id) as unique_customers,
  AVG(r.rating) as average_rating,
  SUM(b.total_amount) FILTER (WHERE b.status = 'completed') as total_revenue
FROM services s
LEFT JOIN bookings b ON s.id = b.service_id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE s.active = true
GROUP BY s.id, s.provider_id, s.name_en, s.name_ar, s.category, s.price;

CREATE UNIQUE INDEX idx_service_popularity_id ON service_popularity(id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Providers policies  
CREATE POLICY "Anyone can view active providers" ON providers
  FOR SELECT USING (active = true AND verified = true);

CREATE POLICY "Providers can update own profile" ON providers
  FOR UPDATE USING (auth.uid() = auth_id);

-- Services policies
CREATE POLICY "Anyone can view active services" ON services
  FOR SELECT USING (active = true);

CREATE POLICY "Providers can manage own services" ON services
  FOR ALL USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
    provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Reviews policies
CREATE POLICY "Anyone can view non-hidden reviews" ON reviews
  FOR SELECT USING (is_hidden = false);

CREATE POLICY "Users can create reviews for completed bookings" ON reviews
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) AND
    booking_id IN (
      SELECT id FROM bookings 
      WHERE user_id = reviews.user_id 
      AND status = 'completed'
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
    provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
  );

-- =====================================================
-- SAMPLE DATA AND UTILITIES
-- =====================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY service_popularity;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON users, bookings, reviews, favorites, notifications TO authenticated;
GRANT SELECT ON provider_analytics, service_popularity TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO service_role;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON SCHEMA public IS 'Lamsa beauty booking platform database schema';
COMMENT ON TABLE users IS 'Customer accounts with encrypted PII';
COMMENT ON TABLE providers IS 'Beauty service providers with business details';
COMMENT ON TABLE services IS 'Services offered by providers';
COMMENT ON TABLE bookings IS 'Customer bookings with platform fee calculation';
COMMENT ON TABLE reviews IS 'Customer reviews and ratings';
COMMENT ON TABLE payments IS 'Payment transactions and settlements';

COMMENT ON COLUMN providers.pii_encrypted IS 'Indicates if PII fields have been encrypted';
COMMENT ON COLUMN providers.pii_encrypted_at IS 'Timestamp when PII was encrypted';
COMMENT ON COLUMN bookings.platform_fee IS 'Platform fee: 2 JOD for services ≤25 JOD, 5 JOD for services >25 JOD';
COMMENT ON COLUMN bookings.provider_earning IS 'Provider earning = service_amount - platform_fee';

-- End of consolidated schema