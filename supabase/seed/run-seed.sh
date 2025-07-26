#!/bin/bash

# Lamsa Test Data Seeder
# This script loads test data into your local Supabase instance

echo "======================================"
echo "Lamsa Test Data Seeder"
echo "======================================"

# Check if Supabase is running
if ! supabase status 2>/dev/null | grep -q "supabase local development setup is running"; then
    echo "❌ Supabase is not running. Please start it first with:"
    echo "   supabase start"
    exit 1
fi

echo "✅ Supabase is running"

# Get the database URL
DB_URL=$(supabase status --output json | jq -r '.DB_URL')

if [ -z "$DB_URL" ]; then
    echo "❌ Could not get database URL. Make sure Supabase is running."
    exit 1
fi

echo "📝 Loading test data..."

# Run the seed script
psql "$DB_URL" -f "$(dirname "$0")/seed-test-data.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test data loaded successfully!"
    echo ""
    echo "Test Accounts Created:"
    echo "====================="
    echo ""
    echo "📱 Customer Accounts:"
    echo "  • 77123456 - Sara Ahmed"
    echo "  • 78123456 - Mariam Khaled"
    echo "  • 79123456 - Noor Abdullah"
    echo "  • 77654321 - Lina Mohammed"
    echo "  • 78654321 - Dana Yousef"
    echo ""
    echo "💇 Provider Accounts:"
    echo "  • 79111111 - Golden Beauty Salon"
    echo "  • 79222222 - Lamsa Beauty Center"
    echo "  • 79333333 - Princess Salon"
    echo ""
    echo "🔐 All accounts use OTP: 123456"
    echo ""
    echo "✨ You can now test:"
    echo "  • Customer app features (browse, book, review)"
    echo "  • Provider app features (manage bookings, view stats)"
    echo "  • Past, current, and future bookings"
    echo "  • Different booking statuses"
    echo "  • Reviews and ratings"
    echo ""
    echo "======================================"
else
    echo ""
    echo "❌ Failed to load test data. Check the error messages above."
    exit 1
fi