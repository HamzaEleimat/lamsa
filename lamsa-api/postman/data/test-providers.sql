-- Test Providers for Postman API Testing
-- This script creates verified test providers with known credentials
-- Safe to run multiple times (uses INSERT ... ON CONFLICT)

BEGIN;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Clean up existing test providers (optional - uncomment if needed)
-- DELETE FROM providers WHERE email LIKE 'test.provider%@lamsa.test';

-- Test Provider 1: Beauty Salon (Fixed Location)
INSERT INTO providers (
    id,
    email,
    password_hash,
    phone,
    phone_verified,
    business_name_en,
    business_name_ar,
    owner_name,
    license_number,
    address,
    city,
    latitude,
    longitude,
    location,
    status,
    verified_at,
    is_active,
    is_mobile,
    travel_radius_km,
    rating,
    total_reviews,
    business_hours,
    bio_en,
    bio_ar,
    created_at,
    updated_at
) VALUES (
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'test.provider1@lamsa.test',
    -- Password: TestProvider123!
    '$2b$10$jHZuMhYXueEZWqjZFcEKuutlm6rgO2sa1a9YBw0hWNE5pogcFWIRG',
    '+962781234567',
    true,
    'Test Beauty Salon',
    'صالون التجميل التجريبي',
    'Test Owner One',
    'LIC-TEST-001',
    '123 Test Street, Abdoun',
    'Amman',
    31.9539,
    35.9106,
    ST_SetSRID(ST_MakePoint(35.9106, 31.9539), 4326)::geography,
    'active',
    NOW(),
    true,
    false,
    0,
    4.5,
    25,
    '[
        {"day": 0, "closed": true},
        {"day": 1, "open": "09:00", "close": "18:00"},
        {"day": 2, "open": "09:00", "close": "18:00"},
        {"day": 3, "open": "09:00", "close": "18:00"},
        {"day": 4, "open": "09:00", "close": "18:00"},
        {"day": 5, "open": "09:00", "close": "16:00"},
        {"day": 6, "open": "10:00", "close": "17:00"}
    ]'::jsonb,
    'Test beauty salon for API testing purposes',
    'صالون تجميل تجريبي لأغراض اختبار API',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    phone_verified = EXCLUDED.phone_verified,
    status = EXCLUDED.status,
    verified_at = EXCLUDED.verified_at,
    active = EXCLUDED.active,
    updated_at = NOW();

-- Test Provider 2: Mobile Beauty Service
INSERT INTO providers (
    id,
    email,
    password_hash,
    phone,
    phone_verified,
    business_name_en,
    business_name_ar,
    owner_name,
    license_number,
    address,
    city,
    latitude,
    longitude,
    location,
    status,
    verified_at,
    is_active,
    is_mobile,
    travel_radius_km,
    rating,
    total_reviews,
    business_hours,
    bio_en,
    bio_ar,
    created_at,
    updated_at
) VALUES (
    'b2222222-2222-2222-2222-222222222222'::uuid,
    'test.provider2@lamsa.test',
    -- Password: TestProvider123!
    '$2b$10$jHZuMhYXueEZWqjZFcEKuutlm6rgO2sa1a9YBw0hWNE5pogcFWIRG',
    '+962787654321',
    true,
    'Test Mobile Stylist',
    'مصففة الشعر المتنقلة التجريبية',
    'Test Owner Two',
    'LIC-TEST-002',
    '456 Mobile Base, Sweifieh',
    'Amman',
    31.9594,
    35.8428,
    ST_SetSRID(ST_MakePoint(35.8428, 31.9594), 4326)::geography,
    'active',
    NOW(),
    true,
    true,
    15,
    4.7,
    42,
    '[
        {"day": 0, "open": "10:00", "close": "20:00"},
        {"day": 1, "open": "09:00", "close": "21:00"},
        {"day": 2, "open": "09:00", "close": "21:00"},
        {"day": 3, "open": "09:00", "close": "21:00"},
        {"day": 4, "open": "09:00", "close": "21:00"},
        {"day": 5, "open": "14:00", "close": "22:00"},
        {"day": 6, "open": "10:00", "close": "20:00"}
    ]'::jsonb,
    'Test mobile beauty service for API testing',
    'خدمة تجميل متنقلة تجريبية لاختبار API',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    phone_verified = EXCLUDED.phone_verified,
    status = EXCLUDED.status,
    verified_at = EXCLUDED.verified_at,
    active = EXCLUDED.active,
    updated_at = NOW();

-- Test Provider 3: Nail Studio
INSERT INTO providers (
    id,
    email,
    password_hash,
    phone,
    phone_verified,
    business_name_en,
    business_name_ar,
    owner_name,
    license_number,
    address,
    city,
    latitude,
    longitude,
    location,
    status,
    verified_at,
    is_active,
    is_mobile,
    travel_radius_km,
    rating,
    total_reviews,
    business_hours,
    bio_en,
    bio_ar,
    created_at,
    updated_at
) VALUES (
    'c3333333-3333-3333-3333-333333333333'::uuid,
    'test.provider3@lamsa.test',
    -- Password: TestProvider123!
    '$2b$10$jHZuMhYXueEZWqjZFcEKuutlm6rgO2sa1a9YBw0hWNE5pogcFWIRG',
    '+962799876543',
    true,
    'Test Nail Studio',
    'استوديو الأظافر التجريبي',
    'Test Owner Three',
    'LIC-TEST-003',
    '789 Nail Plaza, Rainbow Street',
    'Amman',
    31.9515,
    35.9239,
    ST_SetSRID(ST_MakePoint(35.9239, 31.9515), 4326)::geography,
    'active',
    NOW(),
    true,
    false,
    0,
    4.3,
    18,
    '[
        {"day": 0, "closed": true},
        {"day": 1, "open": "10:00", "close": "19:00"},
        {"day": 2, "open": "10:00", "close": "19:00"},
        {"day": 3, "open": "10:00", "close": "19:00"},
        {"day": 4, "open": "10:00", "close": "19:00"},
        {"day": 5, "open": "10:00", "close": "17:00"},
        {"day": 6, "open": "11:00", "close": "18:00"}
    ]'::jsonb,
    'Test nail studio for API testing',
    'استوديو أظافر تجريبي لاختبار API',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    phone_verified = EXCLUDED.phone_verified,
    status = EXCLUDED.status,
    verified_at = EXCLUDED.verified_at,
    active = EXCLUDED.active,
    updated_at = NOW();

-- Create test services for each provider
-- Services for Provider 1 (Beauty Salon)
INSERT INTO services (
    id,
    provider_id,
    category_id,
    name_en,
    name_ar,
    description_en,
    description_ar,
    price,
    duration_minutes,
    is_active,
    created_at,
    updated_at
) VALUES 
(
    'd1111111-1111-1111-1111-111111111111'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    (SELECT id FROM service_categories WHERE name_en = 'Hair Styling' LIMIT 1),
    'Test Hair Cut',
    'قص شعر تجريبي',
    'Basic hair cut service for testing',
    'خدمة قص شعر أساسية للاختبار',
    20.00,
    30,
    true,
    NOW(),
    NOW()
),
(
    'd2222222-2222-2222-2222-222222222222'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    (SELECT id FROM service_categories WHERE name_en = 'Hair Styling' LIMIT 1),
    'Test Hair Coloring',
    'صبغ شعر تجريبي',
    'Premium hair coloring service for testing',
    'خدمة صبغ شعر متميزة للاختبار',
    50.00,
    120,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    active = EXCLUDED.active,
    updated_at = NOW();

-- Services for Provider 2 (Mobile Stylist)
INSERT INTO services (
    id,
    provider_id,
    category_id,
    name_en,
    name_ar,
    description_en,
    description_ar,
    price,
    duration_minutes,
    is_active,
    created_at,
    updated_at
) VALUES 
(
    'd3333333-3333-3333-3333-333333333333'::uuid,
    'b2222222-2222-2222-2222-222222222222'::uuid,
    (SELECT id FROM service_categories WHERE name_en = 'Hair Styling' LIMIT 1),
    'Mobile Hair Styling',
    'تصفيف شعر متنقل',
    'Professional hair styling at your location',
    'تصفيف شعر احترافي في موقعك',
    35.00,
    60,
    true,
    NOW(),
    NOW()
),
(
    'd4444444-4444-4444-4444-444444444444'::uuid,
    'b2222222-2222-2222-2222-222222222222'::uuid,
    (SELECT id FROM service_categories WHERE name_en = 'Makeup' LIMIT 1),
    'Mobile Makeup Service',
    'خدمة مكياج متنقلة',
    'Professional makeup service at your location',
    'خدمة مكياج احترافية في موقعك',
    45.00,
    90,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    active = EXCLUDED.active,
    updated_at = NOW();

-- Services for Provider 3 (Nail Studio)
INSERT INTO services (
    id,
    provider_id,
    category_id,
    name_en,
    name_ar,
    description_en,
    description_ar,
    price,
    duration_minutes,
    is_active,
    created_at,
    updated_at
) VALUES 
(
    'd5555555-5555-5555-5555-555555555555'::uuid,
    'c3333333-3333-3333-3333-333333333333'::uuid,
    (SELECT id FROM service_categories WHERE name_en = 'Nail Care' LIMIT 1),
    'Test Manicure',
    'مانيكير تجريبي',
    'Basic manicure service for testing',
    'خدمة مانيكير أساسية للاختبار',
    15.00,
    45,
    true,
    NOW(),
    NOW()
),
(
    'd6666666-6666-6666-6666-666666666666'::uuid,
    'c3333333-3333-3333-3333-333333333333'::uuid,
    (SELECT id FROM service_categories WHERE name_en = 'Nail Care' LIMIT 1),
    'Test Gel Nails',
    'أظافر جل تجريبية',
    'Premium gel nail service for testing',
    'خدمة أظافر جل متميزة للاختبار',
    30.00,
    60,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    active = EXCLUDED.active,
    updated_at = NOW();

-- Output the test provider information
SELECT 
    'Test Provider Created' as status,
    id,
    email,
    phone,
    business_name_en,
    status as provider_status,
    active
FROM providers 
WHERE email LIKE 'test.provider%@lamsa.test'
ORDER BY email;

-- Output the test services information
SELECT 
    'Test Service Created' as status,
    s.id as service_id,
    p.email as provider_email,
    s.name_en,
    s.price,
    s.duration_minutes
FROM services s
JOIN providers p ON s.provider_id = p.id
WHERE p.email LIKE 'test.provider%@lamsa.test'
ORDER BY p.email, s.name_en;

COMMIT;

-- Notes:
-- 1. Replace '$2b$10$jHZuMhYXueEZWqjZFcEKuutlm6rgO2sa1a9YBw0hWNE5pogcFWIRG' with actual bcrypt hash
-- 2. Default password for all test providers: TestProvider123!
-- 3. All providers are pre-verified and active
-- 4. Each provider has 2 services with different price points for fee testing