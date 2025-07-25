-- Beauty Booking Marketplace Database Schema
-- PostgreSQL with PostGIS for location support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create enum types
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'online');
CREATE TYPE settlement_status AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE language_code AS ENUM ('ar', 'en');

-- 1. Users (Customers) Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    language language_code DEFAULT 'ar',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Providers Table
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name_ar VARCHAR(255) NOT NULL,
    business_name_en VARCHAR(255) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    address JSONB NOT NULL, -- {street, city, district, country}
    verified BOOLEAN DEFAULT FALSE,
    license_number VARCHAR(50),
    license_image_url TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Service Categories Table
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    UNIQUE(name_ar),
    UNIQUE(name_en)
);

-- 4. Services Table
CREATE TABLE services (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, name_ar),
    UNIQUE(provider_id, name_en)
);

-- 5. Provider Availability Table
CREATE TABLE provider_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    UNIQUE(provider_id, day_of_week),
    CHECK (end_time > start_time)
);

-- 6. Bookings Table
CREATE TABLE bookings (
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
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id),
    user_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES providers(id),
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Settlements Table
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    month SMALLINT NOT NULL CHECK (month >= 1 AND month <= 12),
    year SMALLINT NOT NULL CHECK (year >= 2024),
    total_bookings INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_fees DECIMAL(10,2) NOT NULL DEFAULT 0,
    fee_rate DECIMAL(5,2) NOT NULL CHECK (fee_rate >= 0 AND fee_rate <= 100),
    settlement_status settlement_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    UNIQUE(provider_id, month, year)
);

-- Create indexes for common queries
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_providers_location ON providers USING GIST(location);
CREATE INDEX idx_providers_verified ON providers(verified);
CREATE INDEX idx_providers_rating ON providers(rating DESC);
CREATE INDEX idx_providers_phone ON providers(phone);
CREATE INDEX idx_providers_email ON providers(email);

CREATE INDEX idx_services_provider ON services(provider_id);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(active);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

CREATE INDEX idx_reviews_provider ON reviews(provider_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

CREATE INDEX idx_settlements_provider ON settlements(provider_id);
CREATE INDEX idx_settlements_status ON settlements(settlement_status);
CREATE INDEX idx_settlements_period ON settlements(year, month);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Create trigger to update provider rating
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

-- Create trigger to calculate fees
CREATE TRIGGER calculate_fees_before_insert
    BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION calculate_booking_fees();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Providers
CREATE POLICY "Anyone can view verified providers" ON providers
    FOR SELECT USING (verified = TRUE);

CREATE POLICY "Providers can view their own profile" ON providers
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Providers can update their own profile" ON providers
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Services
CREATE POLICY "Anyone can view active services" ON services
    FOR SELECT USING (active = TRUE);

CREATE POLICY "Providers can manage their own services" ON services
    FOR ALL USING (provider_id = auth.uid());

-- RLS Policies for Provider Availability
CREATE POLICY "Anyone can view provider availability" ON provider_availability
    FOR SELECT USING (TRUE);

CREATE POLICY "Providers can manage their own availability" ON provider_availability
    FOR ALL USING (provider_id = auth.uid());

-- RLS Policies for Bookings
CREATE POLICY "Users can view their own bookings" ON bookings
    FOR SELECT USING (user_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Users can create bookings" ON bookings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and providers can update their bookings" ON bookings
    FOR UPDATE USING (user_id = auth.uid() OR provider_id = auth.uid());

-- RLS Policies for Reviews
CREATE POLICY "Anyone can view reviews" ON reviews
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can create reviews for their completed bookings" ON reviews
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM bookings
            WHERE bookings.id = booking_id
            AND bookings.user_id = auth.uid()
            AND bookings.status = 'completed'
        )
    );

-- RLS Policies for Settlements
CREATE POLICY "Providers can view their own settlements" ON settlements
    FOR SELECT USING (provider_id = auth.uid());

-- Insert initial service categories
INSERT INTO service_categories (name_ar, name_en, icon, sort_order) VALUES
('صالون نسائي', 'Women''s Salon', 'salon-women', 1),
('صالون رجالي', 'Men''s Salon', 'salon-men', 2),
('سبا ومساج', 'Spa & Massage', 'spa', 3),
('أظافر', 'Nails', 'nails', 4),
('مكياج', 'Makeup', 'makeup', 5),
('العناية بالبشرة', 'Skincare', 'skincare', 6),
('إزالة الشعر', 'Hair Removal', 'hair-removal', 7),
('عيادة تجميل', 'Beauty Clinic', 'clinic', 8);

-- Create view for nearby providers
CREATE OR REPLACE VIEW nearby_providers AS
SELECT 
    p.*,
    ST_Distance(p.location::geometry, ST_SetSRID(ST_MakePoint(0, 0), 4326)::geometry) AS distance_meters
FROM providers p
WHERE p.verified = TRUE;

-- Create function to search providers by location
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
        ST_DWithin(
            p.location::geometry,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
            radius_km * 1000
        )
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Create monthly settlement generation function
CREATE OR REPLACE FUNCTION generate_monthly_settlements(
    target_month INTEGER,
    target_year INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO settlements (
        provider_id,
        month,
        year,
        total_bookings,
        total_amount,
        total_fees,
        fee_rate,
        settlement_status
    )
    SELECT 
        b.provider_id,
        target_month,
        target_year,
        COUNT(*) as total_bookings,
        SUM(b.amount) as total_amount,
        SUM(b.platform_fee) as total_fees,
        0.00 as fee_rate, -- Fixed fee structure, not percentage-based
        'pending'::settlement_status
    FROM bookings b
    WHERE 
        EXTRACT(MONTH FROM b.created_at) = target_month AND
        EXTRACT(YEAR FROM b.created_at) = target_year AND
        b.status = 'completed'
    GROUP BY b.provider_id
    ON CONFLICT (provider_id, month, year) DO UPDATE
    SET 
        total_bookings = EXCLUDED.total_bookings,
        total_amount = EXCLUDED.total_amount,
        total_fees = EXCLUDED.total_fees,
        settlement_status = CASE 
            WHEN settlements.settlement_status = 'paid' THEN 'paid'
            ELSE EXCLUDED.settlement_status
        END;
END;
$$ LANGUAGE plpgsql;