-- =====================================================
-- Lamsa Test Data Seed Script (Minimal Version)
-- =====================================================
-- This script creates test data for your current schema
-- Test Accounts:
-- Customers: 77123456, 78123456, 79123456
-- Providers: 79111111, 79222222, 79333333
-- =====================================================

-- Clean existing test data
DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '77%' OR phone LIKE '78%' OR phone LIKE '79%');
DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '77%' OR phone LIKE '78%' OR phone LIKE '79%'));
DELETE FROM bookings WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '77%' OR phone LIKE '78%' OR phone LIKE '79%');
DELETE FROM user_favorites WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '77%' OR phone LIKE '78%' OR phone LIKE '79%');
DELETE FROM provider_special_dates WHERE provider_id IN (SELECT id FROM providers WHERE phone LIKE '79%');
DELETE FROM provider_availability WHERE provider_id IN (SELECT id FROM providers WHERE phone LIKE '79%');
DELETE FROM services WHERE provider_id IN (SELECT id FROM providers WHERE phone LIKE '79%');
DELETE FROM providers WHERE phone LIKE '79%';
DELETE FROM users WHERE phone LIKE '77%' OR phone LIKE '78%' OR phone LIKE '79%';

-- =====================================================
-- 1. CREATE TEST CUSTOMERS
-- =====================================================

INSERT INTO users (id, phone, name, email, language, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', '77123456', 'سارة أحمد', 'sara@example.com', 'ar', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', '78123456', 'مريم خالد', 'mariam@example.com', 'ar', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', '79123456', 'نور العبدالله', 'noor@example.com', 'ar', NOW(), NOW());

-- =====================================================
-- 2. CREATE SERVICE CATEGORIES (check what columns exist)
-- =====================================================

-- First, let's check if categories already exist
INSERT INTO service_categories (id, name_ar, name_en, sort_order, is_active) 
SELECT * FROM (VALUES
    ('11111111-0000-0000-0000-000000000001'::uuid, 'تصفيف الشعر', 'Hair Styling', 1, true),
    ('11111111-0000-0000-0000-000000000002'::uuid, 'العناية بالأظافر', 'Nail Care', 2, true),
    ('11111111-0000-0000-0000-000000000003'::uuid, 'العناية بالبشرة', 'Facial Treatments', 3, true),
    ('11111111-0000-0000-0000-000000000004'::uuid, 'خدمات المكياج', 'Makeup Services', 4, true),
    ('11111111-0000-0000-0000-000000000005'::uuid, 'السبا والمساج', 'Spa & Massage', 5, true)
) AS t(id, name_ar, name_en, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM service_categories LIMIT 1);

-- =====================================================
-- 3. CREATE TEST PROVIDERS
-- =====================================================

INSERT INTO providers (
    id, email, phone, password_hash,
    business_name_ar, business_name_en, owner_name,
    description_ar, description_en,
    latitude, longitude,
    address,
    status, rating, total_reviews, total_bookings,
    created_at, updated_at
) VALUES
(
    '66666666-6666-6666-6666-666666666666',
    'provider1@lamsa.com',
    '79111111',
    '$2b$10$YourHashedPasswordHere', -- Replace with actual hash
    'صالون الجمال الذهبي',
    'Golden Beauty Salon',
    'فاطمة الزهراء',
    'صالون تجميل فاخر مع أكثر من 10 سنوات من الخبرة',
    'Premium beauty salon with 10+ years of experience',
    31.9539,
    35.9106,
    jsonb_build_object(
        'street_ar', 'شارع عبدون',
        'street_en', 'Abdoun Street',
        'area_ar', 'عبدون',
        'area_en', 'Abdoun',
        'city_ar', 'عمان',
        'city_en', 'Amman'
    ),
    'active',
    4.8,
    0,
    0,
    NOW(),
    NOW()
),
(
    '77777777-7777-7777-7777-777777777777',
    'provider2@lamsa.com',
    '79222222',
    '$2b$10$YourHashedPasswordHere',
    'مركز لمسة للتجميل',
    'Lamsa Beauty Center',
    'هدى السعيد',
    'مركز تجميل حديث',
    'Modern beauty center',
    31.9764,
    35.8719,
    jsonb_build_object(
        'street_ar', 'شارع الوكالات',
        'street_en', 'Wakalat Street',
        'area_ar', 'الصويفية',
        'area_en', 'Sweifieh',
        'city_ar', 'عمان',
        'city_en', 'Amman'
    ),
    'active',
    4.6,
    0,
    0,
    NOW(),
    NOW()
),
(
    '88888888-8888-8888-8888-888888888888',
    'provider3@lamsa.com',
    '79333333',
    '$2b$10$YourHashedPasswordHere',
    'صالون الأميرة',
    'Princess Salon',
    'ريم العمري',
    'صالون حصري للعرائس',
    'Exclusive bridal salon',
    31.9631,
    35.8292,
    jsonb_build_object(
        'street_ar', 'شارع الملكة رانيا',
        'street_en', 'Queen Rania Street',
        'area_ar', 'الشميساني',
        'area_en', 'Shmeisani',
        'city_ar', 'عمان',
        'city_en', 'Amman'
    ),
    'active',
    4.9,
    0,
    0,
    NOW(),
    NOW()
);

-- =====================================================
-- 4. CREATE SERVICES
-- =====================================================

-- Get first category ID for services
DO $$
DECLARE
    cat_id UUID;
BEGIN
    SELECT id INTO cat_id FROM service_categories LIMIT 1;
    
    -- Insert services for each provider
    INSERT INTO services (
        id, provider_id, category_id, 
        name_ar, name_en,
        description_ar, description_en, 
        price, duration_minutes, 
        active, created_at, updated_at
    ) VALUES
    -- Golden Beauty Salon Services
    ('22222222-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', cat_id, 'قص وتصفيف الشعر', 'Hair Cut & Style', 'قص شعر احترافي', 'Professional haircut', 25.00, 60, true, NOW(), NOW()),
    ('22222222-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666', cat_id, 'صبغة الشعر', 'Hair Color', 'صبغة شعر كاملة', 'Full hair coloring', 45.00, 120, true, NOW(), NOW()),
    ('22222222-0000-0000-0000-000000000003', '66666666-6666-6666-6666-666666666666', cat_id, 'مانيكير', 'Manicure', 'مانيكير كلاسيكي', 'Classic manicure', 15.00, 45, true, NOW(), NOW()),
    
    -- Lamsa Beauty Center Services
    ('22222222-0000-0000-0000-000000000004', '77777777-7777-7777-7777-777777777777', cat_id, 'تنظيف البشرة', 'Facial Cleansing', 'تنظيف عميق', 'Deep cleansing', 40.00, 75, true, NOW(), NOW()),
    ('22222222-0000-0000-0000-000000000005', '77777777-7777-7777-7777-777777777777', cat_id, 'مكياج سهرة', 'Party Makeup', 'مكياج احترافي', 'Professional makeup', 35.00, 60, true, NOW(), NOW()),
    
    -- Princess Salon Services
    ('22222222-0000-0000-0000-000000000006', '88888888-8888-8888-8888-888888888888', cat_id, 'مكياج عروس', 'Bridal Makeup', 'باقة العروس', 'Bridal package', 150.00, 120, true, NOW(), NOW()),
    ('22222222-0000-0000-0000-000000000007', '88888888-8888-8888-8888-888888888888', cat_id, 'مساج', 'Massage', 'مساج استرخاء', 'Relaxation massage', 50.00, 60, true, NOW(), NOW());
END $$;

-- =====================================================
-- 5. CREATE PROVIDER AVAILABILITY
-- =====================================================

-- Golden Beauty Salon - Open 9 AM to 9 PM (Friday closed)
INSERT INTO provider_availability (id, provider_id, day_of_week, opens_at, closes_at, is_available) VALUES
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 0, '09:00', '21:00', true),
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 1, '09:00', '21:00', true),
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 2, '09:00', '21:00', true),
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 3, '09:00', '21:00', true),
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 4, '09:00', '21:00', true),
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 6, '10:00', '20:00', true);

-- Lamsa Beauty Center
INSERT INTO provider_availability (id, provider_id, day_of_week, opens_at, closes_at, is_available) VALUES
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 0, '10:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 1, '10:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 2, '10:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 3, '10:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 4, '10:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 5, '14:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 6, '10:00', '20:00', true);

-- Princess Salon (Monday closed)
INSERT INTO provider_availability (id, provider_id, day_of_week, opens_at, closes_at, is_available) VALUES
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 0, '11:00', '22:00', true),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 2, '11:00', '22:00', true),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 3, '11:00', '22:00', true),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 4, '11:00', '22:00', true),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 5, '14:00', '22:00', true),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 6, '11:00', '22:00', true);

-- =====================================================
-- 6. CREATE SAMPLE BOOKINGS
-- =====================================================

-- Create some bookings (all future dates due to constraint)
INSERT INTO bookings (
    id, user_id, provider_id, service_id,
    booking_date, start_time, end_time,
    service_amount, total_amount,
    status, payment_method, payment_status,
    created_at
) VALUES
-- Today's confirmed booking
(
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    '22222222-0000-0000-0000-000000000001',
    CURRENT_DATE,
    '15:00',
    '16:00',
    25.00,
    25.00,
    'confirmed',
    'cash',
    'pending',
    NOW() - INTERVAL '2 hours'
),
-- Tomorrow's booking
(
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    '77777777-7777-7777-7777-777777777777',
    '22222222-0000-0000-0000-000000000004',
    CURRENT_DATE + INTERVAL '1 day',
    '14:00',
    '15:15',
    40.00,
    40.00,
    'confirmed',
    'cash',
    'pending',
    NOW() - INTERVAL '1 day'
),
-- Future pending booking
(
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    '88888888-8888-8888-8888-888888888888',
    '22222222-0000-0000-0000-000000000006',
    CURRENT_DATE + INTERVAL '3 days',
    '16:00',
    '18:00',
    150.00,
    150.00,
    'pending',
    'card',
    'pending',
    NOW()
);

-- =====================================================
-- FINAL MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '
    =====================================================
    Test data created successfully!
    =====================================================
    
    Customer Test Accounts:
    -----------------------
    Phone: 77123456 (Sara Ahmed)
    Phone: 78123456 (Mariam Khaled)  
    Phone: 79123456 (Noor Abdullah)
    
    Provider Test Accounts:
    -----------------------
    Phone: 79111111 (Golden Beauty Salon)
    Phone: 79222222 (Lamsa Beauty Center)
    Phone: 79333333 (Princess Salon)
    
    Use OTP 123456 for testing authentication.
    
    =====================================================
    ';
END $$;