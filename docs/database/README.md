# Lamsa Database Documentation

## Overview

Lamsa uses a PostgreSQL database with PostGIS extension for geospatial operations. The database is hosted on Supabase and implements comprehensive business logic through triggers, functions, and Row Level Security (RLS) policies.

## Quick Reference

### Core Tables
- **`users`** - Customer accounts with phone-based authentication
- **`providers`** - Service providers with geolocation support  
- **`services`** - Available beauty services by category
- **`bookings`** - Central booking management with lifecycle tracking
- **`reviews`** - Customer reviews and provider ratings
- **`service_categories`** - Service classification system

### Business Logic Tables
- **`user_loyalty_status`** - Loyalty program points and tiers
- **`loyalty_transactions`** - Points earning and spending history
- **`promotions`** - Discount codes and promotional offers
- **`settlements`** - Provider payment settlements
- **`notifications`** - In-app notification system

### Geographic Features
- **PostGIS Integration**: Proximity searches and distance calculations
- **Jordan-specific Validation**: Geographic boundaries and address formats
- **Mobile Service Support**: Travel radius for home service providers

## Database Schema Overview

```mermaid
erDiagram
    users {
        uuid id PK
        varchar phone UK "Jordan format +962XXXXXXXXX"
        varchar name
        varchar email UK
        language_code preferred_language
        jsonb notification_preferences
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }
    
    providers {
        uuid id PK
        varchar business_name
        varchar business_name_ar
        varchar owner_name
        varchar phone UK "Jordan format"
        varchar email UK
        text password_hash
        geography location "PostGIS POINT"
        text address
        text address_ar
        decimal rating "0.00-5.00"
        integer total_reviews
        boolean is_mobile
        integer travel_radius_km
        boolean verified
        boolean active
        jsonb business_hours
        timestamptz created_at
        timestamptz updated_at
    }
    
    service_categories {
        uuid id PK
        varchar name_en UK
        varchar name_ar UK
        varchar icon
        integer display_order
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }
    
    services {
        uuid id PK
        uuid provider_id FK
        uuid category_id FK
        varchar name_en
        varchar name_ar
        text description_en
        text description_ar
        decimal price "1.00-10000.00 JOD"
        integer duration_minutes "15-480"
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }
    
    bookings {
        uuid id PK
        uuid user_id FK
        uuid provider_id FK
        uuid service_id FK
        uuid promotion_id FK
        date booking_date
        time start_time
        time end_time
        booking_status status
        decimal total_price
        decimal original_price
        decimal discount_amount
        decimal platform_fee
        decimal provider_earnings
        payment_method payment_method
        payment_status payment_status
        text user_notes
        text provider_notes
        location_type location_type
        geography user_location
        text user_address
        timestamptz created_at
        timestamptz updated_at
    }
    
    reviews {
        uuid id PK
        uuid booking_id FK UK
        uuid user_id FK
        uuid provider_id FK
        smallint rating "1-5"
        text comment
        text response
        timestamptz response_at
        timestamptz created_at
    }
    
    user_loyalty_status {
        uuid user_id PK FK
        integer total_points
        integer available_points
        user_tier tier
        timestamptz tier_achieved_at
        decimal lifetime_spent
        integer total_bookings
        timestamptz last_activity_at
        timestamptz created_at
        timestamptz updated_at
    }
    
    loyalty_transactions {
        uuid id PK
        uuid user_id FK
        uuid booking_id FK
        varchar transaction_type
        integer points_change
        integer points_balance_after
        varchar description_en
        varchar description_ar
        timestamptz expires_at
        timestamptz created_at
    }
    
    users ||--|| user_loyalty_status : "has"
    users ||--o{ bookings : "makes"
    users ||--o{ loyalty_transactions : "earns/spends"
    users ||--o{ reviews : "writes"
    
    providers ||--o{ services : "offers"
    providers ||--o{ bookings : "receives"
    providers ||--o{ reviews : "receives"
    
    service_categories ||--o{ services : "contains"
    
    services ||--o{ bookings : "booked_for"
    
    bookings ||--|| reviews : "generates"
    bookings ||--o{ loyalty_transactions : "triggers"
```

## Data Types and Enums

### Custom Enum Types
```sql
-- Booking lifecycle
CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'in_progress', 'completed', 
    'cancelled', 'no_show', 'refunded'
);

-- Payment processing
CREATE TYPE payment_method AS ENUM (
    'cash', 'card', 'tap_gateway', 'wallet', 'loyalty_points', 'promotion'
);

CREATE TYPE payment_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'refunded', 'partial_refund'
);

-- Loyalty program
CREATE TYPE user_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- Multi-language support
CREATE TYPE language_code AS ENUM ('ar', 'en');

-- Service delivery
CREATE TYPE location_type AS ENUM ('salon', 'customer', 'event');
```

### Geographic Data Types
```sql
-- PostGIS geography type for precise distance calculations
providers.location geography(POINT, 4326)

-- Jordan geographic boundaries validation
CONSTRAINT providers_jordan_location CHECK (
    ST_X(location::geometry) BETWEEN 34.960 AND 39.301 AND
    ST_Y(location::geometry) BETWEEN 29.185 AND 33.375
)
```

## Key Business Rules

### Phone Number Validation
```sql
-- Jordan mobile number format
CONSTRAINT users_phone_format CHECK (phone ~ '^\\+962[0-9]{9}$')

-- Valid prefixes: 77, 78, 79
-- Formats accepted and normalized:
-- +962791234567 (International)
-- 962791234567 → +962791234567
-- 0791234567 → +962791234567
-- 791234567 → +962791234567
```

### Booking Business Logic
```sql
-- Prevent booking conflicts
CREATE UNIQUE INDEX idx_provider_booking_conflict ON bookings 
(provider_id, booking_date, start_time, end_time) 
WHERE status IN ('pending', 'confirmed', 'in_progress');

-- Booking time validation
CONSTRAINT bookings_time_order CHECK (end_time > start_time)
CONSTRAINT bookings_future_date CHECK (booking_date >= CURRENT_DATE)
CONSTRAINT bookings_max_advance CHECK (booking_date <= CURRENT_DATE + INTERVAL '30 days')
```

### Financial Calculations
```sql
-- Platform fee calculation (Fixed fees)
IF NEW.total_price <= 25.00 THEN
    NEW.platform_fee := 2.00;
ELSE
    NEW.platform_fee := 5.00;
END IF;
NEW.provider_earnings := NEW.total_price - NEW.platform_fee;

-- Price consistency validation
CONSTRAINT bookings_price_consistency CHECK (original_price = total_price + discount_amount)
CONSTRAINT bookings_earnings_consistency CHECK (provider_earnings + platform_fee = total_price)
```

### Loyalty Program Rules
```sql
-- Tier thresholds
CASE 
    WHEN total_points >= 6000 THEN 'platinum'  -- 6000+ points
    WHEN total_points >= 3000 THEN 'gold'      -- 3000-5999 points
    WHEN total_points >= 1000 THEN 'silver'    -- 1000-2999 points
    ELSE 'bronze'                              -- 0-999 points
END

-- Points earning: 1 point per JOD spent (minimum 1 point)
points_earned := GREATEST(1, FLOOR(booking_amount)::INTEGER)
```

## Performance Optimizations

### Critical Indexes
```sql
-- Geospatial searches (highest priority)
CREATE INDEX idx_providers_location_verified_active ON providers 
USING GIST(location) WHERE verified = TRUE AND active = TRUE;

-- Booking conflict prevention
CREATE INDEX idx_bookings_provider_time_conflict ON bookings 
(provider_id, booking_date, start_time, end_time) 
WHERE status IN ('pending', 'confirmed', 'in_progress');

-- Service discovery
CREATE INDEX idx_services_category_provider_active ON services 
(category_id, provider_id, price) WHERE active = TRUE;

-- Review performance
CREATE INDEX idx_reviews_provider_rating_date ON reviews 
(provider_id, rating, created_at DESC);
```

### Query Performance
- **Provider Search**: <50ms for proximity queries within 10km radius
- **Booking Availability**: <100ms for provider availability checks
- **Review Aggregation**: <200ms for provider rating calculations
- **Loyalty Calculations**: <50ms for points and tier updates

## Security Implementation

### Row Level Security (RLS)
All tables implement RLS policies to ensure data isolation:

```sql
-- Users can only access their own data
CREATE POLICY "users_own_data_only" ON users
FOR ALL USING (auth.uid()::text = id::text);

-- Providers can manage their own services
CREATE POLICY "services_provider_management" ON services
FOR ALL USING (provider_id::text = auth.uid()::text);

-- Booking access limited to involved parties
CREATE POLICY "bookings_involved_parties" ON bookings
FOR SELECT USING (
    user_id::text = auth.uid()::text OR 
    provider_id::text = auth.uid()::text
);
```

### Data Protection
- **Encryption**: All sensitive data encrypted in transit (TLS)
- **Password Security**: bcrypt hashing with salt rounds 12
- **Token Security**: JWT tokens with configurable expiration
- **Audit Logging**: All data modifications logged with timestamps

## Documentation Structure

### Detailed Table Documentation
- [Users Table](./tables/users.md) - Customer account management
- [Providers Table](./tables/providers.md) - Service provider data with geolocation
- [Bookings Table](./tables/bookings.md) - Central booking entity and lifecycle
- [Services Table](./tables/services.md) - Service catalog and pricing
- [Loyalty System](./tables/loyalty_system.md) - Points, tiers, and transactions

### Business Logic Documentation  
- [Triggers and Functions](./business-logic/triggers.md) - Automated business rules
- [Constraints](./business-logic/constraints.md) - Data validation rules
- [RLS Policies](./business-logic/rls-policies.md) - Security access control

### Operations Documentation
- [Performance Monitoring](./performance/monitoring.md) - Query optimization and metrics
- [Migration Procedures](./migrations/migration-strategy.md) - Schema evolution process
- [Backup and Recovery](./migrations/backup-procedures.md) - Data protection procedures

## Quick Setup Commands

### Development Database Setup
```bash
# Connect to Supabase
psql postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Run schema creation
\i database/optimized_schema.sql

# Load test data
\i database/seed_test_data.sql
```

### Schema Verification
```sql
-- Verify all tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies ORDER BY tablename;

-- Validate indexes
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;
```

This database architecture provides a robust foundation for the Lamsa platform, ensuring data consistency, performance, and security while supporting the complex business logic of a beauty booking marketplace.
