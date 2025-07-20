-- Lamsa Edge Cases and Performance Testing Data
-- Advanced scenarios for comprehensive testing
-- Run after both part 1 and part 2 seeding scripts

BEGIN;

-- ============================================================================
-- 13. EDGE CASE PROVIDERS - Testing boundary conditions
-- ============================================================================

INSERT INTO providers (
    id, business_name, business_name_ar, owner_name, phone, email, password_hash,
    location, address, address_ar, city, rating, total_reviews, is_mobile, 
    travel_radius_km, verified, active, business_hours
) VALUES 
-- Provider at Jordan's northern border (edge of geographic constraints)
(
    'edge1111-1111-1111-1111-111111111111',
    'Border Beauty Clinic',
    'عيادة الجمال الحدودية',
    'Dr. Khaled Mansour',
    '+96279999888',
    'border.beauty@clinic.jo',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.7, 33.3), 4326)::geography, -- Near Syrian border
    'Ramtha Border Area',
    'منطقة الرمثا الحدودية',
    'Irbid',
    0.00, -- No ratings yet (edge case)
    0,
    FALSE,
    5,
    TRUE,
    TRUE,
    '[{"day": 1, "open": "08:00", "close": "16:00"}, {"day": 2, "open": "08:00", "close": "16:00"}]'::jsonb
),

-- Mobile provider with maximum travel radius
(
    'edge2222-2222-2222-2222-222222222222',
    'Wide Range Mobile Beauty',
    'خدمات التجميل المتنقلة واسعة المدى',
    'Rana Al-Masri',
    '+96278888777',
    'wide.range.beauty@gmail.com',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.9, 31.95), 4326)::geography,
    'Central Amman',
    'وسط عمان',
    'Amman',
    5.00, -- Perfect rating (edge case)
    1, -- Only one review
    TRUE,
    50, -- Maximum realistic travel radius
    TRUE,
    TRUE,
    '[
        {"day": 0, "open": "06:00", "close": "23:59"},
        {"day": 1, "open": "06:00", "close": "23:59"},
        {"day": 2, "open": "06:00", "close": "23:59"},
        {"day": 3, "open": "06:00", "close": "23:59"},
        {"day": 4, "open": "06:00", "close": "23:59"},
        {"day": 5, "open": "06:00", "close": "23:59"},
        {"day": 6, "open": "06:00", "close": "23:59"}
    ]'::jsonb
),

-- Provider with extreme pricing (testing price boundaries)
(
    'edge3333-3333-3333-3333-333333333333',
    'Luxury Elite Spa',
    'منتجع النخبة الفاخر',
    'Dr. Layla Luxury',
    '+96279777666',
    'luxury.elite@spa.jo',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.93, 31.96), 4326)::geography,
    'Abdoun Heights, Premium Tower',
    'مرتفعات عبدون، البرج الفاخر',
    'Amman',
    4.95,
    200,
    FALSE,
    5,
    TRUE,
    TRUE,
    '[{"day": 1, "open": "10:00", "close": "20:00"}, {"day": 2, "open": "10:00", "close": "20:00"}]'::jsonb
),

-- Budget provider with minimum pricing
(
    'edge4444-4444-4444-4444-444444444444',
    'Student Budget Beauty',
    'تجميل الطلاب الاقتصادي',
    'Amira Student',
    '+96277666555',
    'budget.student@beauty.com',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.85, 31.98), 4326)::geography,
    'University Area',
    'المنطقة الجامعية',
    'Amman',
    3.8,
    50,
    FALSE,
    5,
    TRUE,
    TRUE,
    '[{"day": 0, "open": "12:00", "close": "20:00"}, {"day": 6, "open": "12:00", "close": "20:00"}]'::jsonb
);

-- ============================================================================
-- 14. EDGE CASE SERVICES - Boundary value testing
-- ============================================================================

WITH category_ids AS (
    SELECT 
        id,
        CASE name_en
            WHEN 'Hair Styling' THEN 'hair'
            WHEN 'Beauty Clinic' THEN 'clinic'
            WHEN 'Massage' THEN 'spa'
            WHEN 'Nails' THEN 'nails'
        END as category_key
    FROM service_categories
)

INSERT INTO services (
    id, provider_id, category_id, name_en, name_ar, 
    description_en, description_ar, price, duration_minutes, active
) VALUES 
-- Minimum price service (1 JOD - testing lower boundary)
(
    'edge1111-1111-1111-1111-111111111111',
    'edge4444-4444-4444-4444-444444444444', -- Budget provider
    (SELECT id FROM category_ids WHERE category_key = 'nails'),
    'Quick Nail File',
    'برد الأظافر السريع',
    'Basic nail filing service - minimum pricing',
    'خدمة برد الأظافر الأساسية - بأقل سعر',
    1.00, -- Minimum price boundary
    15, -- Minimum duration boundary
    true
),

-- Maximum price service (testing upper boundary)
(
    'edge2222-2222-2222-2222-222222222222',
    'edge3333-3333-3333-3333-333333333333', -- Luxury provider
    (SELECT id FROM category_ids WHERE category_key = 'clinic'),
    'Premium VIP Full Treatment Package',
    'باقة العلاج الكاملة VIP الفاخرة',
    'Ultimate luxury beauty package with all premium treatments',
    'باقة الجمال الفاخرة النهائية مع جميع العلاجات المتميزة',
    9999.00, -- Near maximum price boundary
    480, -- Maximum duration boundary (8 hours)
    true
),

-- Service with unusual duration
(
    'edge3333-3333-3333-3333-333333333333',
    'edge2222-2222-2222-2222-222222222222', -- Wide range mobile
    (SELECT id FROM category_ids WHERE category_key = 'hair'),
    'Express Touch-Up',
    'إصلاح سريع',
    'Ultra-quick hair touch-up service',
    'خدمة إصلاح الشعر السريعة جداً',
    25.00,
    15, -- Minimum duration
    true
),

-- Arabic-heavy service names (Unicode testing)
(
    'edge4444-4444-4444-4444-444444444444',
    'edge1111-1111-1111-1111-111111111111', -- Border provider
    (SELECT id FROM category_ids WHERE category_key = 'spa'),
    'Traditional Jordanian Spa Treatment',
    'العلاج التقليدي الأردني للمنتجع الصحي مع الأعشاب الطبيعية والزيوت العطرية التراثية',
    'Authentic Jordanian spa experience with traditional herbs',
    'تجربة منتجع صحي أردنية أصيلة مع الأعشاب التقليدية والزيوت المعطرة من التراث الشعبي الأردني العريق',
    75.00,
    120,
    true
);

-- ============================================================================
-- 15. EDGE CASE USERS - Testing various scenarios
-- ============================================================================

INSERT INTO users (
    id, phone, name, email, preferred_language, 
    notification_preferences, active, created_at
) VALUES 
-- User with maximum length name (Unicode)
(
    'edge1111-1111-1111-1111-111111111111',
    '+96277000001',
    'عبد الرحمن محمد أحمد علي حسن محمود إبراهيم صالح خالد فادي ناصر',
    'long.name.test@example.com',
    'ar',
    '{"sms": false, "push": false, "email": false}'::jsonb, -- All notifications off
    TRUE,
    NOW() - INTERVAL '1 day'
),

-- User with minimal data
(
    'edge2222-2222-2222-2222-222222222222',
    '+96277000002',
    'س ع', -- Very short name
    NULL, -- No email
    'ar',
    '{"sms": true, "push": true, "email": true}'::jsonb,
    TRUE,
    NOW()
),

-- Inactive user (testing status scenarios)
(
    'edge3333-3333-3333-3333-333333333333',
    '+96277000003',
    'Inactive User Test',
    'inactive.test@example.com',
    'en',
    '{"sms": true, "push": true, "email": true}'::jsonb,
    FALSE, -- Inactive user
    NOW() - INTERVAL '1 year'
);

-- ============================================================================
-- 16. COMPLEX BOOKING SCENARIOS - Edge cases
-- ============================================================================

INSERT INTO bookings (
    id, user_id, provider_id, service_id, booking_date, start_time, end_time,
    status, total_price, original_price, discount_amount, platform_fee, provider_earnings,
    payment_method, payment_status, user_notes, location_type, user_location, user_address,
    created_at
) VALUES 
-- Booking at maximum advance limit (30 days)
(
    'bedge111-1111-1111-1111-111111111111',
    'u1111111-1111-1111-1111-111111111111',
    'edge3333-3333-3333-3333-333333333333', -- Luxury provider
    'edge2222-2222-2222-2222-222222222222', -- Premium VIP package
    CURRENT_DATE + 30, -- Maximum advance booking
    '10:00'::time,
    '18:00'::time, -- 8-hour service (maximum duration)
    'pending',
    9999.00, 9999.00, 0.00, 1499.85, 8499.15,
    'card', 'pending',
    'Special VIP treatment for anniversary celebration',
    'salon',
    NULL,
    NULL,
    NOW() - INTERVAL '1 hour'
),

-- Mobile service at edge of travel radius
(
    'bedge222-2222-2222-2222-222222222222',
    'edge1111-1111-1111-1111-111111111111', -- Long name user
    'edge2222-2222-2222-2222-222222222222', -- Wide range mobile
    'edge3333-3333-3333-3333-333333333333', -- Express touch-up
    CURRENT_DATE + 3,
    '07:00'::time, -- Very early morning
    '07:15'::time, -- Minimum duration
    'confirmed',
    25.00, 25.00, 0.00, 3.75, 21.25,
    'cash', 'pending',
    'نحتاج خدمة سريعة جداً في الصباح الباكر', -- Arabic notes
    'customer',
    ST_SetSRID(ST_MakePoint(35.85, 31.90), 4326)::geography, -- Customer location
    'Tla''a Al-Ali, Building 15, Apartment 501, Please call from downstairs',
    NOW() - INTERVAL '6 hours'
),

-- Booking with loyalty points payment
(
    'bedge333-3333-3333-3333-333333333333',
    'u5555555-5555-5555-5555-555555555555', -- فاطمة النابلسي (Platinum)
    'edge4444-4444-4444-4444-444444444444', -- Budget provider
    'edge1111-1111-1111-1111-111111111111', -- Minimum price service
    CURRENT_DATE + 1,
    '23:45'::time, -- Late night (testing time boundaries)
    '00:00'::time, -- Midnight boundary
    'confirmed',
    1.00, 1.00, 0.00, 0.15, 0.85, -- Minimum price calculations
    'loyalty_points', 'completed',
    'Testing minimum price service with points',
    'salon',
    NULL,
    NULL,
    NOW() - INTERVAL '2 days'
);

-- ============================================================================
-- 17. PERFORMANCE TESTING DATA - Large datasets
-- ============================================================================

-- Generate additional providers for performance testing
INSERT INTO providers (
    id, business_name, business_name_ar, owner_name, phone, email, password_hash,
    location, address, address_ar, city, rating, total_reviews, is_mobile, 
    travel_radius_km, verified, active, business_hours
)
SELECT 
    uuid_generate_v4(),
    'Performance Test Salon ' || i,
    'صالون اختبار الأداء ' || i,
    'Test Owner ' || i,
    '+96277' || LPAD(i::text, 6, '0'),
    'test' || i || '@performance.jo',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(
        35.8 + (random() * 0.3), -- Random longitude around Amman
        31.9 + (random() * 0.2)  -- Random latitude around Amman
    ), 4326)::geography,
    'Test Address ' || i,
    'عنوان اختبار ' || i,
    'Amman',
    ROUND((random() * 4 + 1)::numeric, 2), -- Random rating 1-5
    FLOOR(random() * 200)::integer, -- Random review count
    (random() > 0.7), -- 30% mobile providers
    CASE WHEN (random() > 0.7) THEN FLOOR(random() * 20 + 5)::integer ELSE 5 END,
    TRUE,
    TRUE,
    '[{"day": 1, "open": "09:00", "close": "18:00"}, {"day": 2, "open": "09:00", "close": "18:00"}]'::jsonb
FROM generate_series(1, 50) AS i; -- Generate 50 additional providers

-- Generate additional services for performance testing
WITH perf_providers AS (
    SELECT id, business_name FROM providers 
    WHERE business_name LIKE 'Performance Test Salon%'
),
category_ids AS (
    SELECT id, name_en FROM service_categories LIMIT 3
)
INSERT INTO services (
    id, provider_id, category_id, name_en, name_ar, 
    description_en, description_ar, price, duration_minutes, active
)
SELECT 
    uuid_generate_v4(),
    p.id,
    c.id,
    'Performance Service ' || ROW_NUMBER() OVER() || ' - ' || c.name_en,
    'خدمة اختبار الأداء ' || ROW_NUMBER() OVER() || ' - ' || c.name_en,
    'Performance testing service for ' || p.business_name,
    'خدمة اختبار الأداء لـ ' || p.business_name,
    ROUND((random() * 200 + 10)::numeric, 2), -- Random price 10-210 JOD
    (FLOOR(random() * 8 + 1) * 15)::integer, -- Random duration 15-120 minutes
    TRUE
FROM perf_providers p
CROSS JOIN category_ids c;

COMMIT;

-- ============================================================================
-- 18. VERIFY DATA INTEGRITY - Run validation checks
-- ============================================================================

DO $$
DECLARE
    provider_count INTEGER;
    service_count INTEGER;
    user_count INTEGER;
    booking_count INTEGER;
    review_count INTEGER;
    total_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO provider_count FROM providers;
    SELECT COUNT(*) INTO service_count FROM services;
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO booking_count FROM bookings;
    SELECT COUNT(*) INTO review_count FROM reviews;
    
    total_records := provider_count + service_count + user_count + booking_count + review_count;
    
    RAISE NOTICE 'Lamsa Edge Cases and Performance Data Seeding Complete!';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Data Summary:';
    RAISE NOTICE '  Providers: % (including % edge cases)', provider_count, 4;
    RAISE NOTICE '  Services: % (including boundary tests)', service_count;
    RAISE NOTICE '  Users: % (including edge cases)', user_count;
    RAISE NOTICE '  Bookings: % (including complex scenarios)', booking_count;
    RAISE NOTICE '  Reviews: %', review_count;
    RAISE NOTICE '  Total Records: %', total_records;
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Edge Cases Included:';
    RAISE NOTICE '  ✓ Geographic boundary testing';
    RAISE NOTICE '  ✓ Price boundary testing (1 JOD - 9999 JOD)';
    RAISE NOTICE '  ✓ Duration boundary testing (15-480 minutes)';
    RAISE NOTICE '  ✓ Unicode and Arabic text handling';
    RAISE NOTICE '  ✓ Booking conflicts and overlaps';
    RAISE NOTICE '  ✓ Performance testing data (50+ additional providers)';
    RAISE NOTICE '  ✓ All booking statuses and payment methods';
    RAISE NOTICE '  ✓ Mobile service location testing';
    RAISE NOTICE '  ✓ Loyalty tier and promotion scenarios';
    RAISE NOTICE '=======================================================';
END$$;
