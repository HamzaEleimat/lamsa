-- ====================================================================
-- Employee Management Sample Data
-- Date: 2025-07-27
-- Description: Sample employee data for testing the employee selection feature
-- Note: This should only be run in development/testing environments
-- ====================================================================

-- Only insert sample data if we're in a development environment
-- You can control this by setting a custom config parameter
DO $$
BEGIN
  -- Check if we should insert sample data (development only)
  IF current_setting('app.environment', true) = 'development' OR 
     current_setting('app.insert_sample_data', true) = 'true' THEN
    
    -- Get some provider IDs to assign employees to
    -- We'll use the first 2 providers for testing
    WITH sample_providers AS (
      SELECT id, business_name_en, ROW_NUMBER() OVER (ORDER BY created_at) as rn
      FROM providers
      WHERE status = 'active'
      LIMIT 2
    )
    -- Insert sample employees for the first provider (salon)
    INSERT INTO employees (provider_id, name_ar, name_en, title_ar, title_en, years_experience, specialties, bio_ar, bio_en, avatar_url, joined_at)
    SELECT 
      id as provider_id,
      name_ar,
      name_en,
      title_ar,
      title_en,
      years_experience,
      specialties,
      bio_ar,
      bio_en,
      avatar_url,
      joined_at
    FROM sample_providers sp
    CROSS JOIN (VALUES
      ('سارة أحمد', 'Sara Ahmed', 'كبيرة مصففي الشعر', 'Senior Hairstylist', 8, 
       ARRAY['hair coloring', 'keratin treatment', 'bridal styling'], 
       'خبيرة في تصفيف الشعر مع أكثر من 8 سنوات من الخبرة في أحدث صيحات الشعر',
       'Hair styling expert with over 8 years of experience in the latest hair trends',
       'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara',
       '2020-03-15'::DATE),
      
      ('نور الدين', 'Noor Al-Din', 'أخصائية تجميل', 'Beauty Specialist', 5,
       ARRAY['facial treatments', 'eyebrow threading', 'makeup'],
       'متخصصة في العناية بالبشرة والمكياج الاحترافي',
       'Specialist in skincare and professional makeup application',
       'https://api.dicebear.com/7.x/avataaars/svg?seed=Noor',
       '2021-06-01'::DATE),
       
      ('ليلى حسن', 'Layla Hassan', 'أخصائية أظافر', 'Nail Technician', 3,
       ARRAY['nail art', 'gel nails', 'manicure', 'pedicure'],
       'فنانة أظافر موهوبة متخصصة في أحدث تصاميم الأظافر',
       'Talented nail artist specializing in the latest nail designs',
       'https://api.dicebear.com/7.x/avataaars/svg?seed=Layla',
       '2022-01-10'::DATE),
       
      ('فاطمة علي', 'Fatima Ali', 'خبيرة مكياج', 'Makeup Artist', 10,
       ARRAY['bridal makeup', 'special events', 'contouring', 'airbrush makeup'],
       'خبيرة مكياج معتمدة مع خبرة في مكياج العرائس والمناسبات الخاصة',
       'Certified makeup artist with expertise in bridal and special event makeup',
       'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima',
       '2019-11-20'::DATE)
    ) AS e(name_ar, name_en, title_ar, title_en, years_experience, specialties, bio_ar, bio_en, avatar_url, joined_at)
    WHERE sp.rn = 1;

    -- Insert sample employees for the second provider (if exists)
    INSERT INTO employees (provider_id, name_ar, name_en, title_ar, title_en, years_experience, specialties, bio_ar, bio_en, avatar_url, joined_at)
    SELECT 
      id as provider_id,
      name_ar,
      name_en,
      title_ar,
      title_en,
      years_experience,
      specialties,
      bio_ar,
      bio_en,
      avatar_url,
      joined_at
    FROM sample_providers sp
    CROSS JOIN (VALUES
      ('ريم محمد', 'Reem Mohammed', 'مصففة شعر', 'Hairstylist', 4,
       ARRAY['hair cutting', 'hair coloring', 'styling'],
       'مصففة شعر محترفة متخصصة في القصات العصرية',
       'Professional hairstylist specializing in modern cuts',
       'https://api.dicebear.com/7.x/avataaars/svg?seed=Reem',
       '2021-08-05'::DATE),
       
      ('هدى سالم', 'Huda Salem', 'أخصائية عناية بالبشرة', 'Skincare Specialist', 6,
       ARRAY['facials', 'chemical peels', 'microdermabrasion'],
       'خبيرة في علاجات البشرة المتقدمة',
       'Expert in advanced skincare treatments',
       'https://api.dicebear.com/7.x/avataaars/svg?seed=Huda',
       '2020-05-12'::DATE)
    ) AS e(name_ar, name_en, title_ar, title_en, years_experience, specialties, bio_ar, bio_en, avatar_url, joined_at)
    WHERE sp.rn = 2;

    -- Link employees to services based on their specialties
    -- Hair services
    INSERT INTO employee_services (employee_id, service_id, is_primary)
    SELECT DISTINCT
      e.id as employee_id,
      s.id as service_id,
      CASE 
        WHEN e.title_en LIKE '%Hairstylist%' THEN true
        ELSE false
      END as is_primary
    FROM employees e
    CROSS JOIN services s
    WHERE s.category_id IN (SELECT id FROM service_categories WHERE name_en = 'Hair Cut' OR name_en = 'Hair Color')
    AND (
      e.title_en LIKE '%Hairstylist%' OR 
      'hair cutting' = ANY(e.specialties) OR 
      'hair coloring' = ANY(e.specialties) OR
      'hair styling' = ANY(e.specialties)
    )
    ON CONFLICT DO NOTHING;

    -- Nail services
    INSERT INTO employee_services (employee_id, service_id, is_primary)
    SELECT DISTINCT
      e.id as employee_id,
      s.id as service_id,
      true as is_primary
    FROM employees e
    CROSS JOIN services s
    WHERE s.category_id IN (SELECT id FROM service_categories WHERE name_en = 'Nails')
    AND (
      e.title_en LIKE '%Nail%' OR 
      'nail art' = ANY(e.specialties) OR 
      'manicure' = ANY(e.specialties)
    )
    ON CONFLICT DO NOTHING;

    -- Makeup services
    INSERT INTO employee_services (employee_id, service_id, is_primary)
    SELECT DISTINCT
      e.id as employee_id,
      s.id as service_id,
      true as is_primary
    FROM employees e
    CROSS JOIN services s
    WHERE s.category_id IN (SELECT id FROM service_categories WHERE name_en = 'Makeup')
    AND (
      e.title_en LIKE '%Makeup%' OR 
      'makeup' = ANY(e.specialties) OR
      'bridal makeup' = ANY(e.specialties)
    )
    ON CONFLICT DO NOTHING;

    -- Facial services
    INSERT INTO employee_services (employee_id, service_id, is_primary)
    SELECT DISTINCT
      e.id as employee_id,
      s.id as service_id,
      CASE 
        WHEN e.title_en LIKE '%Beauty%' OR e.title_en LIKE '%Skincare%' THEN true
        ELSE false
      END as is_primary
    FROM employees e
    CROSS JOIN services s
    WHERE s.category_id IN (SELECT id FROM service_categories WHERE name_en = 'Facial')
    AND (
      e.title_en LIKE '%Beauty%' OR 
      e.title_en LIKE '%Skincare%' OR
      'facial treatments' = ANY(e.specialties) OR
      'facials' = ANY(e.specialties)
    )
    ON CONFLICT DO NOTHING;

    -- Set up employee availability (Monday to Saturday, 9 AM to 7 PM with 1-hour lunch break)
    INSERT INTO employee_availability (employee_id, day_of_week, starts_at, ends_at, break_start, break_end, is_available)
    SELECT 
      e.id as employee_id,
      d.day as day_of_week,
      '09:00:00'::TIME as starts_at,
      '19:00:00'::TIME as ends_at,
      '13:00:00'::TIME as break_start,
      '14:00:00'::TIME as break_end,
      CASE 
        WHEN d.day = 5 THEN false -- Friday off
        ELSE true
      END as is_available
    FROM employees e
    CROSS JOIN generate_series(0, 6) as d(day)
    ON CONFLICT DO NOTHING;

    -- Add some special dates for testing (upcoming holidays/time off)
    INSERT INTO employee_special_dates (employee_id, date, is_available, reason)
    SELECT 
      e.id as employee_id,
      CURRENT_DATE + INTERVAL '14 days' as date,
      false as is_available,
      'Personal day off' as reason
    FROM employees e
    WHERE e.name_en = 'Sara Ahmed'
    ON CONFLICT DO NOTHING;

    -- Give employees some initial ratings for display
    UPDATE employees SET 
      rating = 4.5 + (RANDOM() * 0.5), -- Random rating between 4.5 and 5.0
      total_reviews = FLOOR(RANDOM() * 20 + 10)::INTEGER, -- Random reviews between 10 and 30
      total_bookings = FLOOR(RANDOM() * 50 + 20)::INTEGER -- Random bookings between 20 and 70
    WHERE rating = 0;

    RAISE NOTICE 'Sample employee data inserted successfully';
  ELSE
    RAISE NOTICE 'Skipping sample data insertion (not in development environment)';
  END IF;
END $$;