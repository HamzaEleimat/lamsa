-- ====================================================================
-- Seed Data for Development/Testing
-- Date: 2025-07-21
-- Description: Sample data for testing the Lamsa platform
-- ====================================================================

-- Note: Only run this in development environments
-- DO NOT run in production!

-- ====================================================================
-- SAMPLE PROVIDERS
-- ====================================================================

-- Sample providers in different areas of Amman
INSERT INTO providers (
  id,
  email,
  phone,
  password_hash,
  business_name_ar,
  business_name_en,
  owner_name,
  description_ar,
  description_en,
  latitude,
  longitude,
  address,
  commercial_registration_no,
  status,
  rating,
  total_reviews,
  accepts_cash,
  accepts_card,
  features
) VALUES 
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'rose.beauty@example.com',
  '0791234567',
  '$2b$10$YourHashedPasswordHere', -- Password: Test123!
  'صالون الورد',
  'Rose Beauty Salon',
  'فاطمة أحمد',
  'صالون نسائي متكامل يقدم جميع خدمات التجميل والعناية بالشعر والبشرة',
  'Full-service women''s salon offering all beauty, hair, and skincare services',
  31.9539,
  35.9106,
  '{"street_ar": "شارع المدينة المنورة", "street_en": "Madina Street", "area_ar": "الصويفية", "area_en": "Sweifieh", "city_ar": "عمان", "city_en": "Amman", "building_no": "25"}',
  'CR123456',
  'active',
  4.5,
  28,
  true,
  true,
  '{"wifi", "parking", "wheelchair_accessible"}'
),
(
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  'glamour.studio@example.com',
  '0792345678',
  '$2b$10$YourHashedPasswordHere', -- Password: Test123!
  'استوديو جلامور',
  'Glamour Studio',
  'رانيا خليل',
  'استوديو متخصص في المكياج الاحترافي وتسريحات الشعر للمناسبات',
  'Specialized studio for professional makeup and hair styling for events',
  31.9769,
  35.8456,
  '{"street_ar": "شارع الجاردنز", "street_en": "Gardens Street", "area_ar": "الجاردنز", "area_en": "Gardens", "city_ar": "عمان", "city_en": "Amman", "building_no": "15"}',
  'CR234567',
  'active',
  4.8,
  45,
  true,
  true,
  '{"wifi", "parking", "vip_room"}'
),
(
  'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
  'beauty.corner@example.com',
  '0793456789',
  '$2b$10$YourHashedPasswordHere', -- Password: Test123!
  'زاوية الجمال',
  'Beauty Corner',
  'سارة محمد',
  'صالون متخصص في العناية بالبشرة والأظافر',
  'Specialized salon for skincare and nail services',
  31.9965,
  35.8717,
  '{"street_ar": "شارع عبدالله غوشة", "street_en": "Abdullah Ghosheh Street", "area_ar": "الشميساني", "area_en": "Shmeisani", "city_ar": "عمان", "city_en": "Amman", "building_no": "42"}',
  'CR345678',
  'active',
  4.3,
  15,
  true,
  false,
  '{"wifi", "refreshments"}'
);

-- ====================================================================
-- SAMPLE PROVIDER AVAILABILITY
-- ====================================================================

-- Set working hours for all providers (Sunday to Thursday 9 AM - 9 PM, Friday-Saturday 10 AM - 10 PM)
INSERT INTO provider_availability (provider_id, day_of_week, opens_at, closes_at, is_available)
SELECT 
  id as provider_id,
  day_num as day_of_week,
  CASE 
    WHEN day_num IN (5, 6) THEN '10:00:00'::TIME
    ELSE '09:00:00'::TIME
  END as opens_at,
  CASE 
    WHEN day_num IN (5, 6) THEN '22:00:00'::TIME
    ELSE '21:00:00'::TIME
  END as closes_at,
  true as is_available
FROM 
  providers,
  generate_series(0, 6) as day_num;

-- ====================================================================
-- SAMPLE SERVICES
-- ====================================================================

-- Services for Rose Beauty Salon
INSERT INTO services (provider_id, category_id, name_ar, name_en, description_ar, description_en, price, duration_minutes, active)
SELECT 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  sc.id,
  CASE sc.name_en
    WHEN 'Hair Cut' THEN 'قص شعر نسائي'
    WHEN 'Hair Color' THEN 'صبغة شعر كاملة'
    WHEN 'Facial' THEN 'تنظيف بشرة عميق'
    WHEN 'Makeup' THEN 'مكياج سهرة'
    WHEN 'Nails' THEN 'مانيكير وباديكير'
  END,
  CASE sc.name_en
    WHEN 'Hair Cut' THEN 'Women''s Haircut'
    WHEN 'Hair Color' THEN 'Full Hair Color'
    WHEN 'Facial' THEN 'Deep Cleansing Facial'
    WHEN 'Makeup' THEN 'Evening Makeup'
    WHEN 'Nails' THEN 'Manicure & Pedicure'
  END,
  CASE sc.name_en
    WHEN 'Hair Cut' THEN 'قص شعر احترافي مع غسيل وتجفيف'
    WHEN 'Hair Color' THEN 'صبغة شعر كاملة مع علاج'
    WHEN 'Facial' THEN 'تنظيف بشرة عميق مع ماسك'
    WHEN 'Makeup' THEN 'مكياج احترافي للمناسبات'
    WHEN 'Nails' THEN 'عناية كاملة بالأظافر'
  END,
  CASE sc.name_en
    WHEN 'Hair Cut' THEN 'Professional haircut with wash and blow-dry'
    WHEN 'Hair Color' THEN 'Full hair color with treatment'
    WHEN 'Facial' THEN 'Deep cleansing facial with mask'
    WHEN 'Makeup' THEN 'Professional makeup for events'
    WHEN 'Nails' THEN 'Complete nail care service'
  END,
  CASE sc.name_en
    WHEN 'Hair Cut' THEN 25.00
    WHEN 'Hair Color' THEN 45.00
    WHEN 'Facial' THEN 35.00
    WHEN 'Makeup' THEN 40.00
    WHEN 'Nails' THEN 30.00
  END,
  CASE sc.name_en
    WHEN 'Hair Cut' THEN 45
    WHEN 'Hair Color' THEN 120
    WHEN 'Facial' THEN 60
    WHEN 'Makeup' THEN 60
    WHEN 'Nails' THEN 90
  END,
  true
FROM service_categories sc
WHERE sc.name_en IN ('Hair Cut', 'Hair Color', 'Facial', 'Makeup', 'Nails');

-- Services for Glamour Studio
INSERT INTO services (provider_id, category_id, name_ar, name_en, description_ar, description_en, price, duration_minutes, active)
SELECT 
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  sc.id,
  CASE sc.name_en
    WHEN 'Makeup' THEN 'مكياج عروس'
    WHEN 'Hair Cut' THEN 'تسريحة شعر للمناسبات'
  END,
  CASE sc.name_en
    WHEN 'Makeup' THEN 'Bridal Makeup'
    WHEN 'Hair Cut' THEN 'Event Hair Styling'
  END,
  CASE sc.name_en
    WHEN 'Makeup' THEN 'مكياج عروس كامل مع التجربة'
    WHEN 'Hair Cut' THEN 'تسريحة شعر احترافية للمناسبات'
  END,
  CASE sc.name_en
    WHEN 'Makeup' THEN 'Complete bridal makeup with trial'
    WHEN 'Hair Cut' THEN 'Professional hair styling for events'
  END,
  CASE sc.name_en
    WHEN 'Makeup' THEN 80.00
    WHEN 'Hair Cut' THEN 50.00
  END,
  CASE sc.name_en
    WHEN 'Makeup' THEN 90
    WHEN 'Hair Cut' THEN 60
  END,
  true
FROM service_categories sc
WHERE sc.name_en IN ('Makeup', 'Hair Cut');

-- ====================================================================
-- SAMPLE USERS
-- ====================================================================

INSERT INTO users (id, phone, name, email, language)
VALUES 
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', '0785551234', 'نور الدين', 'nour@example.com', 'ar'),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', '0795552345', 'هدى أحمد', 'huda@example.com', 'ar'),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', '0775553456', 'ليلى محمد', 'layla@example.com', 'ar')
ON CONFLICT (phone) DO NOTHING;

-- ====================================================================
-- SAMPLE BOOKINGS (Past bookings for reviews)
-- ====================================================================

-- Create some completed bookings for review data
INSERT INTO bookings (
  user_id,
  provider_id,
  service_id,
  booking_date,
  start_time,
  end_time,
  service_amount,
  total_amount,
  status,
  payment_status,
  created_at,
  confirmed_at,
  completed_at
)
SELECT 
  u.id,
  s.provider_id,
  s.id,
  CURRENT_DATE - INTERVAL '7 days',
  '14:00:00'::TIME,
  '15:00:00'::TIME,
  s.price,
  s.price,
  'completed',
  'completed',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days' + INTERVAL '30 minutes',
  NOW() - INTERVAL '7 days' + INTERVAL '1 hour'
FROM 
  users u,
  services s
WHERE 
  u.phone = '0785551234'
  AND s.name_en = 'Women''s Haircut'
LIMIT 1;

-- ====================================================================
-- SAMPLE REVIEWS
-- ====================================================================

INSERT INTO reviews (
  booking_id,
  user_id,
  provider_id,
  rating,
  comment,
  service_rating,
  cleanliness_rating,
  value_rating
)
SELECT 
  b.id,
  b.user_id,
  b.provider_id,
  5,
  'خدمة ممتازة والموظفات محترفات جداً. أنصح بشدة!',
  5,
  5,
  4
FROM bookings b
WHERE b.status = 'completed'
LIMIT 1;

-- ====================================================================
-- NOTES
-- ====================================================================

-- Remember to:
-- 1. Update password hashes with actual bcrypt hashes
-- 2. Use real coordinates for your target areas
-- 3. Add more diverse test data as needed
-- 4. Never run this in production!