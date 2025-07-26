-- =====================================================
-- Lamsa Test Data Seed Script (Fixed for Current Schema)
-- =====================================================
-- This script creates test data for development and testing
-- Run this after migrations to populate the database
-- 
-- Test Accounts:
-- Customers: 77123456, 78123456, 79123456, 77654321, 78654321
-- Providers: provider1@lamsa.com, provider2@lamsa.com, provider3@lamsa.com
-- Provider phones: 79111111, 79222222, 79333333
-- All passwords: Test123456!
-- =====================================================

-- Clean existing test data (optional - comment out if you want to keep existing data)
DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '77%' OR phone LIKE '78%' OR phone LIKE '79%');
DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '77%' OR phone LIKE '78%' OR phone LIKE '79%'));
DELETE FROM bookings WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '77%' OR phone LIKE '78%' OR phone LIKE '79%');
DELETE FROM user_favorites WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '77%' OR phone LIKE '78%' OR phone LIKE '79%');
DELETE FROM provider_special_dates WHERE provider_id IN (SELECT id FROM providers WHERE email LIKE 'provider%@lamsa.com');
DELETE FROM provider_availability WHERE provider_id IN (SELECT id FROM providers WHERE email LIKE 'provider%@lamsa.com');
DELETE FROM services WHERE provider_id IN (SELECT id FROM providers WHERE email LIKE 'provider%@lamsa.com');
DELETE FROM providers WHERE email LIKE 'provider%@lamsa.com';
DELETE FROM users WHERE phone LIKE '77%' OR phone LIKE '78%' OR phone LIKE '79%';

-- =====================================================
-- 1. CREATE TEST CUSTOMERS (users table)
-- =====================================================

INSERT INTO users (id, phone, name, email, language, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', '77123456', 'سارة أحمد', 'sara@example.com', 'ar', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', '78123456', 'مريم خالد', 'mariam@example.com', 'ar', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', '79123456', 'نور العبدالله', 'noor@example.com', 'ar', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', '77654321', 'لينا محمد', 'lina@example.com', 'ar', NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', '78654321', 'دانا يوسف', 'dana@example.com', 'ar', NOW(), NOW());

-- =====================================================
-- 2. CREATE SERVICE CATEGORIES (if not exists)
-- =====================================================

INSERT INTO service_categories (id, name_en, name_ar, slug, icon, parent_id, display_order, is_active) 
VALUES
('cat-001', 'Hair Styling', 'تصفيف الشعر', 'hair-styling', 'scissors', NULL, 1, true),
('cat-002', 'Nail Care', 'العناية بالأظافر', 'nail-care', 'palette', NULL, 2, true),
('cat-003', 'Facial Treatments', 'العناية بالبشرة', 'facial-treatments', 'sparkles', NULL, 3, true),
('cat-004', 'Makeup Services', 'خدمات المكياج', 'makeup-services', 'brush', NULL, 4, true),
('cat-005', 'Spa & Massage', 'السبا والمساج', 'spa-massage', 'spa', NULL, 5, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 3. CREATE TEST PROVIDERS
-- =====================================================

-- Note: Using crypt function for password hashing (Test123456!)
-- If crypt is not available, you'll need to hash passwords externally
INSERT INTO providers (
    id, email, phone, password_hash,
    business_name_ar, business_name_en, owner_name,
    description_ar, description_en,
    latitude, longitude, location,
    address,
    status, rating, total_reviews, total_bookings,
    service_type, working_hours,
    instant_booking_enabled, advance_booking_days,
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
    ST_MakePoint(35.9106, 31.9539)::geography,
    jsonb_build_object(
        'street_ar', '١٢٣ دوار عبدون',
        'street_en', '123 Abdoun Circle',
        'area_ar', 'عبدون',
        'area_en', 'Abdoun',
        'city_ar', 'عمان',
        'city_en', 'Amman',
        'building_no', '123'
    ),
    'approved',
    4.8,
    125,
    350,
    'home_and_center',
    jsonb_build_object(
        'sunday', jsonb_build_object('open', '09:00', 'close', '21:00', 'is_closed', false),
        'monday', jsonb_build_object('open', '09:00', 'close', '21:00', 'is_closed', false),
        'tuesday', jsonb_build_object('open', '09:00', 'close', '21:00', 'is_closed', false),
        'wednesday', jsonb_build_object('open', '09:00', 'close', '21:00', 'is_closed', false),
        'thursday', jsonb_build_object('open', '09:00', 'close', '21:00', 'is_closed', false),
        'friday', jsonb_build_object('is_closed', true),
        'saturday', jsonb_build_object('open', '10:00', 'close', '20:00', 'is_closed', false)
    ),
    true,
    7,
    NOW() - INTERVAL '6 months',
    NOW()
),
(
    '77777777-7777-7777-7777-777777777777',
    'provider2@lamsa.com',
    '79222222',
    '$2b$10$YourHashedPasswordHere', -- Replace with actual hash
    'مركز لمسة للتجميل',
    'Lamsa Beauty Center',
    'هدى السعيد',
    'مركز تجميل حديث يقدم أحدث العلاجات',
    'Modern beauty center offering latest treatments',
    31.9764,
    35.8719,
    ST_MakePoint(35.8719, 31.9764)::geography,
    jsonb_build_object(
        'street_ar', '٤٥٦ شارع الوكالات',
        'street_en', '456 Wakalat Street',
        'area_ar', 'الصويفية',
        'area_en', 'Sweifieh',
        'city_ar', 'عمان',
        'city_en', 'Amman',
        'building_no', '456'
    ),
    'approved',
    4.6,
    98,
    280,
    'center_only',
    jsonb_build_object(
        'sunday', jsonb_build_object('open', '10:00', 'close', '20:00', 'is_closed', false),
        'monday', jsonb_build_object('open', '10:00', 'close', '20:00', 'is_closed', false),
        'tuesday', jsonb_build_object('open', '10:00', 'close', '20:00', 'is_closed', false),
        'wednesday', jsonb_build_object('open', '10:00', 'close', '20:00', 'is_closed', false),
        'thursday', jsonb_build_object('open', '10:00', 'close', '20:00', 'is_closed', false),
        'friday', jsonb_build_object('open', '14:00', 'close', '20:00', 'is_closed', false),
        'saturday', jsonb_build_object('open', '10:00', 'close', '20:00', 'is_closed', false)
    ),
    true,
    14,
    NOW() - INTERVAL '4 months',
    NOW()
),
(
    '88888888-8888-8888-8888-888888888888',
    'provider3@lamsa.com',
    '79333333',
    '$2b$10$YourHashedPasswordHere', -- Replace with actual hash
    'صالون الأميرة',
    'Princess Salon',
    'ريم العمري',
    'صالون حصري للعرائس والمناسبات الخاصة',
    'Exclusive salon for bridal and special occasions',
    31.9631,
    35.8292,
    ST_MakePoint(35.8292, 31.9631)::geography,
    jsonb_build_object(
        'street_ar', '٧٨٩ شارع الملكة رانيا',
        'street_en', '789 Queen Rania Street',
        'area_ar', 'الشميساني',
        'area_en', 'Shmeisani',
        'city_ar', 'عمان',
        'city_en', 'Amman',
        'building_no', '789'
    ),
    'approved',
    4.9,
    156,
    420,
    'home_only',
    jsonb_build_object(
        'sunday', jsonb_build_object('open', '11:00', 'close', '22:00', 'is_closed', false),
        'monday', jsonb_build_object('is_closed', true),
        'tuesday', jsonb_build_object('open', '11:00', 'close', '22:00', 'is_closed', false),
        'wednesday', jsonb_build_object('open', '11:00', 'close', '22:00', 'is_closed', false),
        'thursday', jsonb_build_object('open', '11:00', 'close', '22:00', 'is_closed', false),
        'friday', jsonb_build_object('open', '14:00', 'close', '22:00', 'is_closed', false),
        'saturday', jsonb_build_object('open', '11:00', 'close', '22:00', 'is_closed', false)
    ),
    false,
    3,
    NOW() - INTERVAL '1 year',
    NOW()
);

-- =====================================================
-- 4. CREATE SERVICES
-- =====================================================

-- Golden Beauty Salon Services
INSERT INTO services (
    id, provider_id, category_id, 
    name_ar, name_en,
    description_ar, description_en, 
    price, duration, 
    is_active, display_order, created_at, updated_at
) VALUES
-- Hair Services
('serv-001', '66666666-6666-6666-6666-666666666666', 'cat-001', 'قص وتصفيف الشعر', 'Hair Cut & Style', 'قص شعر احترافي مع التصفيف', 'Professional haircut with styling', 25.00, 60, true, 1, NOW(), NOW()),
('serv-002', '66666666-6666-6666-6666-666666666666', 'cat-001', 'صبغة الشعر', 'Hair Color', 'خدمة صبغ الشعر الكاملة', 'Full hair coloring service', 45.00, 120, true, 2, NOW(), NOW()),
('serv-003', '66666666-6666-6666-6666-666666666666', 'cat-001', 'علاج الشعر', 'Hair Treatment', 'علاج ترطيب عميق للشعر', 'Deep conditioning treatment', 35.00, 90, true, 3, NOW(), NOW()),

-- Nail Services
('serv-004', '66666666-6666-6666-6666-666666666666', 'cat-002', 'مانيكير كلاسيكي', 'Classic Manicure', 'مانيكير كلاسيكي مع طلاء', 'Classic manicure with polish', 15.00, 45, true, 1, NOW(), NOW()),
('serv-005', '66666666-6666-6666-6666-666666666666', 'cat-002', 'مانيكير جل', 'Gel Manicure', 'مانيكير جل طويل الأمد', 'Long-lasting gel manicure', 25.00, 60, true, 2, NOW(), NOW()),

-- Lamsa Beauty Center Services
-- Facial Services
('serv-006', '77777777-7777-7777-7777-777777777777', 'cat-003', 'تنظيف عميق للبشرة', 'Deep Cleansing Facial', 'تنظيف عميق لمسام البشرة', 'Deep pore cleansing facial', 40.00, 75, true, 1, NOW(), NOW()),
('serv-007', '77777777-7777-7777-7777-777777777777', 'cat-003', 'علاج مكافحة الشيخوخة', 'Anti-Aging Facial', 'علاج متقدم لمكافحة الشيخوخة', 'Advanced anti-aging treatment', 60.00, 90, true, 2, NOW(), NOW()),
('serv-008', '77777777-7777-7777-7777-777777777777', 'cat-003', 'علاج ترطيب البشرة', 'Hydrating Facial', 'علاج ترطيب مكثف', 'Intensive hydration treatment', 45.00, 60, true, 3, NOW(), NOW()),

-- Makeup Services
('serv-009', '77777777-7777-7777-7777-777777777777', 'cat-004', 'مكياج سهرة', 'Party Makeup', 'مكياج للسهرات المسائية', 'Evening party makeup', 35.00, 60, true, 1, NOW(), NOW()),
('serv-010', '77777777-7777-7777-7777-777777777777', 'cat-004', 'مكياج طبيعي', 'Natural Makeup', 'مكياج طبيعي للنهار', 'Natural day makeup', 25.00, 45, true, 2, NOW(), NOW()),

-- Princess Salon Services
-- Bridal Services
('serv-011', '88888888-8888-8888-8888-888888888888', 'cat-004', 'مكياج عروس', 'Bridal Makeup', 'باقة مكياج العروس الكاملة', 'Complete bridal makeup package', 150.00, 120, true, 1, NOW(), NOW()),
('serv-012', '88888888-8888-8888-8888-888888888888', 'cat-001', 'تسريحة عروس', 'Bridal Hair Styling', 'تسريحة شعر أنيقة للعروس', 'Elegant bridal hair styling', 100.00, 90, true, 2, NOW(), NOW()),

-- Spa Services
('serv-013', '88888888-8888-8888-8888-888888888888', 'cat-005', 'مساج سويدي', 'Swedish Massage', 'مساج سويدي للاسترخاء', 'Relaxing Swedish massage', 50.00, 60, true, 1, NOW(), NOW()),
('serv-014', '88888888-8888-8888-8888-888888888888', 'cat-005', 'مساج الحجر الساخن', 'Hot Stone Massage', 'مساج علاجي بالحجر الساخن', 'Therapeutic hot stone massage', 70.00, 90, true, 2, NOW(), NOW()),
('serv-015', '88888888-8888-8888-8888-888888888888', 'cat-005', 'حمام مغربي', 'Moroccan Bath', 'حمام مغربي تقليدي', 'Traditional Moroccan bath', 80.00, 120, true, 3, NOW(), NOW());

-- =====================================================
-- 5. CREATE PROVIDER AVAILABILITY
-- =====================================================

-- Golden Beauty Salon - Open 9 AM to 9 PM, closed on Fridays
INSERT INTO provider_availability (id, provider_id, day_of_week, start_time, end_time, is_available) VALUES
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 0, '09:00', '21:00', true), -- Sunday
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 1, '09:00', '21:00', true), -- Monday
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 2, '09:00', '21:00', true), -- Tuesday
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 3, '09:00', '21:00', true), -- Wednesday
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 4, '09:00', '21:00', true), -- Thursday
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 5, NULL, NULL, false),      -- Friday (closed)
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 6, '10:00', '20:00', true); -- Saturday

-- Lamsa Beauty Center - Open 10 AM to 8 PM daily
INSERT INTO provider_availability (id, provider_id, day_of_week, start_time, end_time, is_available) VALUES
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 0, '10:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 1, '10:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 2, '10:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 3, '10:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 4, '10:00', '20:00', true),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 5, '14:00', '20:00', true), -- Friday afternoon only
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 6, '10:00', '20:00', true);

-- Princess Salon - Open 11 AM to 10 PM, closed on Mondays
INSERT INTO provider_availability (id, provider_id, day_of_week, start_time, end_time, is_available) VALUES
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 0, '11:00', '22:00', true),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 1, NULL, NULL, false),      -- Monday (closed)
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 2, '11:00', '22:00', true),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 3, '11:00', '22:00', true),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 4, '11:00', '22:00', true),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 5, '14:00', '22:00', true),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', 6, '11:00', '22:00', true);

-- =====================================================
-- 6. CREATE BOOKINGS
-- =====================================================

-- Generate bookings for the past 30 days and next 30 days
DO $$
DECLARE
    booking_date DATE;
    booking_time TIME;
    booking_status booking_status;
    payment_status payment_status;
    customer_id UUID;
    provider_id UUID;
    service_id UUID;
    total_amount DECIMAL;
    duration INTEGER;
BEGIN
    -- Past bookings (completed and cancelled)
    FOR i IN 1..20 LOOP
        booking_date := CURRENT_DATE - (i * 2);
        booking_time := TIME '10:00' + (i % 8) * INTERVAL '1 hour';
        customer_id := (ARRAY['11111111-1111-1111-1111-111111111111'::UUID, '22222222-2222-2222-2222-222222222222'::UUID, '33333333-3333-3333-3333-333333333333'::UUID, '44444444-4444-4444-4444-444444444444'::UUID])[1 + (i % 4)];
        provider_id := (ARRAY['66666666-6666-6666-6666-666666666666'::UUID, '77777777-7777-7777-7777-777777777777'::UUID, '88888888-8888-8888-8888-888888888888'::UUID])[1 + (i % 3)];
        service_id := (ARRAY['serv-001'::UUID, 'serv-004'::UUID, 'serv-006'::UUID, 'serv-009'::UUID, 'serv-011'::UUID, 'serv-013'::UUID])[1 + (i % 6)];
        
        -- 80% completed, 20% cancelled
        IF i % 5 = 0 THEN
            booking_status := 'cancelled';
            payment_status := 'refunded';
        ELSE
            booking_status := 'completed';
            payment_status := 'paid';
        END IF;
        
        -- Get service price and duration
        SELECT price, duration INTO total_amount, duration FROM services WHERE id = service_id;
        
        INSERT INTO bookings (
            id, user_id, provider_id, service_id,
            booking_date, booking_time, duration,
            status, payment_status, payment_method,
            price, platform_fee, provider_earning,
            is_rated, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            customer_id,
            provider_id,
            service_id,
            booking_date,
            booking_time,
            duration,
            booking_status,
            payment_status,
            CASE WHEN i % 2 = 0 THEN 'card' ELSE 'cash' END,
            total_amount,
            CASE WHEN total_amount <= 25 THEN 2.00 ELSE 5.00 END,
            total_amount - CASE WHEN total_amount <= 25 THEN 2.00 ELSE 5.00 END,
            CASE WHEN booking_status = 'completed' AND i % 3 != 0 THEN true ELSE false END,
            booking_date + booking_time,
            booking_date + booking_time
        );
    END LOOP;
    
    -- Current and future bookings
    FOR i IN 0..15 LOOP
        booking_date := CURRENT_DATE + i;
        booking_time := TIME '11:00' + (i % 6) * INTERVAL '1.5 hour';
        customer_id := (ARRAY['22222222-2222-2222-2222-222222222222'::UUID, '33333333-3333-3333-3333-333333333333'::UUID, '44444444-4444-4444-4444-444444444444'::UUID, '55555555-5555-5555-5555-555555555555'::UUID])[1 + (i % 4)];
        provider_id := (ARRAY['66666666-6666-6666-6666-666666666666'::UUID, '77777777-7777-7777-7777-777777777777'::UUID, '88888888-8888-8888-8888-888888888888'::UUID])[1 + (i % 3)];
        service_id := (ARRAY['serv-002'::UUID, 'serv-005'::UUID, 'serv-007'::UUID, 'serv-010'::UUID, 'serv-012'::UUID, 'serv-014'::UUID])[1 + (i % 6)];
        
        -- Mix of pending and confirmed
        IF i = 0 OR i % 4 = 0 THEN
            booking_status := 'pending';
            payment_status := 'pending';
        ELSE
            booking_status := 'confirmed';
            payment_status := 'pending';
        END IF;
        
        -- Get service price and duration
        SELECT price, duration INTO total_amount, duration FROM services WHERE id = service_id;
        
        INSERT INTO bookings (
            id, user_id, provider_id, service_id,
            booking_date, booking_time, duration,
            status, payment_status, payment_method,
            price, platform_fee, provider_earning,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            customer_id,
            provider_id,
            service_id,
            booking_date,
            booking_time,
            duration,
            booking_status,
            payment_status,
            'card',
            total_amount,
            CASE WHEN total_amount <= 25 THEN 2.00 ELSE 5.00 END,
            total_amount - CASE WHEN total_amount <= 25 THEN 2.00 ELSE 5.00 END,
            NOW() - INTERVAL '1 day' * (15 - i),
            NOW() - INTERVAL '1 day' * (15 - i)
        );
    END LOOP;
END $$;

-- =====================================================
-- 7. CREATE REVIEWS
-- =====================================================

-- Add reviews for completed bookings that are marked as rated
INSERT INTO reviews (id, booking_id, user_id, provider_id, rating, comment_ar, comment_en, is_visible, created_at)
SELECT 
    gen_random_uuid(),
    b.id,
    b.user_id,
    b.provider_id,
    4 + (RANDOM())::INT, -- Rating between 4-5
    CASE 
        WHEN RANDOM() < 0.3 THEN 'خدمة ممتازة وموظفين محترفين'
        WHEN RANDOM() < 0.6 THEN 'راضية جداً عن الخدمة والنتيجة رائعة'
        WHEN RANDOM() < 0.8 THEN 'صالون نظيف وخدمة سريعة'
        ELSE 'أنصح بهذا المكان بشدة'
    END,
    CASE 
        WHEN RANDOM() < 0.3 THEN 'Excellent service and professional staff'
        WHEN RANDOM() < 0.6 THEN 'Very satisfied with the service and amazing results'
        WHEN RANDOM() < 0.8 THEN 'Clean salon and fast service'
        ELSE 'Highly recommend this place'
    END,
    true,
    b.updated_at + INTERVAL '1 day'
FROM bookings b
WHERE b.status = 'completed'
AND b.is_rated = true;

-- =====================================================
-- 8. CREATE PAYMENTS
-- =====================================================

-- Add payment records for paid bookings
INSERT INTO payments (
    id, booking_id, amount, payment_method, 
    status, gateway, transaction_ref,
    gateway_response, created_at
)
SELECT 
    gen_random_uuid(),
    b.id,
    b.price,
    b.payment_method,
    'success',
    'tap',
    'TAP_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 10),
    jsonb_build_object('status', 'success', 'payment_id', 'tap_' || gen_random_uuid()),
    b.updated_at
FROM bookings b
WHERE b.payment_status = 'paid';

-- =====================================================
-- 9. CREATE USER FAVORITES
-- =====================================================

INSERT INTO user_favorites (user_id, provider_id, created_at) VALUES
('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', NOW()),
('11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', NOW()),
('22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', NOW()),
('33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', NOW()),
('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', NOW()),
('44444444-4444-4444-4444-444444444444', '88888888-8888-8888-8888-888888888888', NOW())
ON CONFLICT (user_id, provider_id) DO NOTHING;

-- =====================================================
-- 10. CREATE NOTIFICATIONS
-- =====================================================

-- Recent notifications for users
INSERT INTO notifications (
    id, user_id, 
    title_ar, title_en,
    body_ar, body_en,
    type, metadata, 
    is_read, created_at
) 
SELECT 
    gen_random_uuid(),
    b.user_id,
    'تم تأكيد الحجز',
    'Booking Confirmed',
    'تم تأكيد حجزك بنجاح',
    'Your booking has been confirmed',
    'booking_status',
    jsonb_build_object('booking_id', b.id, 'status', 'confirmed'),
    false,
    b.created_at + INTERVAL '5 minutes'
FROM bookings b
WHERE b.status = 'confirmed'
AND b.booking_date >= CURRENT_DATE
LIMIT 10;

-- Add some reminder notifications
INSERT INTO notifications (
    id, user_id,
    title_ar, title_en,
    body_ar, body_en,
    type, metadata,
    is_read, created_at
)
SELECT 
    gen_random_uuid(),
    b.user_id,
    'تذكير بالموعد',
    'Booking Reminder',
    'لديك موعد غداً',
    'You have an appointment tomorrow',
    'booking_reminder',
    jsonb_build_object('booking_id', b.id),
    RANDOM() < 0.5, -- 50% read
    b.booking_date - INTERVAL '1 day'
FROM bookings b
WHERE b.status = 'confirmed'
AND b.booking_date = CURRENT_DATE + 1;

-- =====================================================
-- Update provider statistics
-- =====================================================

-- Update provider ratings and review counts based on actual reviews
UPDATE providers p
SET 
    rating = COALESCE((
        SELECT AVG(rating)::DECIMAL(3,2) 
        FROM reviews r 
        WHERE r.provider_id = p.id
    ), 4.5),
    total_reviews = (
        SELECT COUNT(*) 
        FROM reviews r 
        WHERE r.provider_id = p.id
    ),
    total_bookings = (
        SELECT COUNT(*) 
        FROM bookings b 
        WHERE b.provider_id = p.id
    )
WHERE p.id IN (
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888'
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
    - Phone: 77123456 (Sara Ahmed)
    - Phone: 78123456 (Mariam Khaled)  
    - Phone: 79123456 (Noor Abdullah)
    - Phone: 77654321 (Lina Mohammed)
    - Phone: 78654321 (Dana Yousef)
    
    Provider Test Accounts:
    -----------------------
    - Email: provider1@lamsa.com / Phone: 79111111 (Golden Beauty Salon)
    - Email: provider2@lamsa.com / Phone: 79222222 (Lamsa Beauty Center)
    - Email: provider3@lamsa.com / Phone: 79333333 (Princess Salon)
    - Password for all providers: Test123456!
    
    Note: You need to update the password hashes in the providers table
    or implement OTP login for providers.
    
    Features to test:
    - Browse providers and services
    - View provider profiles and availability
    - Create new bookings
    - View booking history
    - Leave reviews
    - Manage favorites
    
    =====================================================
    ';
END $$;