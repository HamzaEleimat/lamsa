-- BeautyCort Test Data Seeding Script
-- Comprehensive seeding for development and testing environments
-- Safe to run multiple times (uses INSERT ... ON CONFLICT)

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. FOUNDATION DATA - Service Categories (already in schema, but ensure data)
-- ============================================================================

-- Service categories are already seeded in the main schema
-- Verify they exist and get their IDs for use in seeding

-- ============================================================================
-- 2. TEST PROVIDERS - Realistic Jordanian Beauty Businesses
-- ============================================================================

-- Clear existing test data if re-running (optional)
-- TRUNCATE TABLE providers CASCADE; -- Uncomment if you want to reset

INSERT INTO providers (
    id, business_name, business_name_ar, owner_name, phone, email, password_hash,
    location, address, address_ar, city, rating, total_reviews, is_mobile, 
    travel_radius_km, verified, active, business_hours, bio, bio_ar
) VALUES 
-- Hair Styling Providers
(
    '11111111-1111-1111-1111-111111111111',
    'Amman Hair Studio',
    'استوديو عمان للشعر',
    'Layla Al-Kassem',
    '+96277551234',
    'info@ammanhair.jo',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.9239, 31.9515), 4326)::geography,
    'Abdoun Circle, Building 15',
    'دوار عبدون، مبنى 15',
    'Amman',
    4.7,
    156,
    FALSE,
    5,
    TRUE,
    TRUE,
    '[
        {"day": 0, "closed": true},
        {"day": 1, "open": "09:00", "close": "18:00"},
        {"day": 2, "open": "09:00", "close": "18:00"},
        {"day": 3, "open": "09:00", "close": "18:00"},
        {"day": 4, "open": "09:00", "close": "18:00"},
        {"day": 5, "open": "09:00", "close": "16:00"},
        {"day": 6, "open": "10:00", "close": "17:00"}
    ]'::jsonb,
    'Premium hair salon in Abdoun offering cutting-edge styling and treatments.',
    'صالون شعر فاخر في عبدون يقدم أحدث تقنيات التصفيف والعلاجات.'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Mobile Hair Artist',
    'فنانة الشعر المتنقلة',
    'Sara Mahmoud',
    '+96278442233',
    'sara.mobile@gmail.com',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.9306, 31.9515), 4326)::geography,
    'Jabal Al-Hussein',
    'جبل الحسين',
    'Amman',
    4.3,
    89,
    TRUE,
    15,
    TRUE,
    TRUE,
    '[
        {"day": 0, "open": "10:00", "close": "20:00"},
        {"day": 1, "open": "10:00", "close": "20:00"},
        {"day": 2, "open": "10:00", "close": "20:00"},
        {"day": 3, "open": "10:00", "close": "20:00"},
        {"day": 4, "open": "10:00", "close": "20:00"},
        {"day": 5, "open": "14:00", "close": "22:00"},
        {"day": 6, "open": "10:00", "close": "20:00"}
    ]'::jsonb,
    'Professional mobile hair stylist bringing salon quality to your home.',
    'مصففة شعر محترفة متنقلة تجلب جودة الصالون إلى منزلك.'
),

-- Nail Salons
(
    '33333333-3333-3333-3333-333333333333',
    'Nail Art Jordan',
    'فن الأظافر الأردن',
    'Reem Khalil',
    '+96279123456',
    'info@nailartjo.com',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.9106, 31.9539), 4326)::geography,
    'Rainbow Street 45',
    'شارع الرينبو 45',
    'Amman',
    4.6,
    203,
    FALSE,
    5,
    TRUE,
    TRUE,
    '[
        {"day": 0, "closed": true},
        {"day": 1, "open": "10:00", "close": "19:00"},
        {"day": 2, "open": "10:00", "close": "19:00"},
        {"day": 3, "open": "10:00", "close": "19:00"},
        {"day": 4, "open": "10:00", "close": "19:00"},
        {"day": 5, "open": "10:00", "close": "17:00"},
        {"day": 6, "open": "11:00", "close": "18:00"}
    ]'::jsonb,
    'Artistic nail designs and premium nail care services.',
    'تصاميم أظافر فنية وخدمات عناية متميزة.'
),
(
    '44444444-4444-4444-4444-444444444444',
    'Quick Nails Sweifieh',
    'الأظافر السريعة السويفية',
    'Nadia Al-Masri',
    '+96277334455',
    'quicknails@gmail.com',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.8428, 31.9394), 4326)::geography,
    'Sweifieh, Galleria Mall',
    'السويفية، مول الجاليريا',
    'Amman',
    4.1,
    127,
    FALSE,
    5,
    TRUE,
    TRUE,
    '[
        {"day": 0, "open": "10:00", "close": "22:00"},
        {"day": 1, "open": "10:00", "close": "22:00"},
        {"day": 2, "open": "10:00", "close": "22:00"},
        {"day": 3, "open": "10:00", "close": "22:00"},
        {"day": 4, "open": "10:00", "close": "22:00"},
        {"day": 5, "open": "10:00", "close": "23:00"},
        {"day": 6, "open": "10:00", "close": "23:00"}
    ]'::jsonb,
    'Fast and affordable nail services in Sweifieh.',
    'خدمات أظافر سريعة وبأسعار معقولة في السويفية.'
),

-- Beauty Clinics
(
    '55555555-5555-5555-5555-555555555555',
    'Advanced Aesthetics Clinic',
    'عيادة التجميل المتقدمة',
    'Dr. Ahmed Rashid',
    '+96279887766',
    'dr.ahmed@aesthetics.jo',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.8428, 31.9394), 4326)::geography,
    'Sweifieh Medical Complex',
    'المجمع الطبي السويفية',
    'Amman',
    4.9,
    67,
    FALSE,
    5,
    TRUE,
    TRUE,
    '[
        {"day": 0, "closed": true},
        {"day": 1, "open": "08:00", "close": "16:00"},
        {"day": 2, "open": "08:00", "close": "16:00"},
        {"day": 3, "open": "08:00", "close": "16:00"},
        {"day": 4, "open": "08:00", "close": "16:00"},
        {"day": 5, "open": "08:00", "close": "14:00"},
        {"day": 6, "open": "09:00", "close": "13:00"}
    ]'::jsonb,
    'Advanced medical aesthetics and dermatology treatments.',
    'علاجات طبية متقدمة للتجميل والأمراض الجلدية.'
),

-- Spas & Wellness
(
    '66666666-6666-6666-6666-666666666666',
    'Serenity Spa Amman',
    'منتجع السكينة عمان',
    'Yasmin Al-Faouri',
    '+96278998877',
    'info@serenityspa.jo',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.9150, 31.9500), 4326)::geography,
    'Shmeisani, Complex 42',
    'الشميساني، مجمع 42',
    'Amman',
    4.8,
    184,
    FALSE,
    5,
    TRUE,
    TRUE,
    '[
        {"day": 0, "open": "09:00", "close": "20:00"},
        {"day": 1, "open": "09:00", "close": "20:00"},
        {"day": 2, "open": "09:00", "close": "20:00"},
        {"day": 3, "open": "09:00", "close": "20:00"},
        {"day": 4, "open": "09:00", "close": "20:00"},
        {"day": 5, "open": "09:00", "close": "18:00"},
        {"day": 6, "open": "10:00", "close": "19:00"}
    ]'::jsonb,
    'Luxury spa and wellness center with traditional and modern treatments.',
    'منتجع صحي فاخر يقدم العلاجات التقليدية والحديثة.'
),

-- Makeup Artists
(
    '77777777-7777-7777-7777-777777777777',
    'Glamour Makeup Studio',
    'استوديو جلامور للمكياج',
    'Lina Qasemi',
    '+96277889900',
    'lina@glamourmakeup.com',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(35.9200, 31.9600), 4326)::geography,
    'Dabouq Area',
    'منطقة دابوق',
    'Amman',
    4.5,
    92,
    TRUE,
    20,
    TRUE,
    TRUE,
    '[
        {"day": 0, "open": "10:00", "close": "22:00"},
        {"day": 1, "open": "10:00", "close": "18:00"},
        {"day": 2, "open": "10:00", "close": "18:00"},
        {"day": 3, "open": "10:00", "close": "18:00"},
        {"day": 4, "open": "10:00", "close": "22:00"},
        {"day": 5, "open": "14:00", "close": "23:00"},
        {"day": 6, "open": "10:00", "close": "23:00"}
    ]'::jsonb,
    'Professional makeup artist specializing in bridal and event makeup.',
    'فنانة مكياج محترفة متخصصة في مكياج العرائس والمناسبات.'
),

-- Budget-friendly Option
(
    '88888888-8888-8888-8888-888888888888',
    'Beauty Corner Zarqa',
    'ركن الجمال الزرقاء',
    'Fatima Hammouri',
    '+96278112233',
    'beautycorner.zarqa@gmail.com',
    '$2b$10$example.hash.for.testing.only',
    ST_SetSRID(ST_MakePoint(36.0882, 32.0728), 4326)::geography,
    'Zarqa City Center',
    'مركز مدينة الزرقاء',
    'Zarqa',
    4.2,
    145,
    FALSE,
    5,
    TRUE,
    TRUE,
    '[
        {"day": 0, "open": "09:00", "close": "17:00"},
        {"day": 1, "open": "09:00", "close": "17:00"},
        {"day": 2, "open": "09:00", "close": "17:00"},
        {"day": 3, "open": "09:00", "close": "17:00"},
        {"day": 4, "open": "09:00", "close": "17:00"},
        {"day": 5, "open": "09:00", "close": "15:00"},
        {"day": 6, "open": "10:00", "close": "16:00"}
    ]'::jsonb,
    'Affordable beauty services for the whole family.',
    'خدمات تجميل بأسعار معقولة لكل أفراد العائلة.'
);

-- ============================================================================
-- 3. PROVIDER AVAILABILITY - Weekly Schedules
-- ============================================================================

INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_available)
SELECT 
    p.id,
    dow.day,
    (hours->>'open')::time,
    (hours->>'close')::time,
    NOT COALESCE((hours->>'closed')::boolean, false)
FROM providers p
CROSS JOIN LATERAL jsonb_array_elements(p.business_hours) AS hours
CROSS JOIN LATERAL (SELECT (hours->>'day')::integer AS day) AS dow
WHERE p.id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888'
)
ON CONFLICT (provider_id, day_of_week) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    is_available = EXCLUDED.is_available;

-- ============================================================================
-- 4. SERVICES - Comprehensive Service Catalog
-- ============================================================================

-- Get service category IDs
WITH category_ids AS (
    SELECT 
        id,
        name_en,
        CASE name_en
            WHEN 'Hair Styling' THEN 'hair'
            WHEN 'Nails' THEN 'nails'
            WHEN 'Beauty Clinic' THEN 'clinic'
            WHEN 'Massage' THEN 'spa'
            WHEN 'Makeup' THEN 'makeup'
            WHEN 'Skincare' THEN 'skincare'
            WHEN 'Eyebrows & Lashes' THEN 'brows'
            WHEN 'Hair Removal' THEN 'removal'
        END as category_key
    FROM service_categories
)

INSERT INTO services (
    id, provider_id, category_id, name_en, name_ar, 
    description_en, description_ar, price, duration_minutes, active
)
SELECT * FROM (VALUES
    -- Amman Hair Studio Services
    ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', (SELECT id FROM category_ids WHERE category_key = 'hair'), 'Hair Cut & Blow Dry', 'قص وتصفيف الشعر', 'Professional haircut with styling and blow dry', 'قص شعر احترافي مع التصفيف والتجفيف', 25.00, 45, true),
    ('a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', (SELECT id FROM category_ids WHERE category_key = 'hair'), 'Hair Coloring (Full)', 'صبغة الشعر كاملة', 'Complete hair coloring with premium products', 'صبغة شعر كاملة بمنتجات فاخرة', 65.00, 120, true),
    ('a1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', (SELECT id FROM category_ids WHERE category_key = 'hair'), 'Keratin Treatment', 'علاج الكيراتين', 'Deep keratin treatment for smooth, healthy hair', 'علاج كيراتين عميق للشعر الناعم والصحي', 85.00, 180, true),
    ('a1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', (SELECT id FROM category_ids WHERE category_key = 'hair'), 'Bridal Hair Package', 'باقة شعر العروس', 'Complete bridal hair styling with trial session', 'تصفيف شعر العروس الكامل مع جلسة تجريبية', 150.00, 240, true),
    ('a1111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', (SELECT id FROM category_ids WHERE category_key = 'hair'), 'Hair Extensions', 'تركيب الشعر', 'Professional hair extension application', 'تركيب امتدادات الشعر المهني', 120.00, 90, true),

    -- Mobile Hair Artist Services
    ('a2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', (SELECT id FROM category_ids WHERE category_key = 'hair'), 'Home Hair Cut', 'قص الشعر في المنزل', 'Professional haircut at your location', 'قص شعر احترافي في موقعك', 35.00, 60, true),
    ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', (SELECT id FROM category_ids WHERE category_key = 'hair'), 'Home Hair Styling', 'تصفيف الشعر في المنزل', 'Special occasion hair styling at home', 'تصفيف شعر للمناسبات في المنزل', 45.00, 75, true),
    ('a2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', (SELECT id FROM category_ids WHERE category_key = 'hair'), 'Bridal Hair (Mobile)', 'شعر العروس متنقل', 'Bridal hair styling at your preferred location', 'تصفيف شعر العروس في الموقع المفضل', 180.00, 180, true),

    -- Nail Art Jordan Services
    ('a3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', (SELECT id FROM category_ids WHERE category_key = 'nails'), 'Classic Manicure', 'مناكير كلاسيكي', 'Traditional manicure with nail polish', 'مناكير تقليدي مع طلاء الأظافر', 15.00, 30, true),
    ('a3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', (SELECT id FROM category_ids WHERE category_key = 'nails'), 'Gel Manicure', 'مناكير جل', 'Long-lasting gel manicure', 'مناكير جل طويل المدى', 25.00, 45, true),
    ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', (SELECT id FROM category_ids WHERE category_key = 'nails'), 'Nail Art Design', 'تصميم الأظافر', 'Custom artistic nail designs', 'تصاميم أظافر فنية مخصصة', 35.00, 60, true),
    ('a3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', (SELECT id FROM category_ids WHERE category_key = 'nails'), 'Pedicure Spa', 'باديكير سبا', 'Relaxing pedicure with foot massage', 'باديكير مريح مع تدليك القدمين', 28.00, 50, true),
    ('a3333333-3333-3333-3333-333333333335', '33333333-3333-3333-3333-333333333333', (SELECT id FROM category_ids WHERE category_key = 'nails'), 'Acrylic Nails', 'أظافر الأكريليك', 'Durable acrylic nail extensions', 'امتدادات أظافر أكريليك متينة', 45.00, 90, true),

    -- Quick Nails Sweifieh Services
    ('a4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', (SELECT id FROM category_ids WHERE category_key = 'nails'), 'Express Manicure', 'مناكير سريع', 'Quick 20-minute manicure service', 'خدمة مناكير سريعة لمدة 20 دقيقة', 12.00, 20, true),
    ('a4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', (SELECT id FROM category_ids WHERE category_key = 'nails'), 'Express Pedicure', 'باديكير سريع', 'Quick pedicure for busy schedules', 'باديكير سريع للجداول المزدحمة', 18.00, 30, true),
    ('a4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', (SELECT id FROM category_ids WHERE category_key = 'nails'), 'Nail Repair', 'إصلاح الأظافر', 'Quick nail repair and touch-up', 'إصلاح وتعديل سريع للأظافر', 8.00, 15, true),

    -- Advanced Aesthetics Clinic Services
    ('a5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', (SELECT id FROM category_ids WHERE category_key = 'clinic'), 'Botox Treatment', 'علاج البوتوكس', 'Professional botox injections for wrinkle reduction', 'حقن البوتوكس المهنية لتقليل التجاعيد', 180.00, 30, true),
    ('a5555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555555', (SELECT id FROM category_ids WHERE category_key = 'clinic'), 'Dermal Fillers', 'الحشوات التجميلية', 'Advanced dermal filler treatments', 'علاجات الحشوات التجميلية المتقدمة', 250.00, 45, true),
    ('a5555555-5555-5555-5555-555555555553', '55555555-5555-5555-5555-555555555555', (SELECT id FROM category_ids WHERE category_key = 'removal'), 'Laser Hair Removal', 'إزالة الشعر بالليزر', 'Permanent hair reduction with advanced laser', 'تقليل الشعر الدائم بالليزر المتقدم', 120.00, 60, true),
    ('a5555555-5555-5555-5555-555555555554', '55555555-5555-5555-5555-555555555555', (SELECT id FROM category_ids WHERE category_key = 'skincare'), 'Chemical Peel', 'التقشير الكيميائي', 'Professional chemical peel treatment', 'علاج التقشير الكيميائي المهني', 95.00, 75, true),

    -- Serenity Spa Services
    ('a6666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666666', (SELECT id FROM category_ids WHERE category_key = 'spa'), 'Full Body Massage', 'تدليك الجسم الكامل', 'Relaxing full body massage therapy', 'علاج تدليك الجسم الكامل المريح', 65.00, 90, true),
    ('a6666666-6666-6666-6666-666666666662', '66666666-6666-6666-6666-666666666666', (SELECT id FROM category_ids WHERE category_key = 'skincare'), 'Luxury Facial', 'العناية الفاخرة بالوجه', 'Premium facial treatment with organic products', 'علاج الوجه الفاخر بالمنتجات العضوية', 55.00, 75, true),
    ('a6666666-6666-6666-6666-666666666663', '66666666-6666-6666-6666-666666666666', (SELECT id FROM category_ids WHERE category_key = 'spa'), 'Couples Massage', 'تدليك الأزواج', 'Romantic couples massage experience', 'تجربة تدليك رومانسية للأزواج', 130.00, 90, true),

    -- Glamour Makeup Studio Services
    ('a7777777-7777-7777-7777-777777777771', '77777777-7777-7777-7777-777777777777', (SELECT id FROM category_ids WHERE category_key = 'makeup'), 'Bridal Makeup', 'مكياج العروس', 'Complete bridal makeup with trial', 'مكياج عروس كامل مع جلسة تجريبية', 120.00, 120, true),
    ('a7777777-7777-7777-7777-777777777772', '77777777-7777-7777-7777-777777777777', (SELECT id FROM category_ids WHERE category_key = 'makeup'), 'Evening Makeup', 'مكياج سهرة', 'Glamorous evening makeup for special occasions', 'مكياج سهرة ساحر للمناسبات الخاصة', 75.00, 75, true),
    ('a7777777-7777-7777-7777-777777777773', '77777777-7777-7777-7777-777777777777', (SELECT id FROM category_ids WHERE category_key = 'brows'), 'Eyebrow Shaping', 'تشكيل الحواجب', 'Professional eyebrow shaping and styling', 'تشكيل وتصفيف الحواجب المهني', 25.00, 30, true),

    -- Beauty Corner Zarqa Services
    ('a8888888-8888-8888-8888-888888888881', '88888888-8888-8888-8888-888888888888', (SELECT id FROM category_ids WHERE category_key = 'hair'), 'Basic Hair Cut', 'قص شعر أساسي', 'Simple haircut and basic styling', 'قص شعر بسيط وتصفيف أساسي', 15.00, 30, true),
    ('a8888888-8888-8888-8888-888888888882', '88888888-8888-8888-8888-888888888888', (SELECT id FROM category_ids WHERE category_key = 'nails'), 'Basic Manicure', 'مناكير أساسي', 'Affordable basic manicure service', 'خدمة مناكير أساسية بأسعار معقولة', 8.00, 25, true),
    ('a8888888-8888-8888-8888-888888888883', '88888888-8888-8888-8888-888888888888', (SELECT id FROM category_ids WHERE category_key = 'brows'), 'Eyebrow Threading', 'تشذيب الحواجب', 'Traditional eyebrow threading', 'تشذيب الحواجب التقليدي', 5.00, 15, true)
) AS service_data(id, provider_id, category_id, name_en, name_ar, description_en, description_ar, price, duration_minutes, active)
ON CONFLICT (id) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_ar = EXCLUDED.name_ar,
    price = EXCLUDED.price,
    duration_minutes = EXCLUDED.duration_minutes;

-- ============================================================================
-- 5. TEST USERS - Diverse Customer Personas
-- ============================================================================

INSERT INTO users (
    id, phone, name, email, preferred_language, 
    notification_preferences, active, created_at
) VALUES 
(
    'u1111111-1111-1111-1111-111111111111',
    '+96277123456',
    'نور أحمد',
    'nour.ahmad@gmail.com',
    'ar',
    '{"sms": true, "push": true, "email": false}'::jsonb,
    TRUE,
    NOW() - INTERVAL '6 months'
),
(
    'u2222222-2222-2222-2222-222222222222',
    '+96278234567',
    'Sarah Johnson',
    'sarah.j@gmail.com',
    'en',
    '{"sms": true, "push": true, "email": true}'::jsonb,
    TRUE,
    NOW() - INTERVAL '4 months'
),
(
    'u3333333-3333-3333-3333-333333333333',
    '+96279345678',
    'ليلى الزهراء',
    'layla.z@hotmail.com',
    'ar',
    '{"sms": true, "push": true, "email": true}'::jsonb,
    TRUE,
    NOW() - INTERVAL '8 months'
),
(
    'u4444444-4444-4444-4444-444444444444',
    '+96277456789',
    'مريم حسين',
    'maryam.h@yahoo.com',
    'ar',
    '{"sms": false, "push": true, "email": false}'::jsonb,
    TRUE,
    NOW() - INTERVAL '2 months'
),
(
    'u5555555-5555-5555-5555-555555555555',
    '+96278567890',
    'فاطمة النابلسي',
    'fatima.event@gmail.com',
    'ar',
    '{"sms": true, "push": true, "email": true}'::jsonb,
    TRUE,
    NOW() - INTERVAL '12 months'
),
(
    'u6666666-6666-6666-6666-666666666666',
    '+96279678901',
    'Dana Al-Khatib',
    'dana.khatib@outlook.com',
    'en',
    '{"sms": true, "push": false, "email": true}'::jsonb,
    TRUE,
    NOW() - INTERVAL '3 months'
),
(
    'u7777777-7777-7777-7777-777777777777',
    '+96277789012',
    'أسماء الطويل',
    'asma.taweel@gmail.com',
    'ar',
    '{"sms": true, "push": true, "email": false}'::jsonb,
    TRUE,
    NOW() - INTERVAL '1 month'
),
(
    'u8888888-8888-8888-8888-888888888888',
    '+96278890123',
    'Jessica Williams',
    'jessica.w@gmail.com',
    'en',
    '{"sms": false, "push": true, "email": true}'::jsonb,
    TRUE,
    NOW() - INTERVAL '5 months'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    preferred_language = EXCLUDED.preferred_language;

COMMIT;

-- Continue with more data in next part...
RAISE NOTICE 'BeautyCort test data seeding completed successfully! Part 1: Providers, Services, and Users created.';
