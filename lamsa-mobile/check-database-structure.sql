-- Check Database Structure
-- Run each section separately to understand your database schema

-- 1. Check users table structure
SELECT '=== USERS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Check providers table structure
SELECT '=== PROVIDERS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'providers' 
ORDER BY ordinal_position;

-- 3. Check if there's a user_roles table or similar
SELECT '=== TABLES CONTAINING "ROLE" ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%role%' OR table_name LIKE '%user%role%');

-- 4. Check services table to understand provider_id usage
SELECT '=== SERVICES TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'services' 
AND column_name IN ('id', 'provider_id', 'created_by', 'user_id')
ORDER BY ordinal_position;

-- 5. Sample data from users table (first 5 rows)
SELECT '=== SAMPLE USERS DATA ===' as info;
SELECT * FROM users LIMIT 5;

-- 6. Sample data from providers table (first 5 rows)
SELECT '=== SAMPLE PROVIDERS DATA ===' as info;
SELECT * FROM providers LIMIT 5;

-- 7. Check if there are any existing relationships
SELECT '=== EXISTING USER-PROVIDER RELATIONSHIPS ===' as info;
SELECT 
    COUNT(*) as total_users,
    COUNT(DISTINCT p.user_id) as users_with_providers
FROM users u
LEFT JOIN providers p ON p.user_id = u.id;