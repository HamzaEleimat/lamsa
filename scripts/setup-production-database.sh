#!/bin/bash

# BeautyCort Production Database Setup Script
# This script helps set up the production Supabase database

set -e

echo "🚀 BeautyCort Production Database Setup"
echo "========================================"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please copy .env.production.template to .env.production and fill in the values"
    exit 1
fi

# Load environment variables
export $(cat .env.production | xargs)

# Validate required environment variables
required_vars=(
    "SUPABASE_URL"
    "SUPABASE_SERVICE_KEY"
    "DATABASE_URL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env.production"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Test connection to Supabase
echo "🔍 Testing connection to Supabase..."
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    "$SUPABASE_URL/rest/v1/")

if [ "$response" != "200" ]; then
    echo "❌ Error: Cannot connect to Supabase (HTTP $response)"
    echo "Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY"
    exit 1
fi

echo "✅ Successfully connected to Supabase"

# Create SQL script for database setup
cat > /tmp/setup_production_db.sql << 'EOF'
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone to Jordan
ALTER DATABASE postgres SET timezone TO 'Asia/Amman';

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('provider-images', 'provider-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('user-avatars', 'user-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('service-images', 'service-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Providers can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'provider-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view provider images" ON storage.objects
  FOR SELECT USING (bucket_id = 'provider-images');

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view user avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');

CREATE POLICY "Providers can upload service images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'service-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view service images" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-images');

-- Performance optimizations
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Enable query logging for performance monitoring
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_statement = 'mod';

-- Reload configuration
SELECT pg_reload_conf();
EOF

echo "🔧 Setting up database extensions and configurations..."

# Execute the setup script
psql "$DATABASE_URL" -f /tmp/setup_production_db.sql

if [ $? -eq 0 ]; then
    echo "✅ Database extensions and configurations set up successfully"
else
    echo "❌ Error setting up database extensions"
    exit 1
fi

# Run the main schema migration
echo "📊 Running database schema migration..."
cd beautycort-api
psql "$DATABASE_URL" -f database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema migration completed successfully"
else
    echo "❌ Error running database schema migration"
    exit 1
fi

# Run additional migrations if they exist
if [ -d "database/migrations" ]; then
    echo "🔄 Running additional migrations..."
    for migration in database/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "Running migration: $(basename "$migration")"
            psql "$DATABASE_URL" -f "$migration"
        fi
    done
fi

# Test the database setup
echo "🧪 Testing database setup..."
cat > /tmp/test_db.sql << 'EOF'
-- Test basic functionality
SELECT 
    'Database connection' as test,
    'PASS' as result;

-- Test PostGIS extension
SELECT 
    'PostGIS extension' as test,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
    ) THEN 'PASS' ELSE 'FAIL' END as result;

-- Test UUID extension
SELECT 
    'UUID extension' as test,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
    ) THEN 'PASS' ELSE 'FAIL' END as result;

-- Test sample data insertion
INSERT INTO service_categories (name_ar, name_en, icon, sort_order)
VALUES ('اختبار', 'Test', 'test-icon', 999)
ON CONFLICT (name_ar) DO NOTHING;

SELECT 
    'Sample data insertion' as test,
    CASE WHEN EXISTS (
        SELECT 1 FROM service_categories WHERE name_ar = 'اختبار'
    ) THEN 'PASS' ELSE 'FAIL' END as result;

-- Clean up test data
DELETE FROM service_categories WHERE name_ar = 'اختبار';
EOF

echo "Running database tests..."
psql "$DATABASE_URL" -f /tmp/test_db.sql

# Clean up temporary files
rm -f /tmp/setup_production_db.sql /tmp/test_db.sql

echo ""
echo "🎉 Production database setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Configure authentication settings in Supabase dashboard"
echo "2. Set up monitoring and alerts"
echo "3. Configure automated backups"
echo "4. Test the API connection with the production database"
echo ""
echo "🔍 To verify the setup, run:"
echo "cd beautycort-api && npm run test:connection"
echo ""
echo "📚 For more details, see: deployment/guides/supabase-production-setup.md"