# Lamsa Comprehensive Database Requirements & Design

## Executive Summary

This document provides a complete database requirements analysis for Lamsa, including entity relationships, performance optimization, security policies, and future-proofing for planned features like promotions and loyalty programs.

## 1. Entity Relationship Analysis

### 1.1 Core Entities & Relationships

```
Users (Customers)
├── 1:N → Bookings (user_id)
├── 1:N → Reviews (user_id) 
├── 1:1 → Loyalty Status (user_id)
└── 1:N → Notifications (user_id)

Providers (Service Providers)
├── 1:N → Services (provider_id)
├── 1:N → Provider Availability (provider_id)
├── 1:N → Bookings (provider_id)
├── 1:N → Reviews (provider_id - received)
├── 1:N → Settlements (provider_id)
├── 1:N → Promotions (provider_id)
└── 1:N → Notifications (provider_id)

Service Categories (Reference Data)
└── 1:N → Services (category_id)

Services
├── N:1 → Providers (provider_id)
├── N:1 → Service Categories (category_id)
└── 1:N → Bookings (service_id)

Bookings (Central Transaction Entity)
├── N:1 → Users (user_id)
├── N:1 → Providers (provider_id)
├── N:1 → Services (service_id)
├── 1:1 → Reviews (booking_id)
├── 1:1 → Loyalty Transactions (booking_id)
└── 1:N → Notifications (booking_id)
```

### 1.2 Foreign Key Relationships & Cascade Strategy

**CASCADE DELETE (Child data meaningless without parent):**
- `providers.id → services.*` - Provider services are meaningless without provider
- `providers.id → provider_availability.*` - Availability tied to provider lifecycle
- `bookings.id → reviews.*` - Reviews tied to specific booking transaction
- `users.id → loyalty_status.*` - Loyalty status is user-specific
- `bookings.id → loyalty_transactions.*` - Loyalty points tied to booking

**RESTRICT DELETE (Preserve historical data):**
- `users.id ← bookings.user_id` - Preserve booking history for analytics
- `providers.id ← bookings.provider_id` - Maintain service delivery records
- `services.id ← bookings.service_id` - Keep service records for business intelligence
- `service_categories.id ← services.category_id` - Prevent category deletion if services exist

**SET NULL (Optional references):**
- `promotions.id ← bookings.promotion_id` - Booking remains valid if promotion deleted

## 2. Enhanced ENUM Types for Type Safety

### 2.1 Core Business ENUMs

```sql
-- Booking lifecycle with additional states
CREATE TYPE booking_status AS ENUM (
    'pending',      -- Initial state, awaiting provider confirmation
    'confirmed',    -- Provider accepted, appointment scheduled
    'in_progress',  -- Service currently being delivered
    'completed',    -- Service finished successfully
    'cancelled',    -- Cancelled by customer or provider
    'no_show',      -- Customer didn't arrive
    'refunded'      -- Payment returned to customer
);

-- Expanded payment options
CREATE TYPE payment_method AS ENUM (
    'cash',         -- Cash on delivery
    'card',         -- Credit/debit card via Tap Gateway
    'tap_gateway',  -- Tap payment gateway
    'wallet',       -- Digital wallet
    'loyalty_points', -- Paid using loyalty points
    'promotion'     -- Free via promotion
);

-- Payment transaction status
CREATE TYPE payment_status AS ENUM (
    'pending',      -- Payment not yet processed
    'processing',   -- Payment being processed
    'completed',    -- Payment successful
    'failed',       -- Payment failed
    'refunded',     -- Payment refunded
    'partial_refund' -- Partial refund issued
);

-- Settlement processing states
CREATE TYPE settlement_status AS ENUM (
    'pending',      -- Ready for processing
    'processing',   -- Payment being sent
    'paid',         -- Successfully paid
    'failed',       -- Payment failed
    'disputed',     -- Settlement under dispute
    'held'          -- Settlement on hold
);
```

### 2.2 Future Feature ENUMs

```sql
-- Notification system
CREATE TYPE notification_type AS ENUM (
    'booking_confirmed',    -- Booking confirmed by provider
    'booking_reminder',     -- Upcoming appointment reminder
    'booking_cancelled',    -- Booking cancellation notice
    'review_request',       -- Request to leave review
    'promotion_offer',      -- Special promotion available
    'loyalty_reward',       -- Loyalty points earned/redeemed
    'payment_processed',    -- Payment confirmation
    'settlement_paid'       -- Provider payment processed
);

-- Promotion system
CREATE TYPE promotion_type AS ENUM (
    'percentage',           -- X% discount
    'fixed_amount',         -- Fixed JOD amount off
    'buy_x_get_y',         -- Buy X services, get Y free
    'loyalty_points',       -- Earn extra loyalty points
    'first_time_customer',  -- New customer discount
    'seasonal_offer'        -- Seasonal promotions
);

-- Loyalty tier system
CREATE TYPE user_tier AS ENUM (
    'bronze',    -- 0-999 points
    'silver',    -- 1000-2999 points  
    'gold',      -- 3000-5999 points
    'platinum'   -- 6000+ points
);

-- Language preferences
CREATE TYPE language_code AS ENUM ('ar', 'en');

-- Location types for mobile services
CREATE TYPE location_type AS ENUM (
    'salon',     -- At provider's location
    'customer',  -- At customer's location (mobile service)
    'event'      -- Special event location
);
```

## 3. Performance-Critical Indexes

### 3.1 Geospatial Indexes (Highest Priority)

```sql
-- Primary location search index with conditions
CREATE INDEX idx_providers_location_verified_active ON providers 
    USING GIST(location) 
    WHERE verified = TRUE AND active = TRUE;

-- Mobile provider search with travel radius
CREATE INDEX idx_providers_mobile_location ON providers 
    USING GIST(location, travel_radius_km) 
    WHERE is_mobile = TRUE AND verified = TRUE;
```

### 3.2 Booking Performance Indexes

```sql
-- Provider booking management (most frequent query)
CREATE INDEX idx_bookings_provider_date_status ON bookings 
    (provider_id, booking_date, status);

-- User booking history with pagination
CREATE INDEX idx_bookings_user_created_desc ON bookings 
    (user_id, created_at DESC);

-- Availability checking for booking conflicts
CREATE INDEX idx_bookings_provider_time_conflict ON bookings 
    (provider_id, booking_date, start_time, end_time) 
    WHERE status IN ('pending', 'confirmed', 'in_progress');

-- Status-based filtering
CREATE INDEX idx_bookings_status_date ON bookings 
    (status, booking_date) 
    WHERE status IN ('pending', 'confirmed');
```

### 3.3 Service Discovery Indexes

```sql
-- Service search by category and provider
CREATE INDEX idx_services_category_provider_active ON services 
    (category_id, provider_id, price) 
    WHERE active = TRUE;

-- Price range filtering
CREATE INDEX idx_services_price_duration ON services 
    (price, duration_minutes) 
    WHERE active = TRUE;

-- Provider service count for listings
CREATE INDEX idx_services_provider_count ON services 
    (provider_id) 
    WHERE active = TRUE;
```

### 3.4 Review and Rating Indexes

```sql
-- Provider rating calculations (updated frequently)
CREATE INDEX idx_reviews_provider_rating_date ON reviews 
    (provider_id, rating, created_at DESC);

-- User review history
CREATE INDEX idx_reviews_user_date ON reviews 
    (user_id, created_at DESC);

-- Recent reviews for public display
CREATE INDEX idx_reviews_recent_public ON reviews 
    (created_at DESC) 
    WHERE created_at > NOW() - INTERVAL '6 months';
```

### 3.5 Financial and Settlement Indexes

```sql
-- Monthly settlement generation
CREATE INDEX idx_settlements_provider_period ON settlements 
    (provider_id, year, month);

-- Settlement status tracking
CREATE INDEX idx_settlements_status_date ON settlements 
    (settlement_status, year, month);

-- Financial reporting
CREATE INDEX idx_bookings_financial_reporting ON bookings 
    (created_at, status, total_price, platform_fee) 
    WHERE status = 'completed';
```

## 4. Comprehensive Row Level Security (RLS) Policies

### 4.1 User Data Protection

```sql
-- Users: Complete privacy for personal data
CREATE POLICY "users_own_data_only" ON users
    FOR ALL USING (auth.uid()::text = id::text);

-- User loyalty status: Own data only
CREATE POLICY "loyalty_own_data_only" ON user_loyalty_status
    FOR ALL USING (auth.uid()::text = user_id::text);
```

### 4.2 Provider Data Access

```sql
-- Providers: Public verified profiles, private unverified
CREATE POLICY "providers_public_verified" ON providers
    FOR SELECT USING (verified = TRUE AND active = TRUE);

CREATE POLICY "providers_own_profile" ON providers
    FOR ALL USING (auth.uid()::text = id::text);

-- Provider services: Public if active, provider manages own
CREATE POLICY "services_public_active" ON services
    FOR SELECT USING (active = TRUE);

CREATE POLICY "services_provider_management" ON services
    FOR ALL USING (provider_id::text = auth.uid()::text);
```

### 4.3 Booking Privacy

```sql
-- Bookings: Visible to involved parties only
CREATE POLICY "bookings_involved_parties" ON bookings
    FOR SELECT USING (
        user_id::text = auth.uid()::text OR 
        provider_id::text = auth.uid()::text
    );

-- Booking creation: Users create for themselves
CREATE POLICY "bookings_user_creation" ON bookings
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Booking updates: Both parties can update
CREATE POLICY "bookings_party_updates" ON bookings
    FOR UPDATE USING (
        user_id::text = auth.uid()::text OR 
        provider_id::text = auth.uid()::text
    );
```

### 4.4 Review System Security

```sql
-- Reviews: Public read access for recent reviews
CREATE POLICY "reviews_public_recent" ON reviews
    FOR SELECT USING (
        created_at > NOW() - INTERVAL '2 years' OR
        user_id::text = auth.uid()::text OR
        provider_id::text = auth.uid()::text
    );

-- Review creation: Only for own completed bookings
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
```

### 4.5 Financial Data Security

```sql
-- Settlements: Provider views own only
CREATE POLICY "settlements_provider_only" ON settlements
    FOR ALL USING (provider_id::text = auth.uid()::text);

-- Loyalty transactions: User views own only  
CREATE POLICY "loyalty_transactions_user_only" ON loyalty_transactions
    FOR ALL USING (user_id::text = auth.uid()::text);
```

## 5. Table Creation Order (Dependency-Aware)

### Phase 1: Foundation (No Dependencies)
1. **Extensions & ENUMs**
2. **service_categories** - Reference data
3. **users** - Independent entity
4. **providers** - Independent entity

### Phase 2: Core Business Logic
5. **services** - Depends on providers, categories
6. **provider_availability** - Depends on providers
7. **user_loyalty_status** - Depends on users

### Phase 3: Transaction Layer
8. **bookings** - Depends on users, providers, services
9. **reviews** - Depends on bookings
10. **loyalty_transactions** - Depends on users, bookings

### Phase 4: Financial & Management
11. **settlements** - Depends on providers, bookings
12. **promotions** - Depends on providers

### Phase 5: Communication & Future Features
13. **notifications** - Depends on users, providers, bookings
14. **promotion_usages** - Depends on promotions, users, bookings

## 6. Future Feature Database Design

### 6.1 Promotions System

```sql
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE, -- Optional promo code
    title_en VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    promotion_type promotion_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value >= 0),
    max_discount_amount DECIMAL(10,2), -- Cap for percentage discounts
    min_booking_amount DECIMAL(10,2) DEFAULT 0,
    applicable_services UUID[], -- Array of service IDs, NULL = all services
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER, -- NULL = unlimited
    used_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (valid_until > valid_from),
    CONSTRAINT usage_within_limit CHECK (used_count <= COALESCE(usage_limit, used_count))
);

CREATE TABLE promotion_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    discount_applied DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promotion_id, booking_id)
);
```

### 6.2 Enhanced Loyalty System

```sql
CREATE TABLE user_loyalty_status (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
    available_points INTEGER DEFAULT 0 CHECK (available_points >= 0),
    tier user_tier DEFAULT 'bronze',
    tier_achieved_at TIMESTAMPTZ DEFAULT NOW(),
    lifetime_spent DECIMAL(10,2) DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'earned', 'redeemed', 'expired', 'bonus'
    points_change INTEGER NOT NULL, -- Positive for earned, negative for spent
    points_balance_after INTEGER NOT NULL,
    description_en VARCHAR(200),
    description_ar VARCHAR(200),
    expires_at TIMESTAMPTZ, -- For earned points
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 Notification System

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title_en VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200) NOT NULL,
    message_en TEXT,
    message_ar TEXT,
    data JSONB DEFAULT '{}', -- Additional structured data
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_or_provider_required CHECK (
        user_id IS NOT NULL OR provider_id IS NOT NULL
    )
);
```

## 7. Advanced Database Functions

### 7.1 Loyalty Points Management

```sql
CREATE OR REPLACE FUNCTION calculate_loyalty_points(
    booking_amount DECIMAL(10,2)
) RETURNS INTEGER AS $$
BEGIN
    -- 1 point per JOD spent, minimum 1 point
    RETURN GREATEST(1, FLOOR(booking_amount)::INTEGER);
END;
$$ LANGUAGE plpgsql;

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
        tier_achieved_at = CASE WHEN tier != new_tier THEN NOW() ELSE tier_achieved_at END
    WHERE user_id = p_user_id;
    
    RETURN new_tier;
END;
$$ LANGUAGE plpgsql;
```

### 7.2 Promotion Validation

```sql
CREATE OR REPLACE FUNCTION validate_promotion_usage(
    p_promotion_id UUID,
    p_user_id UUID,
    p_booking_amount DECIMAL(10,2),
    p_service_id UUID
) RETURNS JSONB AS $$
DECLARE
    promo RECORD;
    usage_count INTEGER;
    result JSONB;
BEGIN
    -- Get promotion details
    SELECT * INTO promo FROM promotions WHERE id = p_promotion_id AND active = TRUE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Promotion not found or inactive');
    END IF;
    
    -- Check date validity
    IF NOW() < promo.valid_from OR NOW() > promo.valid_until THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Promotion expired');
    END IF;
    
    -- Check minimum amount
    IF p_booking_amount < promo.min_booking_amount THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Minimum booking amount not met');
    END IF;
    
    -- Check usage limit
    IF promo.usage_limit IS NOT NULL AND promo.used_count >= promo.usage_limit THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Promotion usage limit reached');
    END IF;
    
    -- Check if user already used this promotion
    SELECT COUNT(*) INTO usage_count 
    FROM promotion_usages 
    WHERE promotion_id = p_promotion_id AND user_id = p_user_id;
    
    IF usage_count > 0 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Promotion already used by user');
    END IF;
    
    -- Check applicable services
    IF promo.applicable_services IS NOT NULL AND NOT (p_service_id = ANY(promo.applicable_services)) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Service not eligible for promotion');
    END IF;
    
    -- Calculate discount
    DECLARE
        discount DECIMAL(10,2);
    BEGIN
        discount := CASE promo.promotion_type
            WHEN 'percentage' THEN 
                LEAST(
                    p_booking_amount * promo.discount_value / 100,
                    COALESCE(promo.max_discount_amount, p_booking_amount)
                )
            WHEN 'fixed_amount' THEN 
                LEAST(promo.discount_value, p_booking_amount)
            ELSE 0
        END;
        
        RETURN jsonb_build_object(
            'valid', true, 
            'discount_amount', discount,
            'final_amount', p_booking_amount - discount
        );
    END;
END;
$$ LANGUAGE plpgsql;
```

## 8. Database Triggers for Business Logic

### 8.1 Automatic Loyalty Points

```sql
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
            points_balance_after, description_en, description_ar
        ) VALUES (
            NEW.user_id, NEW.id, 'earned', points_earned,
            (SELECT total_points + points_earned FROM user_loyalty_status WHERE user_id = NEW.user_id),
            'Points earned from booking',
            'نقاط مكتسبة من الحجز'
        );
        
        -- Update user loyalty status
        INSERT INTO user_loyalty_status (user_id, total_points, available_points, total_bookings)
        VALUES (NEW.user_id, points_earned, points_earned, 1)
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

CREATE TRIGGER trigger_booking_loyalty_points
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION handle_booking_loyalty_points();
```

## 9. Data Migration Strategy

### 9.1 Migration from Current Schema

```sql
-- Migration script to consolidate existing schemas
-- Handle differences between the two current schema versions

-- Add missing columns to existing tables
DO $$ 
BEGIN
    -- Users table enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- Providers table enhancements  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers' AND column_name = 'is_mobile') THEN
        ALTER TABLE providers ADD COLUMN is_mobile BOOLEAN DEFAULT FALSE;
        ALTER TABLE providers ADD COLUMN travel_radius_km INTEGER DEFAULT 5;
    END IF;
    
    -- Bookings table enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'location_type') THEN
        ALTER TABLE bookings ADD COLUMN location_type location_type DEFAULT 'salon';
        ALTER TABLE bookings ADD COLUMN user_location geography(POINT, 4326);
        ALTER TABLE bookings ADD COLUMN user_address TEXT;
    END IF;
END$$;
```

## 10. Monitoring and Maintenance

### 10.1 Performance Monitoring Queries

```sql
-- Monitor slow queries on location searches
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
WHERE query LIKE '%ST_Distance%' OR query LIKE '%GIST%'
ORDER BY mean_time DESC;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Monitor table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY size_bytes DESC;
```

### 10.2 Automated Maintenance Tasks

```sql
-- Daily cleanup of old notifications (30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND read_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Monthly loyalty points expiration (2 years)
CREATE OR REPLACE FUNCTION expire_old_loyalty_points()
RETURNS INTEGER AS $$
DECLARE
    expired_points INTEGER;
BEGIN
    -- Mark points as expired
    INSERT INTO loyalty_transactions (
        user_id, transaction_type, points_change, points_balance_after,
        description_en, description_ar
    )
    SELECT 
        lt.user_id,
        'expired',
        -SUM(lt.points_change),
        uls.available_points - SUM(lt.points_change),
        'Points expired after 2 years',
        'انتهت صلاحية النقاط بعد سنتين'
    FROM loyalty_transactions lt
    JOIN user_loyalty_status uls ON uls.user_id = lt.user_id
    WHERE lt.expires_at < NOW()
    AND lt.transaction_type = 'earned'
    GROUP BY lt.user_id, uls.available_points;
    
    GET DIAGNOSTICS expired_points = ROW_COUNT;
    
    -- Update user balances
    UPDATE user_loyalty_status 
    SET available_points = available_points - (
        SELECT COALESCE(SUM(points_change), 0)
        FROM loyalty_transactions 
        WHERE user_id = user_loyalty_status.user_id
        AND expires_at < NOW()
        AND transaction_type = 'earned'
    );
    
    RETURN expired_points;
END;
$$ LANGUAGE plpgsql;
```

This comprehensive database plan addresses all current requirements while providing a solid foundation for future features. The design emphasizes performance, security, and maintainability while ensuring data integrity through proper constraints and relationships.
