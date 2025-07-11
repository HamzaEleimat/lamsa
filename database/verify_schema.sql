-- Verify BeautyCort Database Schema
-- Run this query to check if all tables, views, and functions were created successfully

-- Check tables
SELECT 
    'Tables' as object_type,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'providers', 'service_categories', 'services', 'provider_availability', 'bookings');

-- Check views
SELECT 
    'Views' as object_type,
    COUNT(*) as count
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('active_providers_with_services', 'upcoming_bookings');

-- Check functions
SELECT 
    'Functions' as object_type,
    COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('search_providers_nearby', 'check_provider_availability', 'update_updated_at_column', 'calculate_booking_fees');

-- Check service categories data
SELECT 
    'Service Categories' as object_type,
    COUNT(*) as count
FROM service_categories;

-- List all created objects
SELECT '--- Tables ---' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;

SELECT '--- Views ---' as info;
SELECT table_name FROM information_schema.views WHERE table_schema = 'public' ORDER BY table_name;

SELECT '--- Functions ---' as info;
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY routine_name;