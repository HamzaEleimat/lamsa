-- Safe Provider Record Creation
-- This script makes no assumptions about column names

-- Step 1: First check what we're working with
SELECT 'Checking database structure...' as status;

-- Show users who might be providers (you'll need to identify them manually)
SELECT 
    u.id,
    u.*
FROM users u
LEFT JOIN providers p ON p.user_id = u.id
WHERE p.id IS NULL  -- Users without provider records
LIMIT 10;

-- Step 2: Create a simple mapping table if needed
-- This is a temporary solution to link users to providers
CREATE TABLE IF NOT EXISTS user_provider_mapping (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    provider_id UUID REFERENCES providers(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: For existing services, find unique provider_ids that aren't in providers table
SELECT 'Finding orphaned provider references in services...' as status;
SELECT DISTINCT s.provider_id
FROM services s
WHERE NOT EXISTS (
    SELECT 1 FROM providers p WHERE p.id = s.provider_id
)
AND s.provider_id IS NOT NULL;

-- Step 4: Create basic provider records for orphaned service provider_ids
-- Only run this after reviewing the results above
/*
INSERT INTO providers (id, created_at, updated_at)
SELECT DISTINCT 
    s.provider_id as id,
    MIN(s.created_at) as created_at,
    NOW() as updated_at
FROM services s
WHERE NOT EXISTS (
    SELECT 1 FROM providers p WHERE p.id = s.provider_id
)
AND s.provider_id IS NOT NULL
GROUP BY s.provider_id
ON CONFLICT (id) DO NOTHING;
*/

-- Step 5: Show current state
SELECT 'Current state summary:' as status;
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM providers) as total_providers,
    (SELECT COUNT(DISTINCT provider_id) FROM services WHERE provider_id IS NOT NULL) as unique_service_providers,
    (SELECT COUNT(*) FROM services) as total_services;