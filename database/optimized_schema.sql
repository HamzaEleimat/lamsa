-- Lamsa Optimized Database Schema
-- Comprehensive schema implementing all performance optimizations,
-- security policies, and future feature support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enhanced ENUM types for type safety and future features
DO $$ 
BEGIN
    -- Core business ENUMs
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
            'pending', 'confirmed', 'in_progress', 'completed', 
            'cancelled', 'no_show', 'refunded'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM (
            'cash', 'card', 'tap_gateway', 'wallet', 'loyalty_points', 'promotion'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'pending', 'processing', 'completed', 'failed', 'refunded', 'partial_refund'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settlement_status') THEN
        CREATE TYPE settlement_status AS ENUM (
            'pending', 'processing', 'paid', 'failed', 'disputed', 'held'
        );
    END IF;
    
    -- Future feature ENUMs
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            'booking_confirmed', 'booking_reminder', 'booking_cancelled', 
            'review_request', 'promotion_offer', 'loyalty_reward',
            'payment_processed', 'settlement_paid'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_type') THEN
        CREATE TYPE promotion_type AS ENUM (
            'percentage', 'fixed_amount', 'buy_x_get_y', 'loyalty_points',
            'first_time_customer', 'seasonal_offer'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_tier') THEN
        CREATE TYPE user_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language_code') THEN
        CREATE TYPE language_code AS ENUM ('ar', 'en');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_type') THEN
        CREATE TYPE location_type AS ENUM ('salon', 'customer', 'event');
    END IF;
END$$;

-- 1. Service Categories (Reference data - no dependencies)
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (Customers)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    preferred_language language_code DEFAULT 'ar',
    notification_preferences JSONB DEFAULT '{"sms": true, "push": true, "email": false}'::jsonb,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_phone_format CHECK (phone ~ '^\+962[0-9]{9}$'),
    CONSTRAINT users_name_length CHECK (length(trim(name)) >= 2)
);

-- 3. Providers (Service providers)
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(200) NOT NULL,
    business_name_ar VARCHAR(200),
    owner_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    cover_image_url TEXT,
    bio TEXT,
    bio_ar TEXT,
    location geography(POINT, 4326) NOT NULL,
    address TEXT,
    address_ar TEXT,
    city VARCHAR(100),
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0),
    is_mobile BOOLEAN DEFAULT FALSE,
    travel_radius_km INTEGER DEFAULT 5 CHECK (travel_radius_km > 0),
    verified BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    google_maps_url TEXT,
    business_hours JSONB DEFAULT '[]'::jsonb,
    social_media JSONB DEFAULT '{}'::jsonb,
    license_number VARCHAR(50),
    license_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT providers_phone_format CHECK (phone ~ '^\+962[0-9]{9}$'),
    CONSTRAINT providers_business_name_length CHECK (length(trim(business_name)) >= 3),
    CONSTRAINT providers_jordan_location CHECK (
        ST_X(location::geometry) BETWEEN 34.960 AND 39.301 AND
        ST_Y(location::geometry) BETWEEN 29.185 AND 33.375
    )
);

-- 4. Services
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
    name_en VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 1 AND price <= 10000),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 15 AND duration_minutes <= 480),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT services_name_length CHECK (
        length(trim(name_en)) >= 3 AND length(trim(name_ar)) >= 3
    ),
    UNIQUE(provider_id, name_en),
    UNIQUE(provider_id, name_ar)
);

-- 5. Provider Availability
CREATE TABLE IF NOT EXISTS provider_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT availability_time_order CHECK (end_time > start_time),
    UNIQUE(provider_id, day_of_week)
);

-- 6. User Loyalty Status
CREATE TABLE IF NOT EXISTS user_loyalty_status (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
    available_points INTEGER DEFAULT 0 CHECK (available_points >= 0),
    tier user_tier DEFAULT 'bronze',
    tier_achieved_at TIMESTAMPTZ DEFAULT NOW(),
    lifetime_spent DECIMAL(10,2) DEFAULT 0 CHECK (lifetime_spent >= 0),
    total_bookings INTEGER DEFAULT 0 CHECK (total_bookings >= 0),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE,
    title_en VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    promotion_type promotion_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value >= 0),
    max_discount_amount DECIMAL(10,2) CHECK (max_discount_amount >= discount_value OR max_discount_amount IS NULL),
    min_booking_amount DECIMAL(10,2) DEFAULT 0 CHECK (min_booking_amount >= 0),
    applicable_services UUID[],
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER CHECK (usage_limit > 0 OR usage_limit IS NULL),
    used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT promotions_valid_dates CHECK (valid_until > valid_from),
    CONSTRAINT promotions_usage_within_limit CHECK (used_count <= COALESCE(usage_limit, used_count))
);

-- 8. Bookings (Central transaction entity)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status booking_status DEFAULT 'pending',
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    original_price DECIMAL(10,2) NOT NULL CHECK (original_price >= total_price),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    platform_fee DECIMAL(10,2) DEFAULT 0 CHECK (platform_fee >= 0),
    provider_earnings DECIMAL(10,2) DEFAULT 0 CHECK (provider_earnings >= 0),
    payment_method payment_method,
    payment_status payment_status DEFAULT 'pending',
    user_notes TEXT,
    provider_notes TEXT,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(50),
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    location_type location_type DEFAULT 'salon',
    user_location geography(POINT, 4326),
    user_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT bookings_time_order CHECK (end_time > start_time),
    CONSTRAINT bookings_future_date CHECK (booking_date >= CURRENT_DATE),
    CONSTRAINT bookings_max_advance CHECK (booking_date <= CURRENT_DATE + INTERVAL '30 days'),
    CONSTRAINT bookings_price_consistency CHECK (original_price = total_price + discount_amount),
    CONSTRAINT bookings_earnings_consistency CHECK (provider_earnings + platform_fee = total_price)
);

-- 9. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT CHECK (comment IS NULL OR length(trim(comment)) >= 10),
    response TEXT,
    response_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Loyalty Transactions
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL,
    points_change INTEGER NOT NULL,
    points_balance_after INTEGER NOT NULL CHECK (points_balance_after >= 0),
    description_en VARCHAR(200),
    description_ar VARCHAR(200),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Settlements
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
    month SMALLINT NOT NULL CHECK (month >= 1 AND month <= 12),
    year SMALLINT NOT NULL CHECK (year >= 2024),
    total_bookings INTEGER NOT NULL DEFAULT 0 CHECK (total_bookings >= 0),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    total_fees DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_fees >= 0),
    fee_rate DECIMAL(5,2) NOT NULL CHECK (fee_rate >= 0 AND fee_rate <= 100),
    settlement_status settlement_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(provider_id, month, year)
);

-- 12. Promotion Usages
CREATE TABLE IF NOT EXISTS promotion_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    discount_applied DECIMAL(10,2) NOT NULL CHECK (discount_applied >= 0),
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(promotion_id, booking_id)
);

-- 13. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title_en VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200) NOT NULL,
    message_en TEXT,
    message_ar TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT notifications_recipient_required CHECK (
        user_id IS NOT NULL OR provider_id IS NOT NULL
    )
);

-- ============================================================================
-- PERFORMANCE-CRITICAL INDEXES
-- ============================================================================

-- Geospatial indexes (highest priority for location searches)
CREATE INDEX IF NOT EXISTS idx_providers_location_verified_active ON providers 
    USING GIST(location) 
    WHERE verified = TRUE AND active = TRUE;

CREATE INDEX IF NOT EXISTS idx_providers_mobile_location ON providers 
    USING GIST(location) 
    WHERE is_mobile = TRUE AND verified = TRUE;

-- Booking performance indexes
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date_status ON bookings 
    (provider_id, booking_date, status);

CREATE INDEX IF NOT EXISTS idx_bookings_user_created_desc ON bookings 
    (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_provider_time_conflict ON bookings 
    (provider_id, booking_date, start_time, end_time) 
    WHERE status IN ('pending', 'confirmed', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings 
    (status, booking_date) 
    WHERE status IN ('pending', 'confirmed');

-- Service discovery indexes
CREATE INDEX IF NOT EXISTS idx_services_category_provider_active ON services 
    (category_id, provider_id, price) 
    WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_services_price_duration ON services 
    (price, duration_minutes) 
    WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_services_provider_count ON services 
    (provider_id) 
    WHERE active = TRUE;

-- Review and rating indexes
CREATE INDEX IF NOT EXISTS idx_reviews_provider_rating_date ON reviews 
    (provider_id, rating, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_user_date ON reviews 
    (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_recent_public ON reviews 
    (created_at DESC) 
    WHERE created_at > NOW() - INTERVAL '6 months';

-- Financial and settlement indexes
CREATE INDEX IF NOT EXISTS idx_settlements_provider_period ON settlements 
    (provider_id, year, month);

CREATE INDEX IF NOT EXISTS idx_settlements_status_date ON settlements 
    (settlement_status, year, month);

CREATE INDEX IF NOT EXISTS idx_bookings_financial_reporting ON bookings 
    (created_at, status, total_price, platform_fee) 
    WHERE status = 'completed';

-- Loyalty system indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_date ON loyalty_transactions 
    (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_expiry ON loyalty_transactions 
    (expires_at) 
    WHERE expires_at IS NOT NULL AND expires_at > NOW();

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications 
    (user_id, created_at DESC) 
    WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_provider_unread ON notifications 
    (provider_id, created_at DESC) 
    WHERE read_at IS NULL;

-- Promotion indexes
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates ON promotions 
    (valid_from, valid_until) 
    WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions (code) 
    WHERE code IS NOT NULL AND active = TRUE;

-- ============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Booking fee calculation function
CREATE OR REPLACE FUNCTION calculate_booking_fees()
RETURNS TRIGGER AS $$
BEGIN
    NEW.platform_fee := ROUND(NEW.total_price * 0.15, 2);
    NEW.provider_earnings := NEW.total_price - NEW.platform_fee;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Provider rating update function
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE providers
    SET 
        rating = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews
            WHERE provider_id = NEW.provider_id
        ), 0),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE provider_id = NEW.provider_id
        ),
        updated_at = NOW()
    WHERE id = NEW.provider_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Loyalty points calculation
CREATE OR REPLACE FUNCTION calculate_loyalty_points(
    booking_amount DECIMAL(10,2)
) RETURNS INTEGER AS $$
BEGIN
    -- 1 point per JOD spent, minimum 1 point
    RETURN GREATEST(1, FLOOR(booking_amount)::INTEGER);
END;
$$ LANGUAGE plpgsql;

-- Update user tier function
CREATE OR REPLACE FUNCTION update_user_tier(
    p_user_id UUID
) RETURNS user_tier AS $$
DECLARE
    total_points INTEGER;
    new_tier user_tier;
BEGIN
    SELECT total_points INTO total_points 
    FROM user_loyalty_status 
    WHERE user_id = p_user_id;
    
    new_tier := CASE 
        WHEN total_points >= 6000 THEN 'platinum'
        WHEN total_points >= 3000 THEN 'gold'
        WHEN total_points >= 1000 THEN 'silver'
        ELSE 'bronze'
    END;
    
    UPDATE user_loyalty_status 
    SET tier = new_tier,
        tier_achieved_at = CASE WHEN tier != new_tier THEN NOW() ELSE tier_achieved_at END,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN new_tier;
END;
$$ LANGUAGE plpgsql;

-- Loyalty points processing function
CREATE OR REPLACE FUNCTION handle_booking_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
    points_earned INTEGER;
BEGIN
    -- Only process completed bookings
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        points_earned := calculate_loyalty_points(NEW.total_price);
        
        -- Add loyalty transaction
        INSERT INTO loyalty_transactions (
            user_id, booking_id, transaction_type, points_change, 
            points_balance_after, description_en, description_ar,
            expires_at
        ) VALUES (
            NEW.user_id, NEW.id, 'earned', points_earned,
            COALESCE((SELECT total_points FROM user_loyalty_status WHERE user_id = NEW.user_id), 0) + points_earned,
            'Points earned from booking',
            'نقاط مكتسبة من الحجز',
            NOW() + INTERVAL '2 years'
        );
        
        -- Update user loyalty status
        INSERT INTO user_loyalty_status (user_id, total_points, available_points, total_bookings, lifetime_spent)
        VALUES (NEW.user_id, points_earned, points_earned, 1, NEW.total_price)
        ON CONFLICT (user_id) DO UPDATE SET
            total_points = user_loyalty_status.total_points + points_earned,
            available_points = user_loyalty_status.available_points + points_earned,
            total_bookings = user_loyalty_status.total_bookings + 1,
            lifetime_spent = user_loyalty_status.lifetime_spent + NEW.total_price,
            last_activity_at = NOW(),
            updated_at = NOW();
            
        -- Update tier
        PERFORM update_user_tier(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Provider search function with enhanced filtering
CREATE OR REPLACE FUNCTION search_providers_nearby(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km INTEGER DEFAULT 10,
    category_filter UUID DEFAULT NULL,
    min_rating DECIMAL DEFAULT 0,
    max_price DECIMAL DEFAULT NULL
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
    services JSONB,
    avg_price DECIMAL,
    min_price DECIMAL,
    max_price DECIMAL
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
                ) ORDER BY s.price
            ) FILTER (WHERE s.id IS NOT NULL), 
            '[]'
        )::jsonb as services,
        COALESCE(ROUND(AVG(s.price), 2), 0) as avg_price,
        COALESCE(MIN(s.price), 0) as min_price,
        COALESCE(MAX(s.price), 0) as max_price
    FROM providers p
    LEFT JOIN services s ON s.provider_id = p.id AND s.active = TRUE
    WHERE p.verified = TRUE 
    AND p.active = TRUE
    AND p.rating >= min_rating
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
    HAVING (max_price IS NULL OR COALESCE(MIN(s.price), 0) <= max_price)
    ORDER BY distance_km ASC;
END;
$$;

-- Booking availability check function
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
        AND status IN ('confirmed', 'pending', 'in_progress')
        AND (
            (start_time <= p_start_time AND end_time > p_start_time)
            OR (start_time < v_end_time AND end_time >= v_end_time)
            OR (start_time >= p_start_time AND end_time <= v_end_time)
        )
    );
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create triggers for updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_providers_updated_at') THEN
        CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_services_updated_at') THEN
        CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at') THEN
        CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_settlements_updated_at') THEN
        CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON settlements
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Business logic triggers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'calculate_booking_fees_trigger') THEN
        CREATE TRIGGER calculate_booking_fees_trigger BEFORE INSERT OR UPDATE ON bookings
            FOR EACH ROW EXECUTE FUNCTION calculate_booking_fees();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_provider_rating_trigger') THEN
        CREATE TRIGGER update_provider_rating_trigger
            AFTER INSERT OR UPDATE OR DELETE ON reviews
            FOR EACH ROW EXECUTE FUNCTION update_provider_rating();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_booking_loyalty_trigger') THEN
        CREATE TRIGGER handle_booking_loyalty_trigger
            AFTER INSERT OR UPDATE ON bookings
            FOR EACH ROW EXECUTE FUNCTION handle_booking_loyalty_points();
    END IF;
END$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_loyalty_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User policies
DROP POLICY IF EXISTS "users_own_data_only" ON users;
CREATE POLICY "users_own_data_only" ON users
    FOR ALL USING (auth.uid()::text = id::text);

-- Provider policies
DROP POLICY IF EXISTS "providers_public_verified" ON providers;
CREATE POLICY "providers_public_verified" ON providers
    FOR SELECT USING (verified = TRUE AND active = TRUE);

DROP POLICY IF EXISTS "providers_own_profile" ON providers;
CREATE POLICY "providers_own_profile" ON providers
    FOR ALL USING (auth.uid()::text = id::text);

-- Service category policies (public read)
DROP POLICY IF EXISTS "service_categories_public_read" ON service_categories;
CREATE POLICY "service_categories_public_read" ON service_categories
    FOR SELECT USING (active = TRUE);

-- Service policies
DROP POLICY IF EXISTS "services_public_active" ON services;
CREATE POLICY "services_public_active" ON services
    FOR SELECT USING (active = TRUE);

DROP POLICY IF EXISTS "services_provider_management" ON services;
CREATE POLICY "services_provider_management" ON services
    FOR ALL USING (provider_id::text = auth.uid()::text);

-- Provider availability policies
DROP POLICY IF EXISTS "availability_public_read" ON provider_availability;
CREATE POLICY "availability_public_read" ON provider_availability
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "availability_provider_management" ON provider_availability;
CREATE POLICY "availability_provider_management" ON provider_availability
    FOR ALL USING (provider_id::text = auth.uid()::text);

-- Booking policies
DROP POLICY IF EXISTS "bookings_involved_parties" ON bookings;
CREATE POLICY "bookings_involved_parties" ON bookings
    FOR SELECT USING (
        user_id::text = auth.uid()::text OR 
        provider_id::text = auth.uid()::text
    );

DROP POLICY IF EXISTS "bookings_user_creation" ON bookings;
CREATE POLICY "bookings_user_creation" ON bookings
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "bookings_party_updates" ON bookings;
CREATE POLICY "bookings_party_updates" ON bookings
    FOR UPDATE USING (
        user_id::text = auth.uid()::text OR 
        provider_id::text = auth.uid()::text
    );

-- Review policies
DROP POLICY IF EXISTS "reviews_public_recent" ON reviews;
CREATE POLICY "reviews_public_recent" ON reviews
    FOR SELECT USING (
        created_at > NOW() - INTERVAL '2 years' OR
        user_id::text = auth.uid()::text OR
        provider_id::text = auth.uid()::text
    );

DROP POLICY IF EXISTS "reviews_own_bookings_only" ON reviews;
CREATE POLICY "reviews_own_bookings_only" ON reviews
    FOR INSERT WITH CHECK (
        user_id::text = auth.uid()::text AND
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id 
            AND user_id::text = auth.uid()::text 
            AND status = 'completed'
        )
    );

-- Settlement policies
DROP POLICY IF EXISTS "settlements_provider_only" ON settlements;
CREATE POLICY "settlements_provider_only" ON settlements
    FOR ALL USING (provider_id::text = auth.uid()::text);

-- Loyalty policies
DROP POLICY IF EXISTS "loyalty_status_own_data" ON user_loyalty_status;
CREATE POLICY "loyalty_status_own_data" ON user_loyalty_status
    FOR ALL USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "loyalty_transactions_own_data" ON loyalty_transactions;
CREATE POLICY "loyalty_transactions_own_data" ON loyalty_transactions
    FOR ALL USING (user_id::text = auth.uid()::text);

-- Promotion policies
DROP POLICY IF EXISTS "promotions_public_active" ON promotions;
CREATE POLICY "promotions_public_active" ON promotions
    FOR SELECT USING (
        active = TRUE AND 
        valid_from <= NOW() AND 
        valid_until >= NOW()
    );

DROP POLICY IF EXISTS "promotions_provider_management" ON promotions;
CREATE POLICY "promotions_provider_management" ON promotions
    FOR ALL USING (provider_id::text = auth.uid()::text);

-- Notification policies
DROP POLICY IF EXISTS "notifications_recipient_only" ON notifications;
CREATE POLICY "notifications_recipient_only" ON notifications
    FOR ALL USING (
        user_id::text = auth.uid()::text OR 
        provider_id::text = auth.uid()::text
    );

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert service categories if table is empty
INSERT INTO service_categories (name_en, name_ar, icon, display_order) 
SELECT * FROM (VALUES
    ('Hair Styling', 'تصفيف الشعر', 'scissors', 1),
    ('Makeup', 'مكياج', 'palette', 2),
    ('Nails', 'أظافر', 'brush', 3),
    ('Skincare', 'العناية بالبشرة', 'sparkles', 4),
    ('Massage', 'مساج', 'hand', 5),
    ('Eyebrows & Lashes', 'حواجب ورموش', 'eye', 6),
    ('Hair Removal', 'إزالة الشعر', 'laser', 7),
    ('Beauty Clinic', 'عيادة تجميل', 'clinic', 8)
) AS v(name_en, name_ar, icon, display_order)
WHERE NOT EXISTS (SELECT 1 FROM service_categories);

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Lamsa optimized database schema created successfully!';
    RAISE NOTICE 'Schema includes: % tables, % indexes, % functions, % triggers', 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'),
        (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'),
        (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public');
END$$;
