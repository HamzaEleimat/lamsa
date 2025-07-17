#!/bin/bash

# BeautyCort Production Database Setup Script
# This script helps set up the production Supabase database

set -e

echo "🚀 BeautyCort Production Database Setup"
echo "========================================"

# Function to extract environment variables from .env.production
get_env_var() {
    local var_name="$1"
    local value=$(grep "^${var_name}=" .env.production | cut -d'=' -f2-)
    echo "$value"
}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please copy .env.production.template to .env.production and fill in the values"
    exit 1
fi

# Extract required environment variables
SUPABASE_URL=$(get_env_var "SUPABASE_URL")
SUPABASE_SERVICE_KEY=$(get_env_var "SUPABASE_SERVICE_KEY")
DATABASE_URL=$(get_env_var "DATABASE_URL")

echo "📋 Configuration:"
echo "  SUPABASE_URL: $SUPABASE_URL"
echo "  DATABASE_URL: ${DATABASE_URL%@*}@***"
echo "  SERVICE_KEY: ${SUPABASE_SERVICE_KEY:0:20}..."

# Validate required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ] || [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: Missing required environment variables"
    echo "Please check your .env.production file has:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_KEY"
    echo "  - DATABASE_URL"
    exit 1
fi

echo "✅ Environment variables validated"

# Test connection to Supabase
echo "🔍 Testing connection to Supabase..."
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    "$SUPABASE_URL/rest/v1/" \
    --max-time 10)

if [ "$response" != "200" ]; then
    echo "❌ Error: Cannot connect to Supabase (HTTP $response)"
    echo "Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY"
    exit 1
fi

echo "✅ Successfully connected to Supabase"

# Run the main schema migration
echo "📊 Running database schema migration..."
if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -f beautycort-api/database/schema.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Database schema migration completed successfully"
    else
        echo "❌ Error running database schema migration"
        exit 1
    fi
else
    echo "⚠️  psql command not found. Please install PostgreSQL client."
    echo "You can install it with: sudo apt-get install postgresql-client"
    exit 1
fi

# Test the database setup
echo "🧪 Testing database setup..."
echo "SELECT 'Database connection test' as test, 'PASS' as result;" | psql "$DATABASE_URL"

if [ $? -eq 0 ]; then
    echo "✅ Database connection test passed"
else
    echo "❌ Database connection test failed"
    exit 1
fi

echo ""
echo "🎉 Production database setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test the API connection: cd beautycort-api && npm run test:connection:prod"
echo "2. Configure Redis cluster"
echo "3. Set up third-party services (Tap, Twilio, etc.)"
echo ""
echo "🚀 Your database is ready for production!"