-- =====================================================
-- Lamsa Test Data Seed Script
-- =====================================================
-- This script creates test data for development and testing
-- Run this after migrations to populate the database
-- 
-- Test Accounts:
-- Customers: 77123456, 78123456, 79123456, 77654321, 78654321
-- Providers: 79111111, 79222222, 79333333
-- All OTPs: 123456
-- =====================================================

-- Clean existing test data (optional - comment out if you want to keep existing data)
TRUNCATE TABLE reviews CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE bookings CASCADE;
TRUNCATE TABLE provider_special_dates CASCADE;
TRUNCATE TABLE provider_availability CASCADE;
TRUNCATE TABLE services CASCADE;
TRUNCATE TABLE providers CASCADE;
TRUNCATE TABLE service_categories CASCADE;
TRUNCATE TABLE users CASCADE;

-- =====================================================
-- 1. CREATE TEST USERS
-- =====================================================

-- Test Customers
INSERT INTO users (id, phone, name, email, role, language_preference, created_at, updated_at) VALUES
-- Customer accounts
('11111111-1111-1111-1111-111111111111', '77123456', 'سارة أحمد', 'sara@example.com', 'CUSTOMER', 'ar', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', '78123456', 'مريم خالد', 'mariam@example.com', 'CUSTOMER', 'ar', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', '79123456', 'نور العبدالله', 'noor@example.com', 'CUSTOMER', 'ar', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', '77654321', 'لينا محمد', 'lina@example.com', 'CUSTOMER', 'ar', NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', '78654321', 'دانا يوسف', 'dana@example.com', 'CUSTOMER', 'ar', NOW(), NOW()),

-- Provider accounts (these will be linked to provider profiles)
('66666666-6666-6666-6666-666666666666', '79111111', 'صالون الجمال الذهبي', 'golden.beauty@example.com', 'PROVIDER', 'ar', NOW(), NOW()),
('77777777-7777-7777-7777-777777777777', '79222222', 'مركز لمسة للتجميل', 'lamsa.center@example.com', 'PROVIDER', 'ar', NOW(), NOW()),
('88888888-8888-8888-8888-888888888888', '79333333', 'صالون الأميرة', 'princess.salon@example.com', 'PROVIDER', 'ar', NOW(), NOW());

-- =====================================================
-- 2. CREATE SERVICE CATEGORIES
-- =====================================================

INSERT INTO service_categories (id, name_en, name_ar, description_en, description_ar, icon, display_order, is_active) VALUES
('cat-001', 'Hair Styling', 'تصفيف الشعر', 'Professional hair styling services', 'خدمات تصفيف الشعر الاحترافية', 'hair-dryer', 1, true),
('cat-002', 'Nail Care', 'العناية بالأظافر', 'Manicure and pedicure services', 'خدمات المانيكير والباديكير', 'hand-sparkles', 2, true),
('cat-003', 'Facial Treatments', 'العناية بالبشرة', 'Skin care and facial treatments', 'العناية بالبشرة وعلاجات الوجه', 'face-smile', 3, true),
('cat-004', 'Makeup Services', 'خدمات المكياج', 'Professional makeup application', 'تطبيق مكياج احترافي', 'palette', 4, true),
('cat-005', 'Spa & Massage', 'السبا والمساج', 'Relaxation and massage services', 'خدمات الاسترخاء والمساج', 'spa', 5, true);

-- =====================================================
-- 3. CREATE PROVIDERS
-- =====================================================

INSERT INTO providers (
    id, user_id, business_name, business_name_ar, owner_name, phone, email,
    bio, bio_ar, location, address, address_ar, city,
    business_type, service_radius_km, 
    verified, active, rating, total_reviews,
    commission_rate, balance, total_earnings,
    created_at, updated_at
) VALUES
(
    '66666666-6666-6666-6666-666666666666',
    '66666666-6666-6666-6666-666666666666',
    'Golden Beauty Salon',
    'صالون الجمال الذهبي',
    'فاطمة الزهراء',
    '79111111',
    'golden.beauty@example.com',
    'Premium beauty salon with 10+ years of experience',
    'صالون تجميل فاخر مع أكثر من 10 سنوات من الخبرة',
    POINT(35.9106, 31.9539), -- Abdoun, Amman
    '123 Abdoun Circle, Amman',
    '123 دوار عبدون، عمان',
    'Amman',
    'SALON',
    5.0,
    true,
    true,
    4.8,
    125,
    0.15,
    2500.00,
    15000.00,
    NOW() - INTERVAL '6 months',
    NOW()
),
(
    '77777777-7777-7777-7777-777777777777',
    '77777777-7777-7777-7777-777777777777',
    'Lamsa Beauty Center',
    'مركز لمسة للتجميل',
    'هدى السعيد',
    '79222222',
    'lamsa.center@example.com',
    'Modern beauty center offering latest treatments',
    'مركز تجميل حديث يقدم أحدث العلاجات',
    POINT(35.8719, 31.9764), -- Sweifieh, Amman
    '456 Wakalat Street, Sweifieh',
    '456 شارع الوكالات، الصويفية',
    'Amman',
    'BEAUTY_CENTER',
    7.0,
    true,
    true,
    4.6,
    98,
    0.15,
    1800.00,
    12000.00,
    NOW() - INTERVAL '4 months',
    NOW()
),
(
    '88888888-8888-8888-8888-888888888888',
    '88888888-8888-8888-8888-888888888888',
    'Princess Salon',
    'صالون الأميرة',
    'ريم العمري',
    '79333333',
    'princess.salon@example.com',
    'Exclusive salon for bridal and special occasions',
    'صالون حصري للعرائس والمناسبات الخاصة',
    POINT(35.8292, 31.9631), -- Shmeisani, Amman
    '789 Queen Rania Street, Shmeisani',
    '789 شارع الملكة رانيا، الشميساني',
    'Amman',
    'SALON',
    10.0,
    true,
    true,
    4.9,
    156,
    0.15,
    3200.00,
    20000.00,
    NOW() - INTERVAL '1 year',
    NOW()
);

-- =====================================================
-- 4. CREATE SERVICES
-- =====================================================

-- Golden Beauty Salon Services
INSERT INTO services (
    id, provider_id, category_id, name_en, name_ar,
    description_en, description_ar, price, duration_minutes,
    is_active, display_order, created_at, updated_at
) VALUES
-- Hair Services
('serv-001', '66666666-6666-6666-6666-666666666666', 'cat-001', 'Hair Cut & Style', 'قص وتصفيف الشعر', 'Professional haircut with styling', 'قص شعر احترافي مع التصفيف', 25.00, 60, true, 1, NOW(), NOW()),
('serv-002', '66666666-6666-6666-6666-666666666666', 'cat-001', 'Hair Color', 'صبغة الشعر', 'Full hair coloring service', 'خدمة صبغ الشعر الكاملة', 45.00, 120, true, 2, NOW(), NOW()),
('serv-003', '66666666-6666-6666-6666-666666666666', 'cat-001', 'Hair Treatment', 'علاج الشعر', 'Deep conditioning treatment', 'علاج ترطيب عميق للشعر', 35.00, 90, true, 3, NOW(), NOW()),

-- Nail Services
('serv-004', '66666666-6666-6666-6666-666666666666', 'cat-002', 'Classic Manicure', 'مانيكير كلاسيكي', 'Classic manicure with polish', 'مانيكير كلاسيكي مع طلاء', 15.00, 45, true, 1, NOW(), NOW()),
('serv-005', '66666666-6666-6666-6666-666666666666', 'cat-002', 'Gel Manicure', 'مانيكير جل', 'Long-lasting gel manicure', 'مانيكير جل طويل الأمد', 25.00, 60, true, 2, NOW(), NOW()),

-- Lamsa Beauty Center Services
-- Facial Services
('serv-006', '77777777-7777-7777-7777-777777777777', 'cat-003', 'Deep Cleansing Facial', 'تنظيف عميق للبشرة', 'Deep pore cleansing facial', 'تنظيف عميق لمسام البشرة', 40.00, 75, true, 1, NOW(), NOW()),
('serv-007', '77777777-7777-7777-7777-777777777777', 'cat-003', 'Anti-Aging Facial', 'علاج مكافحة الشيخوخة', 'Advanced anti-aging treatment', 'علاج متقدم لمكافحة الشيخوخة', 60.00, 90, true, 2, NOW(), NOW()),
('serv-008', '77777777-7777-7777-7777-777777777777', 'cat-003', 'Hydrating Facial', 'علاج ترطيب البشرة', 'Intensive hydration treatment', 'علاج ترطيب مكثف', 45.00, 60, true, 3, NOW(), NOW()),

-- Makeup Services
('serv-009', '77777777-7777-7777-7777-777777777777', 'cat-004', 'Party Makeup', 'مكياج سهرة', 'Evening party makeup', 'مكياج للسهرات المسائية', 35.00, 60, true, 1, NOW(), NOW()),
('serv-010', '77777777-7777-7777-7777-777777777777', 'cat-004', 'Natural Makeup', 'مكياج طبيعي', 'Natural day makeup', 'مكياج طبيعي للنهار', 25.00, 45, true, 2, NOW(), NOW()),

-- Princess Salon Services
-- Bridal Services
('serv-011', '88888888-8888-8888-8888-888888888888', 'cat-004', 'Bridal Makeup', 'مكياج عروس', 'Complete bridal makeup package', 'باقة مكياج العروس الكاملة', 150.00, 120, true, 1, NOW(), NOW()),
('serv-012', '88888888-8888-8888-8888-888888888888', 'cat-001', 'Bridal Hair Styling', 'تسريحة عروس', 'Elegant bridal hair styling', 'تسريحة شعر أنيقة للعروس', 100.00, 90, true, 2, NOW(), NOW()),

-- Spa Services
('serv-013', '88888888-8888-8888-8888-888888888888', 'cat-005', 'Swedish Massage', 'مساج سويدي', 'Relaxing Swedish massage', 'مساج سويدي للاسترخاء', 50.00, 60, true, 1, NOW(), NOW()),
('serv-014', '88888888-8888-8888-8888-888888888888', 'cat-005', 'Hot Stone Massage', 'مساج الحجر الساخن', 'Therapeutic hot stone massage', 'مساج علاجي بالحجر الساخن', 70.00, 90, true, 2, NOW(), NOW()),
('serv-015', '88888888-8888-8888-8888-888888888888', 'cat-005', 'Moroccan Bath', 'حمام مغربي', 'Traditional Moroccan bath', 'حمام مغربي تقليدي', 80.00, 120, true, 3, NOW(), NOW());

-- =====================================================
-- 5. CREATE PROVIDER AVAILABILITY
-- =====================================================

-- Golden Beauty Salon - Open 9 AM to 9 PM, closed on Fridays
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('66666666-6666-6666-6666-666666666666', 0, '09:00', '21:00', true), -- Sunday
('66666666-6666-6666-6666-666666666666', 1, '09:00', '21:00', true), -- Monday
('66666666-6666-6666-6666-666666666666', 2, '09:00', '21:00', true), -- Tuesday
('66666666-6666-6666-6666-666666666666', 3, '09:00', '21:00', true), -- Wednesday
('66666666-6666-6666-6666-666666666666', 4, '09:00', '21:00', true), -- Thursday
('66666666-6666-6666-6666-666666666666', 5, NULL, NULL, false),      -- Friday (closed)
('66666666-6666-6666-6666-666666666666', 6, '10:00', '20:00', true); -- Saturday

-- Lamsa Beauty Center - Open 10 AM to 8 PM daily
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('77777777-7777-7777-7777-777777777777', 0, '10:00', '20:00', true),
('77777777-7777-7777-7777-777777777777', 1, '10:00', '20:00', true),
('77777777-7777-7777-7777-777777777777', 2, '10:00', '20:00', true),
('77777777-7777-7777-7777-777777777777', 3, '10:00', '20:00', true),
('77777777-7777-7777-7777-777777777777', 4, '10:00', '20:00', true),
('77777777-7777-7777-7777-777777777777', 5, '14:00', '20:00', true), -- Friday afternoon only
('77777777-7777-7777-7777-777777777777', 6, '10:00', '20:00', true);

-- Princess Salon - Open 11 AM to 10 PM, closed on Mondays
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
('88888888-8888-8888-8888-888888888888', 0, '11:00', '22:00', true),
('88888888-8888-8888-8888-888888888888', 1, NULL, NULL, false),      -- Monday (closed)
('88888888-8888-8888-8888-888888888888', 2, '11:00', '22:00', true),
('88888888-8888-8888-8888-888888888888', 3, '11:00', '22:00', true),
('88888888-8888-8888-8888-888888888888', 4, '11:00', '22:00', true),
('88888888-8888-8888-8888-888888888888', 5, '14:00', '22:00', true),
('88888888-8888-8888-8888-888888888888', 6, '11:00', '22:00', true);

-- =====================================================
-- 6. CREATE BOOKINGS
-- =====================================================

-- Generate bookings for the past 30 days and next 30 days
DO $$
DECLARE
    booking_date DATE;
    booking_time TIME;
    booking_status TEXT;
    payment_status TEXT;
    customer_id UUID;
    provider_id UUID;
    service_id UUID;
    total_amount DECIMAL;
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
            booking_status := 'CANCELLED';
            payment_status := 'REFUNDED';
        ELSE
            booking_status := 'COMPLETED';
            payment_status := 'PAID';
        END IF;
        
        -- Get service price
        SELECT price INTO total_amount FROM services WHERE id = service_id;
        
        INSERT INTO bookings (
            id, user_id, provider_id, service_id,
            booking_date, start_time, end_time,
            status, payment_status, payment_method,
            total_amount, platform_fee, provider_amount,
            notes, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            customer_id,
            provider_id,
            service_id,
            booking_date,
            booking_time,
            booking_time + INTERVAL '1 hour',
            booking_status,
            payment_status,
            CASE WHEN i % 2 = 0 THEN 'ONLINE' ELSE 'ON_SITE' END,
            total_amount,
            CASE WHEN total_amount <= 25 THEN 2.00 ELSE 5.00 END,
            total_amount - CASE WHEN total_amount <= 25 THEN 2.00 ELSE 5.00 END,
            CASE WHEN i % 3 = 0 THEN 'كانت الخدمة ممتازة' ELSE NULL END,
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
            booking_status := 'PENDING';
            payment_status := 'PENDING';
        ELSE
            booking_status := 'CONFIRMED';
            payment_status := 'PENDING';
        END IF;
        
        -- Get service price
        SELECT price INTO total_amount FROM services WHERE id = service_id;
        
        INSERT INTO bookings (
            id, user_id, provider_id, service_id,
            booking_date, start_time, end_time,
            status, payment_status, payment_method,
            total_amount, platform_fee, provider_amount,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            customer_id,
            provider_id,
            service_id,
            booking_date,
            booking_time,
            booking_time + INTERVAL '1.5 hour',
            booking_status,
            payment_status,
            'ONLINE',
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

-- Add reviews for completed bookings
INSERT INTO reviews (id, booking_id, user_id, provider_id, rating, comment, created_at)
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
    b.updated_at + INTERVAL '1 day'
FROM bookings b
WHERE b.status = 'COMPLETED'
AND RANDOM() < 0.8; -- 80% of completed bookings have reviews

-- =====================================================
-- 8. CREATE PAYMENTS
-- =====================================================

-- Add payment records for paid bookings
INSERT INTO payments (
    id, booking_id, amount, payment_method, 
    status, transaction_id, created_at
)
SELECT 
    gen_random_uuid(),
    b.id,
    b.total_amount,
    b.payment_method,
    'COMPLETED',
    'TAP_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 10),
    b.updated_at
FROM bookings b
WHERE b.payment_status = 'PAID';

-- =====================================================
-- 9. CREATE USER FAVORITES
-- =====================================================

INSERT INTO user_favorites (user_id, provider_id, created_at) VALUES
('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', NOW()),
('11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', NOW()),
('22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', NOW()),
('33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', NOW()),
('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', NOW()),
('44444444-4444-4444-4444-444444444444', '88888888-8888-8888-8888-888888888888', NOW());

-- =====================================================
-- 10. CREATE NOTIFICATIONS
-- =====================================================

-- Recent notifications for users
INSERT INTO notifications (
    id, user_id, title, title_ar, body, body_ar,
    type, data, read, created_at
) 
SELECT 
    gen_random_uuid(),
    b.user_id,
    'Booking Confirmed',
    'تم تأكيد الحجز',
    'Your booking has been confirmed',
    'تم تأكيد حجزك بنجاح',
    'BOOKING_CONFIRMED',
    jsonb_build_object('booking_id', b.id),
    false,
    b.created_at + INTERVAL '5 minutes'
FROM bookings b
WHERE b.status = 'CONFIRMED'
AND b.booking_date >= CURRENT_DATE
LIMIT 10;

-- Add some reminder notifications
INSERT INTO notifications (
    id, user_id, title, title_ar, body, body_ar,
    type, data, read, created_at
)
SELECT 
    gen_random_uuid(),
    b.user_id,
    'Booking Reminder',
    'تذكير بالموعد',
    'You have an appointment tomorrow',
    'لديك موعد غداً',
    'BOOKING_REMINDER',
    jsonb_build_object('booking_id', b.id),
    RANDOM() < 0.5, -- 50% read
    b.booking_date - INTERVAL '1 day'
FROM bookings b
WHERE b.status = 'CONFIRMED'
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
    
    Test Accounts:
    -------------
    Customers:
    - Phone: 77123456 (Sara Ahmed)
    - Phone: 78123456 (Mariam Khaled)  
    - Phone: 79123456 (Noor Abdullah)
    - Phone: 77654321 (Lina Mohammed)
    - Phone: 78654321 (Dana Yousef)
    
    Providers:
    - Phone: 79111111 (Golden Beauty Salon)
    - Phone: 79222222 (Lamsa Beauty Center)
    - Phone: 79333333 (Princess Salon)
    
    All accounts use OTP: 123456
    
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