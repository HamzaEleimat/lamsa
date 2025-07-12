# Database Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from the current BeautyCort database schemas to the optimized unified schema.

## Pre-Migration Checklist

### 1. Backup Current Database
```sql
-- Create backup
pg_dump beautycort_db > backup_$(date +%Y%m%d_%H%M%S).sql

-- Or using Supabase CLI
supabase db dump --local > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Identify Current Schema Version
```sql
-- Check if reviews table exists (missing in newer schema)
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'reviews' AND table_schema = 'public'
);

-- Check for newer columns (is_mobile, etc.)
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'providers' AND table_schema = 'public'
ORDER BY column_name;
```

## Migration Strategy

### Phase 1: Schema Compatibility Updates

#### 1.1 Add Missing Columns to Existing Tables

```sql
-- Users table enhancements
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'notification_preferences') THEN
        ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{"sms": true, "push": true, "email": false}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'active') THEN
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT TRUE;
    END IF;
END$$;

-- Providers table enhancements
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers' AND column_name = 'is_mobile') THEN
        ALTER TABLE providers ADD COLUMN is_mobile BOOLEAN DEFAULT FALSE;
        ALTER TABLE providers ADD COLUMN travel_radius_km INTEGER DEFAULT 5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers' AND column_name = 'cover_image_url') THEN
        ALTER TABLE providers ADD COLUMN cover_image_url TEXT;
        ALTER TABLE providers ADD COLUMN bio TEXT;
        ALTER TABLE providers ADD COLUMN bio_ar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers' AND column_name = 'google_maps_url') THEN
        ALTER TABLE providers ADD COLUMN google_maps_url TEXT;
        ALTER TABLE providers ADD COLUMN business_hours JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE providers ADD COLUMN social_media JSONB DEFAULT '{}'::jsonb;
    END IF;
END$$;

-- Bookings table enhancements
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'location_type') THEN
        ALTER TABLE bookings ADD COLUMN location_type VARCHAR(50) DEFAULT 'salon';
        ALTER TABLE bookings ADD COLUMN user_location geography(POINT, 4326);
        ALTER TABLE bookings ADD COLUMN user_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'original_price') THEN
        ALTER TABLE bookings ADD COLUMN original_price DECIMAL(10,2);
        ALTER TABLE bookings ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
        ALTER TABLE bookings ADD COLUMN promotion_id UUID REFERENCES promotions(id);
        
        -- Populate original_price with current total_price for existing records
        UPDATE bookings SET original_price = total_price WHERE original_price IS NULL;
        
        -- Make original_price NOT NULL after populating
        ALTER TABLE bookings ALTER COLUMN original_price SET NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
    END IF;
END$$;
```

#### 1.2 Update ENUM Types

```sql
-- Add new values to existing ENUMs
DO $$
BEGIN
    -- Extend booking_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_progress' AND enumtypid = 'booking_status'::regtype) THEN
        ALTER TYPE booking_status ADD VALUE 'in_progress' AFTER 'confirmed';
        ALTER TYPE booking_status ADD VALUE 'refunded' AFTER 'no_show';
    END IF;
    
    -- Extend payment_method enum
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tap_gateway' AND enumtypid = 'payment_method'::regtype) THEN
        ALTER TYPE payment_method ADD VALUE 'tap_gateway' AFTER 'card';
        ALTER TYPE payment_method ADD VALUE 'wallet' AFTER 'tap_gateway';
        ALTER TYPE payment_method ADD VALUE 'loyalty_points' AFTER 'wallet';
        ALTER TYPE payment_method ADD VALUE 'promotion' AFTER 'loyalty_points';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Ignore if enum values already exist
END$$;
```

### Phase 2: Create Missing Tables

```sql
-- Execute the following in order:

-- 1. User Loyalty Status
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

-- 2. Promotions
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
    
    CONSTRAINT promotions_valid_dates CHECK (valid_until > valid_from),
    CONSTRAINT promotions_usage_within_limit CHECK (used_count <= COALESCE(usage_limit, used_count))
);

-- 3. Loyalty Transactions
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

-- 4. Promotion Usages
CREATE TABLE IF NOT EXISTS promotion_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    discount_applied DECIMAL(10,2) NOT NULL CHECK (discount_applied >= 0),
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(promotion_id, booking_id)
);

-- 5. Notifications
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

-- 6. Reviews (if missing)
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
```

### Phase 3: Add Performance Indexes

```sql
-- Execute all index creation statements from optimized_schema.sql
-- These are safe to run multiple times due to IF NOT EXISTS clauses

-- High priority indexes first:
CREATE INDEX IF NOT EXISTS idx_providers_location_verified_active ON providers 
    USING GIST(location) 
    WHERE verified = TRUE AND active = TRUE;

CREATE INDEX IF NOT EXISTS idx_bookings_provider_date_status ON bookings 
    (provider_id, booking_date, status);

CREATE INDEX IF NOT EXISTS idx_bookings_user_created_desc ON bookings 
    (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_services_category_provider_active ON services 
    (category_id, provider_id, price) 
    WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_reviews_provider_rating_date ON reviews 
    (provider_id, rating, created_at DESC);

-- Continue with all other indexes from optimized_schema.sql...
```

### Phase 4: Update Functions and Triggers

```sql
-- Drop and recreate functions (safe as they're stateless)
DROP FUNCTION IF EXISTS search_providers_nearby CASCADE;
DROP FUNCTION IF EXISTS check_provider_availability CASCADE;

-- Recreate with enhanced versions from optimized_schema.sql
-- [Include all function definitions from optimized_schema.sql]

-- Update triggers
-- [Include all trigger definitions with IF NOT EXISTS checks from optimized_schema.sql]
```

### Phase 5: Update RLS Policies

```sql
-- Drop existing policies and recreate with enhanced versions
-- [Include all RLS policy updates from optimized_schema.sql]
```

## Data Migration Scripts

### Migrate Existing Provider Data

```sql
-- Update provider location format if needed
UPDATE providers 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE location IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;

-- Populate missing business_name_ar if needed
UPDATE providers 
SET business_name_ar = business_name 
WHERE business_name_ar IS NULL OR business_name_ar = '';

-- Set default mobile service parameters
UPDATE providers 
SET is_mobile = FALSE,
    travel_radius_km = 5
WHERE is_mobile IS NULL;
```

### Initialize Loyalty System for Existing Users

```sql
-- Create loyalty status for existing users
INSERT INTO user_loyalty_status (
    user_id, 
    total_points, 
    available_points, 
    tier,
    total_bookings,
    lifetime_spent
)
SELECT 
    u.id,
    COALESCE(SUM(calculate_loyalty_points(b.total_price)), 0) as total_points,
    COALESCE(SUM(calculate_loyalty_points(b.total_price)), 0) as available_points,
    CASE 
        WHEN COALESCE(SUM(calculate_loyalty_points(b.total_price)), 0) >= 6000 THEN 'platinum'::user_tier
        WHEN COALESCE(SUM(calculate_loyalty_points(b.total_price)), 0) >= 3000 THEN 'gold'::user_tier
        WHEN COALESCE(SUM(calculate_loyalty_points(b.total_price)), 0) >= 1000 THEN 'silver'::user_tier
        ELSE 'bronze'::user_tier
    END as tier,
    COUNT(b.id) as total_bookings,
    COALESCE(SUM(b.total_price), 0) as lifetime_spent
FROM users u
LEFT JOIN bookings b ON b.user_id = u.id AND b.status = 'completed'
WHERE NOT EXISTS (SELECT 1 FROM user_loyalty_status WHERE user_id = u.id)
GROUP BY u.id;

-- Create historical loyalty transactions
INSERT INTO loyalty_transactions (
    user_id,
    booking_id,
    transaction_type,
    points_change,
    points_balance_after,
    description_en,
    description_ar,
    created_at,
    expires_at
)
SELECT 
    b.user_id,
    b.id,
    'earned',
    calculate_loyalty_points(b.total_price),
    -- Calculate running total (this is simplified, might need adjustment)
    calculate_loyalty_points(b.total_price),
    'Historical points from booking',
    'نقاط تاريخية من الحجز',
    b.completed_at,
    b.completed_at + INTERVAL '2 years'
FROM bookings b
WHERE b.status = 'completed'
AND b.completed_at IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM loyalty_transactions 
    WHERE booking_id = b.id
);
```

## Validation Scripts

### Verify Migration Success

```sql
-- Check table counts
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'providers', COUNT(*) FROM providers
UNION ALL
SELECT 'services', COUNT(*) FROM services
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'user_loyalty_status', COUNT(*) FROM user_loyalty_status
UNION ALL
SELECT 'loyalty_transactions', COUNT(*) FROM loyalty_transactions;

-- Verify indexes exist
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type;
```

### Performance Testing

```sql
-- Test geospatial search performance
EXPLAIN ANALYZE
SELECT * FROM search_providers_nearby(31.9539, 35.9106, 10);

-- Test booking queries
EXPLAIN ANALYZE
SELECT * FROM bookings 
WHERE user_id = 'test-user-id' 
ORDER BY created_at DESC 
LIMIT 10;

-- Test provider rating calculations
EXPLAIN ANALYZE
SELECT p.*, AVG(r.rating) as avg_rating
FROM providers p
LEFT JOIN reviews r ON r.provider_id = p.id
WHERE p.verified = TRUE
GROUP BY p.id
ORDER BY avg_rating DESC;
```

## Rollback Plan

### Emergency Rollback

```sql
-- 1. Restore from backup
psql beautycort_db < backup_YYYYMMDD_HHMMSS.sql

-- 2. Or drop new tables and revert schema
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS promotion_usages CASCADE;
DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS user_loyalty_status CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;

-- 3. Remove added columns
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE users DROP COLUMN IF EXISTS notification_preferences;
ALTER TABLE users DROP COLUMN IF EXISTS active;
-- Continue for other added columns...
```

## Post-Migration Tasks

### 1. Update Application Configuration

```typescript
// Update database types
// Copy the new types from optimized_schema.sql to your TypeScript definitions

// Update API endpoints to handle new fields
// Test all CRUD operations with new schema

// Update authentication to use new RLS policies
// Verify all user access patterns work correctly
```

### 2. Monitor Performance

```sql
-- Set up monitoring for new indexes
SELECT * FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- Monitor query performance
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 3. Test New Features

1. **Loyalty System**: Create test bookings and verify points calculation
2. **Promotions**: Create test promotions and validate discount logic
3. **Notifications**: Test notification creation and delivery
4. **Enhanced Search**: Verify location-based search with new filters

## Timeline Estimate

- **Phase 1-2 (Schema Updates)**: 30 minutes
- **Phase 3 (Indexes)**: 1-2 hours depending on data size
- **Phase 4-5 (Functions/RLS)**: 30 minutes
- **Data Migration**: 1-3 hours depending on data volume
- **Validation & Testing**: 2-4 hours
- **Total Estimated Time**: 5-10 hours

## Safety Considerations

1. **Perform migration during low-traffic hours**
2. **Have rollback plan ready**
3. **Test on staging environment first**
4. **Monitor application logs during migration**
5. **Keep database backup for at least 7 days post-migration**

This migration preserves all existing data while adding new functionality and performance improvements.
