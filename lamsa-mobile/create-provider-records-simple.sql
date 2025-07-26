-- Create Provider Records for Existing Provider Users (Simple Version)
-- Run this script in your Supabase SQL editor

-- Step 1: Show current provider table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'providers' 
ORDER BY ordinal_position;

-- Step 2: Create provider records with minimal required fields
-- Adjust the column names based on the actual structure from Step 1
INSERT INTO providers (
  id,
  user_id,
  email,
  phone,
  business_name,
  business_name_ar,
  business_type,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id, -- Generate new UUID for provider
  u.id AS user_id,
  u.email,
  u.phone,
  COALESCE(u.name, 'My Business') AS business_name,
  COALESCE(u.name, 'عملي') AS business_name_ar,
  'salon' AS business_type,
  NOW(),
  NOW()
FROM users u
WHERE u.role = 'PROVIDER'
AND NOT EXISTS (
  SELECT 1 FROM providers p WHERE p.user_id = u.id
)
AND u.email IS NOT NULL -- Ensure we have an email
ON CONFLICT DO NOTHING;

-- Step 3: Update provider_id in services table to match the new provider records
-- This ensures services are linked to the correct provider record
UPDATE services s
SET provider_id = p.id
FROM providers p
WHERE s.provider_id = p.user_id  -- If services were using user_id as provider_id
AND p.user_id IS NOT NULL;

-- Step 4: Verify the results
SELECT 
  u.id AS user_id,
  u.name AS user_name,
  u.email,
  u.role,
  p.id AS provider_id,
  p.business_name,
  p.user_id AS provider_user_id,
  COUNT(s.id) as service_count
FROM users u
LEFT JOIN providers p ON p.user_id = u.id
LEFT JOIN services s ON s.provider_id = p.id
WHERE u.role = 'PROVIDER'
GROUP BY u.id, u.name, u.email, u.role, p.id, p.business_name, p.user_id
ORDER BY u.created_at DESC;