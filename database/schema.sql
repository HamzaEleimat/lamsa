-- Lamsa Database Schema
-- This file creates the complete database schema for the Lamsa platform
-- It handles both fresh installations and existing databases gracefully

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create enum types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
            'pending',
            'confirmed',
            'cancelled',
            'completed',
            'no_show'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM (
            'cash',
            'card',
            'wallet'
        );
    END IF;
END$$;

-- Create or update users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    preferred_language VARCHAR(2) DEFAULT 'ar',
    notification_preferences JSONB DEFAULT '{"sms": true, "push": true, "email": false}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to users if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notification_preferences') THEN
        ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{"sms": true, "push": true, "email": false}'::jsonb;
    END IF;
END$$;

-- Create or update providers table
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(200) NOT NULL,
    business_name_ar VARCHAR(200),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    avatar_url TEXT,
    cover_image_url TEXT,
    bio TEXT,
    bio_ar TEXT,
    location geography(POINT, 4326) NOT NULL,
    address TEXT,
    address_ar TEXT,
    city VARCHAR(100),
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    is_mobile BOOLEAN DEFAULT FALSE,
    travel_radius_km INTEGER DEFAULT 5,
    verified BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    google_maps_url TEXT,
    business_hours JSONB DEFAULT '[]'::jsonb,
    social_media JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to providers if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'active') THEN
        ALTER TABLE providers ADD COLUMN active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'google_maps_url') THEN
        ALTER TABLE providers ADD COLUMN google_maps_url TEXT;
    END IF;
END$$;

-- Create or update service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create or update services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id),
    name_en VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to services if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'active') THEN
        ALTER TABLE services ADD COLUMN active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'created_at') THEN
        ALTER TABLE services ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END$$;

-- Create or update provider_availability table
CREATE TABLE IF NOT EXISTS provider_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, day_of_week)
);

-- Create or update bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES providers(id),
    service_id UUID NOT NULL REFERENCES services(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status booking_status DEFAULT 'pending',
    total_price DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2),
    provider_earnings DECIMAL(10,2),
    payment_method payment_method,
    payment_status VARCHAR(50) DEFAULT 'pending',
    user_notes TEXT,
    provider_notes TEXT,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(50),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    location_type VARCHAR(50) DEFAULT 'salon',
    user_location geography(POINT, 4326),
    user_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_providers_location ON providers USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_providers_verified_active ON providers(verified, active);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Drop and recreate views (safe to drop as they don't contain data)
DROP VIEW IF EXISTS active_providers_with_services CASCADE;
CREATE VIEW active_providers_with_services AS
SELECT 
    p.*,
    COUNT(DISTINCT s.id) as service_count,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', s.id,
                'name_en', s.name_en,
                'name_ar', s.name_ar,
                'price', s.price,
                'duration_minutes', s.duration_minutes,
                'category_id', s.category_id
            )
        ) FILTER (WHERE s.id IS NOT NULL), 
        '[]'
    ) as services
FROM providers p
LEFT JOIN services s ON s.provider_id = p.id AND s.active = TRUE
WHERE p.verified = TRUE AND p.active = TRUE
GROUP BY p.id;

DROP VIEW IF EXISTS upcoming_bookings CASCADE;
CREATE VIEW upcoming_bookings AS
SELECT 
    b.*,
    u.name as user_name,
    u.phone as user_phone,
    p.business_name as provider_name,
    p.business_name_ar as provider_name_ar,
    s.name_en as service_name_en,
    s.name_ar as service_name_ar
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN providers p ON p.id = b.provider_id
JOIN services s ON s.id = b.service_id
WHERE b.status IN ('pending', 'confirmed')
AND b.booking_date >= CURRENT_DATE;

-- Drop and recreate functions (safe to drop as they're stateless)
DROP FUNCTION IF EXISTS search_providers_nearby CASCADE;
CREATE OR REPLACE FUNCTION search_providers_nearby(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km INTEGER DEFAULT 10,
    category_filter UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    business_name VARCHAR,
    business_name_ar VARCHAR,
    distance_km DOUBLE PRECISION,
    rating DECIMAL,
    total_reviews INTEGER,
    is_mobile BOOLEAN,
    location geography(POINT, 4326),
    services JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.business_name,
        p.business_name_ar,
        ST_Distance(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000 as distance_km,
        p.rating,
        p.total_reviews,
        p.is_mobile,
        p.location,
        COALESCE(
            json_agg(
                DISTINCT jsonb_build_object(
                    'id', s.id,
                    'name_en', s.name_en,
                    'name_ar', s.name_ar,
                    'price', s.price,
                    'duration_minutes', s.duration_minutes,
                    'category_id', s.category_id
                )
            ) FILTER (WHERE s.id IS NOT NULL), 
            '[]'
        )::jsonb as services
    FROM providers p
    LEFT JOIN services s ON s.provider_id = p.id AND s.active = TRUE
    WHERE p.verified = TRUE 
    AND p.active = TRUE
    AND (
        -- Salon within radius
        (NOT p.is_mobile AND ST_DWithin(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            radius_km * 1000
        ))
        OR
        -- Mobile provider within their travel radius
        (p.is_mobile AND ST_DWithin(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            p.travel_radius_km * 1000
        ))
    )
    AND (category_filter IS NULL OR EXISTS (
        SELECT 1 FROM services s2 
        WHERE s2.provider_id = p.id 
        AND s2.category_id = category_filter
        AND s2.active = TRUE
    ))
    GROUP BY p.id, p.business_name, p.business_name_ar, p.rating, p.total_reviews, 
             p.is_mobile, p.location, distance_km
    ORDER BY distance_km ASC;
END;
$$;

DROP FUNCTION IF EXISTS check_provider_availability CASCADE;
CREATE OR REPLACE FUNCTION check_provider_availability(
    p_provider_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_duration_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_day_of_week INTEGER;
    v_end_time TIME;
    v_is_available BOOLEAN;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_date);
    v_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Check provider general availability
    SELECT EXISTS (
        SELECT 1 FROM provider_availability
        WHERE provider_id = p_provider_id
        AND day_of_week = v_day_of_week
        AND is_available = TRUE
        AND start_time <= p_start_time
        AND end_time >= v_end_time
    ) INTO v_is_available;
    
    IF NOT v_is_available THEN
        RETURN FALSE;
    END IF;
    
    -- Check for booking conflicts
    RETURN NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE provider_id = p_provider_id
        AND booking_date = p_date
        AND status IN ('confirmed', 'pending')
        AND (
            (start_time <= p_start_time AND end_time > p_start_time)
            OR (start_time < v_end_time AND end_time >= v_end_time)
            OR (start_time >= p_start_time AND end_time <= v_end_time)
        )
    );
END;
$$;

-- Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create booking fee calculation trigger function
CREATE OR REPLACE FUNCTION calculate_booking_fees()
RETURNS TRIGGER AS $$
BEGIN
    NEW.platform_fee := ROUND(NEW.total_price * 0.15, 2);
    NEW.provider_earnings := NEW.total_price - NEW.platform_fee;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers if they don't exist
DO $$ 
BEGIN
    -- Update triggers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_providers_updated_at') THEN
        CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_service_categories_updated_at') THEN
        CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON service_categories
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_services_updated_at') THEN
        CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_provider_availability_updated_at') THEN
        CREATE TRIGGER update_provider_availability_updated_at BEFORE UPDATE ON provider_availability
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at') THEN
        CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Booking fee calculation trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'calculate_booking_fees_trigger') THEN
        CREATE TRIGGER calculate_booking_fees_trigger BEFORE INSERT OR UPDATE ON bookings
            FOR EACH ROW EXECUTE FUNCTION calculate_booking_fees();
    END IF;
END$$;

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Note: These policies assume Supabase Auth is being used
-- Adjust the auth.uid() references if using a different auth system

-- Users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Providers policies
DROP POLICY IF EXISTS "Anyone can view active verified providers" ON providers;
CREATE POLICY "Anyone can view active verified providers" ON providers
    FOR SELECT USING (verified = TRUE AND active = TRUE);

DROP POLICY IF EXISTS "Providers can view their own profile" ON providers;
CREATE POLICY "Providers can view their own profile" ON providers
    FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Providers can update their own profile" ON providers;
CREATE POLICY "Providers can update their own profile" ON providers
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Service categories policies
DROP POLICY IF EXISTS "Anyone can view service categories" ON service_categories;
CREATE POLICY "Anyone can view service categories" ON service_categories
    FOR SELECT USING (true);

-- Services policies
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
CREATE POLICY "Anyone can view active services" ON services
    FOR SELECT USING (active = TRUE);

DROP POLICY IF EXISTS "Providers can manage their own services" ON services;
CREATE POLICY "Providers can manage their own services" ON services
    FOR ALL USING (provider_id::text = auth.uid()::text);

-- Provider availability policies
DROP POLICY IF EXISTS "Anyone can view provider availability" ON provider_availability;
CREATE POLICY "Anyone can view provider availability" ON provider_availability
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Providers can manage their own availability" ON provider_availability;
CREATE POLICY "Providers can manage their own availability" ON provider_availability
    FOR ALL USING (provider_id::text = auth.uid()::text);

-- Bookings policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings" ON bookings
    FOR SELECT USING (user_id::text = auth.uid()::text OR provider_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
CREATE POLICY "Users can create bookings" ON bookings
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users and providers can update their bookings" ON bookings;
CREATE POLICY "Users and providers can update their bookings" ON bookings
    FOR UPDATE USING (user_id::text = auth.uid()::text OR provider_id::text = auth.uid()::text);

-- Insert initial data for service categories if table is empty
INSERT INTO service_categories (name_en, name_ar, icon, display_order) 
SELECT * FROM (VALUES
    ('Hair Styling', 'تصفيف الشعر', 'scissors', 1),
    ('Makeup', 'مكياج', 'palette', 2),
    ('Nails', 'أظافر', 'brush', 3),
    ('Skincare', 'العناية بالبشرة', 'sparkles', 4),
    ('Massage', 'مساج', 'hand', 5),
    ('Eyebrows & Lashes', 'حواجب ورموش', 'eye', 6)
) AS v(name_en, name_ar, icon, display_order)
WHERE NOT EXISTS (SELECT 1 FROM service_categories);

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'BeautyCort database schema created/updated successfully!';
END$$;