-- Create Provider Records for Existing Provider Users
-- Run this script in your Supabase SQL editor

-- Create provider records for users with PROVIDER role who don't have a provider record yet
INSERT INTO providers (
  id,
  user_id,
  name,
  email,
  phone,
  business_name,
  business_name_ar,
  business_type,
  status,
  is_active,
  created_at,
  updated_at
)
SELECT 
  u.id, -- Use user ID as provider ID for simplicity
  u.id AS user_id,
  u.name,
  u.email,
  u.phone,
  COALESCE(u.name, 'My Business') AS business_name,
  COALESCE(u.name, 'عملي') AS business_name_ar,
  'salon' AS business_type, -- Default business type
  'active' AS status,
  true AS is_active,
  NOW(),
  NOW()
FROM users u
WHERE u.role = 'PROVIDER'
AND NOT EXISTS (
  SELECT 1 FROM providers p WHERE p.user_id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Update any provider records that have NULL user_id based on email matching
UPDATE providers p
SET user_id = u.id
FROM users u
WHERE p.email = u.email
AND p.user_id IS NULL
AND u.role = 'PROVIDER';

-- Verify the results
SELECT 
  u.id AS user_id,
  u.name AS user_name,
  u.email,
  u.role,
  p.id AS provider_id,
  p.business_name,
  p.user_id AS provider_user_id
FROM users u
LEFT JOIN providers p ON p.user_id = u.id
WHERE u.role = 'PROVIDER'
ORDER BY u.created_at DESC;