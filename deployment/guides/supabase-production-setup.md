# Supabase Production Setup Guide

This guide walks you through setting up Supabase for production deployment of BeautyCort.

## Prerequisites

- Supabase account with Pro plan for production
- Database administration access
- Understanding of PostgreSQL and PostGIS

## Step 1: Create Production Project

1. **Create new project**:
   ```bash
   # Visit https://supabase.com/dashboard
   # Click "New Project"
   # Organization: Your Organization
   # Name: beautycort-production
   # Database Password: Generate strong password
   # Region: Singapore (closest to Jordan)
   ```

2. **Note down credentials**:
   ```bash
   PROJECT_URL=https://your-project-id.supabase.co
   ANON_KEY=your_anon_key_here
   SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Step 2: Configure Database

### Enable Required Extensions

```sql
-- Enable PostGIS for geolocation
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_stat_statements for monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Set Timezone

```sql
-- Set timezone to Jordan
ALTER DATABASE postgres SET timezone TO 'Asia/Amman';
```

## Step 3: Run Database Migrations

```bash
# From project root
cd beautycort-api

# Set environment variables
export SUPABASE_URL="https://your-project-id.supabase.co"
export SUPABASE_SERVICE_KEY="your_service_role_key_here"

# Run migrations
npm run migrate
```

## Step 4: Configure Row Level Security (RLS)

### Users Table Policies

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### Providers Table Policies

```sql
-- Providers can only access their own data
CREATE POLICY "Providers can view own profile" ON providers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Providers can update own profile" ON providers
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow public to view approved providers
CREATE POLICY "Public can view approved providers" ON providers
  FOR SELECT USING (status = 'approved');

-- Enable RLS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
```

### Bookings Table Policies

```sql
-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

-- Providers can view their bookings
CREATE POLICY "Providers can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = (
    SELECT user_id FROM providers WHERE id = provider_id
  ));

-- Users can create bookings
CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
```

## Step 5: Configure Authentication

### Enable Phone Authentication

1. **Go to Authentication > Settings**
2. **Enable Phone authentication**
3. **Configure Twilio settings**:
   ```
   Account SID: your_twilio_account_sid
   Auth Token: your_twilio_auth_token
   Phone Number: your_twilio_phone_number
   ```

### Set up JWT Settings

```sql
-- Set JWT expiry to 1 hour
ALTER ROLE authenticator SET pgrst.jwt_expiry = '3600';

-- Configure JWT secret (do this in Supabase dashboard)
-- Go to Settings > API > JWT Settings
-- Use a secure 256-bit key
```

## Step 6: Configure Storage

### Create Storage Buckets

```sql
-- Create provider images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-images', 'provider-images', true);

-- Create user avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true);

-- Create service images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true);
```

### Configure Storage Policies

```sql
-- Provider images policies
CREATE POLICY "Providers can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'provider-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view provider images" ON storage.objects
  FOR SELECT USING (bucket_id = 'provider-images');

-- User avatars policies
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view user avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');
```

## Step 7: Performance Optimization

### Create Indexes

```sql
-- Index for provider geolocation queries
CREATE INDEX idx_providers_location ON providers USING GIST(location);

-- Index for booking queries
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);

-- Index for service queries
CREATE INDEX idx_services_provider_id ON services(provider_id);
CREATE INDEX idx_services_category ON services(category);

-- Index for reviews
CREATE INDEX idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
```

### Configure Connection Pooling

```sql
-- Set max connections (adjust based on your plan)
ALTER SYSTEM SET max_connections = 100;

-- Set connection pool settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
```

## Step 8: Monitoring and Logging

### Enable Query Logging

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1 second
ALTER SYSTEM SET log_statement = 'mod'; -- Log modifications

-- Reload configuration
SELECT pg_reload_conf();
```

### Set up Monitoring

1. **Go to Settings > Database > Monitoring**
2. **Enable query performance monitoring**
3. **Set up alerts for**:
   - High connection count
   - Long-running queries
   - Database size growth

## Step 9: Backup Configuration

### Configure Automated Backups

1. **Go to Settings > Database > Backups**
2. **Enable automated backups**
3. **Set retention period**: 7 days minimum
4. **Configure backup schedule**: Daily at 2 AM Jordan time

### Test Backup Restore

```bash
# Download backup
supabase db dump --db-url "postgresql://..." > backup.sql

# Test restore to staging
supabase db reset --db-url "postgresql://staging..."
psql -d staging-db -f backup.sql
```

## Step 10: Security Hardening

### Network Security

1. **Configure IP whitelist** (if using dedicated IPs)
2. **Enable SSL-only connections**
3. **Set up VPC peering** (for enterprise plans)

### Database Security

```sql
-- Revoke unnecessary permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Grant only necessary permissions
GRANT SELECT ON providers TO anon;
GRANT SELECT ON services TO anon;
GRANT SELECT ON reviews TO anon;
```

## Step 11: Final Verification

### Connection Test

```bash
# Test connection from API
cd beautycort-api
npm run test:connection

# Test from different environments
curl -X GET \
  -H "apikey: your_anon_key" \
  -H "Authorization: Bearer your_service_key" \
  "https://your-project-id.supabase.co/rest/v1/providers?select=*"
```

### Performance Test

```bash
# Run load test
npm run test:load

# Monitor performance in Supabase dashboard
# Check query performance
# Monitor connection pool usage
```

## Environment Variables for Production

```bash
# Add to .env.production
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Database connection (for migrations)
DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres
```

## Troubleshooting

### Common Issues

1. **Connection timeout**:
   - Check network connectivity
   - Verify firewall rules
   - Check connection pool limits

2. **RLS policy errors**:
   - Verify JWT token validity
   - Check policy conditions
   - Test with service role key

3. **Migration failures**:
   - Check table dependencies
   - Verify permissions
   - Run migrations in correct order

### Support Contacts

- **Supabase Support**: support@supabase.com
- **Documentation**: https://supabase.com/docs
- **Community**: https://supabase.com/discord

## Next Steps

1. Set up monitoring alerts
2. Configure application-level caching
3. Implement read replicas (for scale)
4. Set up database maintenance schedules
5. Configure backup verification tests

Remember to test all configurations in staging environment first before applying to production!