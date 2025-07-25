# Database Schema Consolidation Plan

## Overview
The Lamsa project currently has multiple schema files scattered across different directories, leading to confusion and potential inconsistencies. This document outlines the consolidation plan.

## Current State
Multiple schema files exist:
1. `/database/schema.sql` - Basic schema (525 lines, 6 tables)
2. `/database/optimized_schema.sql` - Enhanced schema (917 lines, 13 tables)
3. `/lamsa-api/database/schema.sql` - API-specific schema (411 lines, 8 tables)
4. `/supabase/migrations/20250122000001_initial_schema.sql` - Migration-based schema (687 lines)
5. Various feature-specific schemas (provider_onboarding, analytics, etc.)

## Consolidation Strategy

### 1. Single Source of Truth
Created `/database/consolidated_schema.sql` which:
- Combines all features from scattered schemas
- Includes all performance optimizations
- Adds missing indexes and constraints
- Implements proper security features
- Provides comprehensive documentation

### 2. Migration Approach
For existing deployments:
1. Use Supabase migrations in `/supabase/migrations/`
2. Run migrations in order:
   - `20250122000001_initial_schema.sql` - Base schema
   - `20250122000002_add_performance_functions.sql` - Performance features
   - `20250122000003_encrypt_provider_phones.sql` - PII encryption support
   - `20250122000004_consolidate_schema.sql` - Missing indexes and constraints

### 3. For New Deployments
Use `/database/consolidated_schema.sql` directly:
```bash
psql $DATABASE_URL -f /home/hamza/lamsa/database/consolidated_schema.sql
```

## Key Improvements in Consolidated Schema

### Security Enhancements
- PII encryption support columns (phone_hash, email_hash, pii_encrypted)
- Row Level Security (RLS) policies for all tables
- Audit logging table for compliance
- Proper foreign key constraints with RESTRICT on critical relationships

### Performance Optimizations
- Comprehensive indexes for all common queries:
  - Booking conflict detection: `idx_bookings_availability_check`
  - User activity tracking: `idx_bookings_user_activity`
  - Financial reporting: `idx_bookings_financial`
  - Provider search: `idx_providers_search` with PostGIS spatial index
- Materialized views for analytics
- Partial indexes for active/pending records

### Data Integrity
- Unique constraint to prevent double-booking
- Check constraints for:
  - Future booking dates
  - Valid time ranges
  - Price and rating boundaries
  - Phone number format validation
- Proper CASCADE vs RESTRICT behaviors

### Business Logic
- Automatic booking number generation
- Platform fee calculation (2 JOD ≤25, 5 JOD >25)
- Provider stats updates via triggers
- Rating recalculation on review changes

## Migration Steps

### For Development Environment
```bash
# Reset database with new schema
supabase db reset

# Or apply migrations
supabase migration up
```

### For Production Environment
```bash
# 1. Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migrations in order
supabase db push

# 3. Encrypt existing provider data
npm run migrate:provider-encryption

# 4. Refresh materialized views
psql $DATABASE_URL -c "SELECT refresh_analytics_views();"
```

## Files to Remove After Migration
Once migration is successful, remove:
- `/database/schema.sql`
- `/database/optimized_schema.sql`
- `/lamsa-api/database/schema.sql`
- `/lamsa-api/src/database/migrations/000_initial_schema.sql`
- All feature-specific schema files in `/database/`

Keep only:
- `/database/consolidated_schema.sql` - Reference schema
- `/supabase/migrations/*.sql` - Version-controlled migrations

## Validation Checklist
- [ ] All tables from scattered schemas exist
- [ ] All indexes are created
- [ ] Constraints are properly applied
- [ ] RLS policies are enabled
- [ ] Materialized views are populated
- [ ] Provider PII is encrypted
- [ ] No duplicate booking conflicts
- [ ] Performance queries run fast

## Notes
- The consolidated schema uses PostgreSQL 14+ features
- PostGIS extension required for location features
- PII_ENCRYPTION_KEY must be set before encrypting data
- Regular VACUUM and ANALYZE recommended for optimal performance