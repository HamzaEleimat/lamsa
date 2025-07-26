-- Create Provider Records for Existing Provider Users (Minimal Version)
-- Run this script in your Supabase SQL editor

-- Step 1: First, let's see what columns actually exist in the providers table
-- Run this part first to see the structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'providers' 
ORDER BY ordinal_position;

-- Step 2: Create provider records with only the columns that exist
-- This uses only the most basic columns that should exist
INSERT INTO providers (
  id,
  user_id,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  u.id AS user_id,
  NOW() as created_at,
  NOW() as updated_at
FROM users u
WHERE u.role = 'PROVIDER'
AND NOT EXISTS (
  SELECT 1 FROM providers p WHERE p.user_id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: If email and phone columns exist, update them
-- This will fail gracefully if columns don't exist
DO $$
BEGIN
    -- Try to update email if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'email') THEN
        UPDATE providers p
        SET email = u.email
        FROM users u
        WHERE p.user_id = u.id AND u.email IS NOT NULL;
    END IF;
    
    -- Try to update phone if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'phone') THEN
        UPDATE providers p
        SET phone = u.phone
        FROM users u
        WHERE p.user_id = u.id AND u.phone IS NOT NULL;
    END IF;
END $$;

-- Step 4: Verify the results
SELECT 
  u.id AS user_id,
  u.name AS user_name,
  u.email AS user_email,
  u.phone AS user_phone,
  u.role,
  p.id AS provider_id,
  p.user_id AS provider_user_id,
  p.created_at,
  COUNT(s.id) as service_count
FROM users u
LEFT JOIN providers p ON p.user_id = u.id
LEFT JOIN services s ON (s.provider_id = p.id OR s.provider_id = u.id)
WHERE u.role = 'PROVIDER'
GROUP BY u.id, u.name, u.email, u.phone, u.role, p.id, p.user_id, p.created_at
ORDER BY u.created_at DESC;