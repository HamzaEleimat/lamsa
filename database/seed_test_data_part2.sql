-- BeautyCort Test Data Seeding Script - Part 2
-- Bookings, Reviews, Loyalty Data, and Edge Cases
-- Run after seed_test_data.sql

BEGIN;

-- ============================================================================
-- 6. USER LOYALTY STATUS - Initialize loyalty data for users
-- ============================================================================

INSERT INTO user_loyalty_status (
    user_id, total_points, available_points, tier, tier_achieved_at,
    lifetime_spent, total_bookings, last_activity_at
) VALUES 
(
    'u1111111-1111-1111-1111-111111111111', -- نور أحمد - Silver tier
    1450, 1200, 'silver', NOW() - INTERVAL '2 months',
    1650.00, 15, NOW() - INTERVAL '1 week'
),
(
    'u2222222-2222-2222-2222-222222222222', -- Sarah Johnson - Bronze tier
    230, 230, 'bronze', NOW() - INTERVAL '4 months',
    285.00, 3, NOW() - INTERVAL '3 days'
),
(
    'u3333333-3333-3333-3333-333333333333', -- ليلى الزهراء - Gold tier
    3200, 2800, 'gold', NOW() - INTERVAL '3 months',
    4200.00, 28, NOW() - INTERVAL '2 days'
),
(
    'u4444444-4444-4444-4444-444444444444', -- مريم حسين - Bronze tier
    180, 150, 'bronze', NOW() - INTERVAL '2 months',
    220.00, 2, NOW() - INTERVAL '1 month'
),
(
    'u5555555-5555-5555-5555-555555555555', -- فاطمة النابلسي - Platinum tier
    6800, 5200, 'platinum', NOW() - INTERVAL '6 months',
    8500.00, 45, NOW() - INTERVAL '1 day'
),
(
    'u6666666-6666-6666-6666-666666666666', -- Dana Al-Khatib - Bronze tier
    420, 380, 'bronze', NOW() - INTERVAL '3 months',
    520.00, 6, NOW() - INTERVAL '5 days'
),
(
    'u7777777-7777-7777-7777-777777777777', -- أسماء الطويل - Bronze tier
    85, 85, 'bronze', NOW() - INTERVAL '1 month',
    95.00, 1, NOW() - INTERVAL '1 month'
),
(
    'u8888888-8888-8888-8888-888888888888', -- Jessica Williams - Silver tier
    1100, 950, 'silver', NOW() - INTERVAL '1 month',
    1350.00, 12, NOW() - INTERVAL '4 days'
)
ON CONFLICT (user_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    available_points = EXCLUDED.available_points,
    tier = EXCLUDED.tier,
    lifetime_spent = EXCLUDED.lifetime_spent,
    total_bookings = EXCLUDED.total_bookings;

-- ============================================================================
-- 7. SAMPLE BOOKINGS - Realistic booking scenarios
-- ============================================================================

-- Get some service IDs for bookings
WITH service_lookup AS (
    SELECT s.id, s.name_en, s.price, s.duration_minutes, s.provider_id
    FROM services s
    WHERE s.active = TRUE
)

INSERT INTO bookings (
    id, user_id, provider_id, service_id, booking_date, start_time, end_time,
    status, total_price, original_price, discount_amount, platform_fee, provider_earnings,
    payment_method, payment_status, user_notes, completed_at, created_at
) VALUES 
-- Completed bookings (for reviews and loyalty points)
(
    'b1111111-1111-1111-1111-111111111111',
    'u1111111-1111-1111-1111-111111111111', -- نور أحمد
    '11111111-1111-1111-1111-111111111111', -- Amman Hair Studio
    'a1111111-1111-1111-1111-111111111111', -- Hair Cut & Blow Dry
    CURRENT_DATE - 3,
    '14:00'::time,
    '14:45'::time,
    'completed',
    25.00, 25.00, 0.00, 3.75, 21.25,
    'card', 'completed',
    'Great service, very professional staff!',
    (CURRENT_DATE - 3)::timestamp + '14:45'::time,
    (CURRENT_DATE - 5)::timestamp + '10:30'::time
),
(
    'b2222222-2222-2222-2222-222222222222',
    'u3333333-3333-3333-3333-333333333333', -- ليلى الزهراء
    '55555555-5555-5555-5555-555555555555', -- Advanced Aesthetics Clinic
    'a5555555-5555-5555-5555-555555555551', -- Botox Treatment
    CURRENT_DATE - 7,
    '10:00'::time,
    '10:30'::time,
    'completed',
    180.00, 180.00, 0.00, 27.00, 153.00,
    'card', 'completed',
    'Excellent results, Dr. Ahmed is very skilled',
    (CURRENT_DATE - 7)::timestamp + '10:30'::time,
    (CURRENT_DATE - 10)::timestamp + '16:20'::time
),
(
    'b3333333-3333-3333-3333-333333333333',
    'u5555555-5555-5555-5555-555555555555', -- فاطمة النابلسي
    '77777777-7777-7777-7777-777777777777', -- Glamour Makeup Studio
    'a7777777-7777-7777-7777-777777777771', -- Bridal Makeup
    CURRENT_DATE - 14,
    '15:00'::time,
    '17:00'::time,
    'completed',
    120.00, 120.00, 0.00, 18.00, 102.00,
    'cash', 'completed',
    'Perfect for my daughter''s wedding, thank you Lina!',
    (CURRENT_DATE - 14)::timestamp + '17:00'::time,
    (CURRENT_DATE - 21)::timestamp + '11:15'::time
),

-- Confirmed upcoming bookings
(
    'b4444444-4444-4444-4444-444444444444',
    'u2222222-2222-2222-2222-222222222222', -- Sarah Johnson
    '22222222-2222-2222-2222-222222222222', -- Mobile Hair Artist
    'a2222222-2222-2222-2222-222222222221', -- Home Hair Cut
    CURRENT_DATE + 2,
    '16:00'::time,
    '17:00'::time,
    'confirmed',
    35.00, 35.00, 0.00, 5.25, 29.75,
    'card', 'pending',
    'Please call before arriving, apartment 205',
    NULL,
    NOW() - INTERVAL '2 hours'
),
(
    'b5555555-5555-5555-5555-555555555555',
    'u6666666-6666-6666-6666-666666666666', -- Dana Al-Khatib
    '33333333-3333-3333-3333-333333333333', -- Nail Art Jordan
    'a3333333-3333-3333-3333-333333333333', -- Nail Art Design
    CURRENT_DATE + 5,
    '11:30'::time,
    '12:30'::time,
    'confirmed',
    35.00, 35.00, 0.00, 5.25, 29.75,
    'card', 'pending',
    'Looking forward to French tip design',
    NULL,
    NOW() - INTERVAL '1 day'
),

-- Pending bookings (awaiting confirmation)
(
    'b6666666-6666-6666-6666-666666666666',
    'u4444444-4444-4444-4444-444444444444', -- مريم حسين
    '88888888-8888-8888-8888-888888888888', -- Beauty Corner Zarqa
    'a8888888-8888-8888-8888-888888888881', -- Basic Hair Cut
    CURRENT_DATE + 1,
    '13:00'::time,
    '13:30'::time,
    'pending',
    15.00, 15.00, 0.00, 2.25, 12.75,
    'cash', 'pending',
    'First time visiting, looking forward to it',
    NULL,
    NOW() - INTERVAL '30 minutes'
),

-- Cancelled booking
(
    'b7777777-7777-7777-7777-777777777777',
    'u7777777-7777-7777-7777-777777777777', -- أسماء الطويل
    '66666666-6666-6666-6666-666666666666', -- Serenity Spa
    'a6666666-6666-6666-6666-666666666661', -- Full Body Massage
    CURRENT_DATE - 1,
    '14:00'::time,
    '15:30'::time,
    'cancelled',
    65.00, 65.00, 0.00, 9.75, 55.25,
    'card', 'refunded',
    'Had to cancel due to emergency',
    NULL,
    (CURRENT_DATE - 3)::timestamp + '09:45'::time
),

-- No-show case
(
    'b8888888-8888-8888-8888-888888888888',
    'u8888888-8888-8888-8888-888888888888', -- Jessica Williams
    '44444444-4444-4444-4444-444444444444', -- Quick Nails Sweifieh
    'a4444444-4444-4444-4444-444444444441', -- Express Manicure
    CURRENT_DATE - 2,
    '19:00'::time,
    '19:20'::time,
    'no_show',
    12.00, 12.00, 0.00, 1.80, 10.20,
    'card', 'completed',
    'Express service needed',
    NULL,
    (CURRENT_DATE - 4)::timestamp + '18:30'::time
),

-- High-value booking (Premium customer)
(
    'b9999999-9999-9999-9999-999999999999',
    'u5555555-5555-5555-5555-555555555555', -- فاطمة النابلسي (Premium customer)
    '11111111-1111-1111-1111-111111111111', -- Amman Hair Studio
    'a1111111-1111-1111-1111-111111111114', -- Bridal Hair Package
    CURRENT_DATE + 10,
    '09:00'::time,
    '13:00'::time,
    'confirmed',
    150.00, 150.00, 0.00, 22.50, 127.50,
    'card', 'pending',
    'Wedding on Friday, need trial session first',
    NULL,
    NOW() - INTERVAL '3 days'
),

-- Mobile service booking with location
(
    'ba111111-1111-1111-1111-111111111111',
    'u1111111-1111-1111-1111-111111111111', -- نور أحمد
    '77777777-7777-7777-7777-777777777777', -- Glamour Makeup Studio (Mobile)
    'a7777777-7777-7777-7777-777777777772', -- Evening Makeup
    CURRENT_DATE + 7,
    '18:00'::time,
    '19:15'::time,
    'confirmed',
    75.00, 75.00, 0.00, 11.25, 63.75,
    'cash', 'pending',
    'Birthday party at home',
    NULL,
    NOW() - INTERVAL '12 hours'
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    payment_status = EXCLUDED.payment_status;

-- ============================================================================
-- 8. REVIEWS - Realistic customer feedback
-- ============================================================================

INSERT INTO reviews (
    id, booking_id, user_id, provider_id, rating, comment, created_at
) VALUES 
(
    'r1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'u1111111-1111-1111-1111-111111111111', -- نور أحمد
    '11111111-1111-1111-1111-111111111111', -- Amman Hair Studio
    5,
    'Amazing service! Layla is so skilled and the salon atmosphere is very relaxing. Will definitely return.',
    (CURRENT_DATE - 2)::timestamp + '20:30'::time
),
(
    'r2222222-2222-2222-2222-222222222222',
    'b2222222-2222-2222-2222-222222222222',
    'u3333333-3333-3333-3333-333333333333', -- ليلى الزهراء
    '55555555-5555-5555-5555-555555555555', -- Advanced Aesthetics Clinic
    5,
    'Dr. Ahmed is exceptional! Very professional clinic with latest equipment. Results exceeded expectations.',
    (CURRENT_DATE - 6)::timestamp + '15:45'::time
),
(
    'r3333333-3333-3333-3333-333333333333',
    'b3333333-3333-3333-3333-333333333333',
    'u5555555-5555-5555-5555-555555555555', -- فاطمة النابلسي
    '77777777-7777-7777-7777-777777777777', -- Glamour Makeup Studio
    5,
    'Lina made my daughter look absolutely stunning on her wedding day. The makeup lasted all night perfectly!',
    (CURRENT_DATE - 13)::timestamp + '22:15'::time
),
(
    'r8888888-8888-8888-8888-888888888888',
    'b8888888-8888-8888-8888-888888888888',
    'u8888888-8888-8888-8888-888888888888', -- Jessica Williams
    '44444444-4444-4444-4444-444444444444', -- Quick Nails Sweifieh
    2,
    'Unfortunately I couldn''t make it to my appointment due to traffic. Service looked good from what I saw.',
    (CURRENT_DATE - 1)::timestamp + '12:30'::time
)
ON CONFLICT (id) DO UPDATE SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment;

-- ============================================================================
-- 9. LOYALTY TRANSACTIONS - Points earning history
-- ============================================================================

INSERT INTO loyalty_transactions (
    id, user_id, booking_id, transaction_type, points_change, 
    points_balance_after, description_en, description_ar, expires_at, created_at
) VALUES 
-- نور أحمد - Points from completed booking
(
    'l1111111-1111-1111-1111-111111111111',
    'u1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'earned',
    25,
    1450,
    'Points earned from hair styling service',
    'نقاط مكتسبة من خدمة تصفيف الشعر',
    NOW() + INTERVAL '2 years',
    (CURRENT_DATE - 3)::timestamp + '14:45'::time
),

-- ليلى الزهراء - Points from botox treatment
(
    'l2222222-2222-2222-2222-222222222222',
    'u3333333-3333-3333-3333-333333333333',
    'b2222222-2222-2222-2222-222222222222',
    'earned',
    180,
    3200,
    'Points earned from beauty clinic treatment',
    'نقاط مكتسبة من علاج عيادة التجميل',
    NOW() + INTERVAL '2 years',
    (CURRENT_DATE - 7)::timestamp + '10:30'::time
),

-- فاطمة النابلسي - Points from bridal makeup
(
    'l3333333-3333-3333-3333-333333333333',
    'u5555555-5555-5555-5555-555555555555',
    'b3333333-3333-3333-3333-333333333333',
    'earned',
    120,
    6800,
    'Points earned from bridal makeup service',
    'نقاط مكتسبة من خدمة مكياج العروس',
    NOW() + INTERVAL '2 years',
    (CURRENT_DATE - 14)::timestamp + '17:00'::time
),

-- Example of points redemption
(
    'l4444444-4444-4444-4444-444444444444',
    'u5555555-5555-5555-5555-555555555555',
    NULL,
    'redeemed',
    -500,
    6300,
    'Points redeemed for service discount',
    'نقاط مستخدمة للحصول على خصم',
    NULL,
    NOW() - INTERVAL '1 month'
),

-- Bonus points for tier upgrade
(
    'l5555555-5555-5555-5555-555555555555',
    'u3333333-3333-3333-3333-333333333333',
    NULL,
    'bonus',
    200,
    3400,
    'Bonus points for reaching Gold tier',
    'نقاط مكافأة للوصول للمستوى الذهبي',
    NOW() + INTERVAL '2 years',
    NOW() - INTERVAL '3 months'
)
ON CONFLICT (id) DO UPDATE SET
    points_change = EXCLUDED.points_change,
    points_balance_after = EXCLUDED.points_balance_after;

-- ============================================================================
-- 10. PROMOTIONS - Active and upcoming promotions
-- ============================================================================

INSERT INTO promotions (
    id, provider_id, code, title_en, title_ar, description_en, description_ar,
    promotion_type, discount_value, max_discount_amount, min_booking_amount,
    valid_from, valid_until, usage_limit, used_count, active
) VALUES 
(
    'p1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111', -- Amman Hair Studio
    'NEWYEAR25',
    'New Year Special - 25% Off',
    'عرض رأس السنة - خصم 25%',
    '25% discount on all hair services for new year celebration',
    'خصم 25% على جميع خدمات الشعر بمناسبة رأس السنة',
    'percentage',
    25.00,
    50.00,
    30.00,
    NOW() - INTERVAL '1 week',
    NOW() + INTERVAL '3 weeks',
    100,
    23,
    TRUE
),
(
    'p2222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333', -- Nail Art Jordan
    'FIRST20',
    'First Time Customer - 20 JOD Off',
    'عميل جديد - خصم 20 دينار',
    '20 JOD discount for first-time customers on services over 40 JOD',
    'خصم 20 دينار للعملاء الجدد على الخدمات فوق 40 دينار',
    'fixed_amount',
    20.00,
    20.00,
    40.00,
    NOW() - INTERVAL '2 months',
    NOW() + INTERVAL '1 month',
    NULL,
    8,
    TRUE
),
(
    'p3333333-3333-3333-3333-333333333333',
    NULL, -- Platform-wide promotion
    'LOYALTY50',
    'Loyalty Rewards - 50% Off',
    'مكافآت الولاء - خصم 50%',
    'Exclusive 50% discount for Platinum tier members',
    'خصم حصري 50% لأعضاء المستوى البلاتيني',
    'percentage',
    50.00,
    100.00,
    100.00,
    NOW() - INTERVAL '1 month',
    NOW() + INTERVAL '2 months',
    50,
    12,
    TRUE
),
(
    'p4444444-4444-4444-4444-444444444444',
    '77777777-7777-7777-7777-777777777777', -- Glamour Makeup Studio
    'BRIDAL2024',
    'Bridal Package Special',
    'عرض باقة العروس الخاص',
    'Special pricing for complete bridal packages including trial',
    'أسعار خاصة لباقات العروس الكاملة شاملة الجلسة التجريبية',
    'fixed_amount',
    30.00,
    30.00,
    100.00,
    NOW() - INTERVAL '1 week',
    NOW() + INTERVAL '6 weeks',
    25,
    3,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    used_count = EXCLUDED.used_count,
    active = EXCLUDED.active;

-- ============================================================================
-- 11. PROMOTION USAGES - Track promotion redemptions
-- ============================================================================

INSERT INTO promotion_usages (
    id, promotion_id, user_id, booking_id, discount_applied, used_at
) VALUES 
(
    'pu111111-1111-1111-1111-111111111111',
    'p1111111-1111-1111-1111-111111111111', -- NEWYEAR25
    'u6666666-6666-6666-6666-666666666666', -- Dana Al-Khatib
    'b1111111-1111-1111-1111-111111111111', -- Previous booking (example)
    6.25, -- 25% of 25 JOD
    (CURRENT_DATE - 3)::timestamp + '14:45'::time
)
ON CONFLICT (promotion_id, booking_id) DO NOTHING;

-- ============================================================================
-- 12. NOTIFICATIONS - Sample notifications
-- ============================================================================

INSERT INTO notifications (
    id, user_id, provider_id, booking_id, type, title_en, title_ar,
    message_en, message_ar, data, sent_at, created_at
) VALUES 
(
    'n1111111-1111-1111-1111-111111111111',
    'u2222222-2222-2222-2222-222222222222', -- Sarah Johnson
    NULL,
    'b4444444-4444-4444-4444-444444444444',
    'booking_confirmed',
    'Booking Confirmed',
    'تم تأكيد الحجز',
    'Your mobile hair service appointment has been confirmed for tomorrow at 4:00 PM',
    'تم تأكيد موعد خدمة الشعر المتنقلة غداً في الساعة 4:00 مساءً',
    '{"booking_date": "2025-01-09", "service": "Home Hair Cut"}'::jsonb,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
),
(
    'n2222222-2222-2222-2222-222222222222',
    'u6666666-6666-6666-6666-666666666666', -- Dana Al-Khatib
    NULL,
    NULL,
    'review_request',
    'How was your service?',
    'كيف كانت خدمتك؟',
    'We would love to hear about your recent nail art experience',
    'نحب أن نسمع عن تجربتك الأخيرة مع فن الأظافر',
    '{"provider": "Nail Art Jordan"}'::jsonb,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET
    sent_at = EXCLUDED.sent_at;

COMMIT;

RAISE NOTICE 'BeautyCort test data seeding completed successfully! Part 2: Bookings, Reviews, Loyalty, and Promotions created.';
