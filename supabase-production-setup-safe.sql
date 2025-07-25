-- Lamsa Production Database Setup (Safe Version)
-- This version handles existing objects gracefully
-- Execute this SQL in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Set timezone to Jordan
ALTER DATABASE postgres SET timezone TO 'Asia/Amman';

-- Create enum types (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'card', 'online');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE settlement_status AS ENUM ('pending', 'processing', 'paid', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE language_code AS ENUM ('ar', 'en');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users (Customers) Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    language language_code DEFAULT 'ar',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Providers Table
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name_ar VARCHAR(255) NOT NULL,
    business_name_en VARCHAR(255) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    address JSONB NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    license_number VARCHAR(50),
    license_image_url TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    google_maps_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add active column to providers if it doesn't exist
DO $$ BEGIN
    ALTER TABLE providers ADD COLUMN active BOOLEAN DEFAULT TRUE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add google_maps_url column to providers if it doesn't exist
DO $$ BEGIN
    ALTER TABLE providers ADD COLUMN google_maps_url TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 3. Service Categories Table
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0
);

-- Add unique constraints if they don't exist
DO $$ BEGIN
    ALTER TABLE service_categories ADD CONSTRAINT service_categories_name_ar_key UNIQUE(name_ar);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE service_categories ADD CONSTRAINT service_categories_name_en_key UNIQUE(name_en);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- 4. Services Table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraints for services if they don't exist
DO $$ BEGIN
    ALTER TABLE services ADD CONSTRAINT services_provider_id_name_ar_key UNIQUE(provider_id, name_ar);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE services ADD CONSTRAINT services_provider_id_name_en_key UNIQUE(provider_id, name_en);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- 5. Provider Availability Table
CREATE TABLE IF NOT EXISTS provider_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    CHECK (end_time > start_time)
);

-- Add unique constraint for provider availability if it doesn't exist
DO $$ BEGIN
    ALTER TABLE provider_availability ADD CONSTRAINT provider_availability_provider_id_day_of_week_key UNIQUE(provider_id, day_of_week);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- 6. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES providers(id),
    service_id UUID NOT NULL REFERENCES services(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status booking_status DEFAULT 'pending',
    payment_method payment_method,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    provider_fee DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (provider_fee >= 0),
    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_time > start_time),
    CHECK (booking_date >= CURRENT_DATE)
);

-- 7. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id),
    user_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES providers(id),
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Settlements Table
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    month SMALLINT NOT NULL CHECK (month >= 1 AND month <= 12),
    year SMALLINT NOT NULL CHECK (year >= 2024),
    total_bookings INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_fees DECIMAL(10,2) NOT NULL DEFAULT 0,
    fee_rate DECIMAL(5,2) NOT NULL CHECK (fee_rate >= 0 AND fee_rate <= 100),
    settlement_status settlement_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ
);

-- Add unique constraint for settlements if it doesn't exist
DO $$ BEGIN
    ALTER TABLE settlements ADD CONSTRAINT settlements_provider_id_month_year_key UNIQUE(provider_id, month, year);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Create indexes (IF NOT EXISTS equivalent)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_providers_location ON providers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON providers(verified);
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(active);
CREATE INDEX IF NOT EXISTS idx_providers_rating ON providers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_providers_phone ON providers(phone);
CREATE INDEX IF NOT EXISTS idx_providers_email ON providers(email);

CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

CREATE INDEX IF NOT EXISTS idx_settlements_provider ON settlements(provider_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(settlement_status);
CREATE INDEX IF NOT EXISTS idx_settlements_period ON settlements(year, month);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_providers_updated_at ON providers;
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update provider rating after review
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE providers
    SET rating = (
        SELECT ROUND(AVG(rating)::numeric, 1)
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

-- Create trigger to update provider rating (drop first if exists)
DROP TRIGGER IF EXISTS update_provider_rating_after_review ON reviews;
CREATE TRIGGER update_provider_rating_after_review
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_provider_rating();

-- Create function to calculate fees
-- Fee Structure:
-- - Services ≤25 JOD: 2 JOD platform fee
-- - Services >25 JOD: 5 JOD platform fee
CREATE OR REPLACE FUNCTION calculate_booking_fees()
RETURNS TRIGGER AS $$
DECLARE
    low_tier_threshold DECIMAL(10,2) := 25.00; -- JOD
    low_tier_fee DECIMAL(10,2) := 2.00; -- JOD
    high_tier_fee DECIMAL(10,2) := 5.00; -- JOD
BEGIN
    -- Calculate platform fee based on service amount
    IF NEW.amount <= low_tier_threshold THEN
        NEW.platform_fee := low_tier_fee;
    ELSE
        NEW.platform_fee := high_tier_fee;
    END IF;
    
    -- Calculate provider earnings
    NEW.provider_fee := NEW.amount - NEW.platform_fee;
    
    -- Ensure provider earnings are not negative
    IF NEW.provider_fee < 0 THEN
        RAISE EXCEPTION 'Platform fee (%) cannot exceed service amount (%)', NEW.platform_fee, NEW.amount;
    END IF;
    
    -- Round to 2 decimal places
    NEW.platform_fee := ROUND(NEW.platform_fee, 2);
    NEW.provider_fee := ROUND(NEW.provider_fee, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to calculate fees (drop first if exists)
DROP TRIGGER IF EXISTS calculate_fees_before_insert ON bookings;
CREATE TRIGGER calculate_fees_before_insert
    BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION calculate_booking_fees();

-- Insert initial service categories (only if they don't exist)
INSERT INTO service_categories (name_ar, name_en, icon, sort_order) 
SELECT * FROM (VALUES
    ('صالون نسائي', 'Women''s Salon', 'salon-women', 1),
    ('صالون رجالي', 'Men''s Salon', 'salon-men', 2),
    ('سبا ومساج', 'Spa & Massage', 'spa', 3),
    ('أظافر', 'Nails', 'nails', 4),
    ('مكياج', 'Makeup', 'makeup', 5),
    ('العناية بالبشرة', 'Skincare', 'skincare', 6),
    ('إزالة الشعر', 'Hair Removal', 'hair-removal', 7),
    ('عيادة تجميل', 'Beauty Clinic', 'clinic', 8)
) AS t(name_ar, name_en, icon, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM service_categories WHERE name_ar = t.name_ar
);

-- Create function to search providers by location (drop first if exists)
DROP FUNCTION IF EXISTS search_providers_nearby(double precision, double precision, integer);
CREATE OR REPLACE FUNCTION search_providers_nearby(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    business_name_ar VARCHAR,
    business_name_en VARCHAR,
    rating DECIMAL,
    total_reviews INTEGER,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.business_name_ar,
        p.business_name_en,
        p.rating,
        p.total_reviews,
        ROUND((ST_Distance(
            p.location::geometry,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry
        ) / 1000)::numeric, 2) AS distance_km
    FROM providers p
    WHERE 
        p.verified = TRUE AND
        p.active = TRUE AND
        ST_DWithin(
            p.location::geometry,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
            radius_km * 1000
        )
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Create views for common queries (drop first if exists)
DROP VIEW IF EXISTS active_providers_with_services;
CREATE VIEW active_providers_with_services AS
SELECT 
    p.id,
    p.business_name_ar,
    p.business_name_en,
    p.owner_name,
    p.phone,
    p.location,
    p.address,
    p.google_maps_url,
    p.rating,
    p.total_reviews,
    COUNT(s.id) as services_count
FROM providers p
LEFT JOIN services s ON p.id = s.provider_id AND s.active = TRUE
WHERE p.verified = TRUE AND p.active = TRUE
GROUP BY p.id, p.business_name_ar, p.business_name_en, p.owner_name, p.phone, p.location, p.address, p.google_maps_url, p.rating, p.total_reviews;

DROP VIEW IF EXISTS upcoming_bookings;
CREATE VIEW upcoming_bookings AS
SELECT 
    b.*,
    u.name as user_name,
    u.phone as user_phone,
    p.business_name_ar as provider_name_ar,
    p.business_name_en as provider_name_en,
    s.name_ar as service_name_ar,
    s.name_en as service_name_en,
    s.duration_minutes
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN providers p ON b.provider_id = p.id
JOIN services s ON b.service_id = s.id
WHERE b.booking_date >= CURRENT_DATE
ORDER BY b.booking_date, b.start_time;

-- Create storage buckets (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('provider-images', 'provider-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('user-avatars', 'user-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('service-images', 'service-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- SUCCESS MESSAGE
SELECT 'Database schema updated successfully! All tables, functions, and triggers are now in place.' as message;