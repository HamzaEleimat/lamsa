# Lamsa Database Schema

This directory contains the PostgreSQL database schema for the Lamsa beauty booking marketplace.

## Files

- `schema.sql` - Full PostgreSQL schema with PostGIS support for spatial queries
- `supabase-migration.sql` - Supabase-optimized version using lat/lng instead of PostGIS
- `README.md` - This file

## Tables Overview

### 1. **users** - Customer accounts
- Phone-based authentication
- Language preference (Arabic/English)
- Basic profile information

### 2. **providers** - Beauty service providers
- Business information in Arabic and English
- Location coordinates for nearby search
- Verification status and licensing
- Rating system integration

### 3. **service_categories** - Service categorization
- Bilingual category names
- Icons for UI display
- Sorted order

### 4. **services** - Services offered by providers
- Linked to providers and categories
- Bilingual names and descriptions
- Pricing and duration
- Active/inactive status

### 5. **provider_availability** - Working hours
- Day-wise availability (0-6, Sunday-Saturday)
- Start and end times
- Can be toggled on/off

### 6. **bookings** - Customer bookings
- Complete booking lifecycle (pending → confirmed → completed)
- Automatic fee calculation (15% platform fee)
- Payment method tracking
- Time conflict prevention

### 7. **reviews** - Customer reviews
- One review per completed booking
- 1-5 star rating system
- Automatic provider rating update

### 8. **settlements** - Monthly provider settlements
- Tracks earnings and fees
- Monthly aggregation
- Payment status tracking

## Features

### Security
- Row Level Security (RLS) policies for all tables
- User can only access their own data
- Providers can only modify their own services
- Public read access for verified providers

### Automation
- Automatic `updated_at` timestamp updates
- Automatic fee calculation (15% platform fee)
- Automatic provider rating updates after reviews
- Monthly settlement generation function

### Performance
- Indexes on all foreign keys
- Composite indexes for common queries
- Spatial index for location-based searches (PostGIS version)
- Optimized for read-heavy workloads

### Functions

1. **search_providers_nearby** - Find providers within radius
   ```sql
   SELECT * FROM search_providers_nearby(
     user_lat := 24.7136,
     user_lng := 46.6753,
     radius_km := 10
   );
   ```

2. **check_provider_availability** - Check if slot is available
   ```sql
   SELECT check_provider_availability(
     p_provider_id := 'uuid-here',
     p_booking_date := '2024-01-15',
     p_start_time := '14:00',
     p_end_time := '15:00'
   );
   ```

3. **generate_monthly_settlements** - Generate monthly settlements
   ```sql
   SELECT generate_monthly_settlements(
     target_month := 12,
     target_year := 2024
   );
   ```

## Setup Instructions

### For Local PostgreSQL with PostGIS

1. Install PostgreSQL and PostGIS extension
2. Create database:
   ```bash
   createdb lamsa
   ```
3. Run the schema:
   ```bash
   psql -d lamsa -f schema.sql
   ```

### For Supabase

1. Create a new Supabase project
2. Go to SQL Editor in Supabase dashboard
3. Copy and paste the contents of `supabase-migration.sql`
4. Run the migration

## Initial Data

The schema includes initial service categories in both Arabic and English:
- Women's Salon / صالون نسائي
- Men's Salon / صالون رجالي
- Spa & Massage / سبا ومساج
- Nails / أظافر
- Makeup / مكياج
- Skincare / العناية بالبشرة
- Hair Removal / إزالة الشعر
- Beauty Clinic / عيادة تجميل

## Environment Variables

Add these to your `.env` file:

```env
# For Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# For local PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/lamsa
```

## TypeScript Types

TypeScript types are generated in `src/types/database.ts` and can be imported:

```typescript
import { User, Provider, Booking } from '../types/database';
```

## Notes

- All timestamps are stored in UTC
- Phone numbers should include country code
- Coordinates use WGS84 (EPSG:4326) standard
- Platform fee is set at 15% and calculated automatically
- Provider ratings are automatically updated when reviews are added