-- Create Analytics Views for Provider Dashboard
-- Run this script in your Supabase SQL editor

-- Create provider performance metrics view if it doesn't exist
CREATE OR REPLACE VIEW provider_performance_metrics AS
SELECT 
    p.id as provider_id,
    COALESCE(p.business_name, u.name, 'Provider') as provider_name,
    -- Booking counts
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'COMPLETED' THEN b.id END) as completed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'CANCELLED' THEN b.id END) as cancelled_bookings,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.id END) as bookings_last_30_days,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '7 days' THEN b.id END) as bookings_last_7_days,
    COUNT(DISTINCT CASE WHEN b.booking_date = CURRENT_DATE THEN b.id END) as bookings_today,
    -- Revenue
    COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.total_amount END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.total_amount END), 0) as revenue_last_30_days,
    COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' AND b.booking_date >= CURRENT_DATE - INTERVAL '7 days' THEN b.total_amount END), 0) as revenue_last_7_days,
    COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' AND b.booking_date = CURRENT_DATE THEN b.total_amount END), 0) as revenue_today,
    -- Averages
    COALESCE(AVG(CASE WHEN b.status = 'COMPLETED' THEN b.total_amount END), 0) as avg_booking_value,
    COALESCE(AVG(r.rating), 0) as avg_rating,
    COUNT(DISTINCT r.id) as total_reviews,
    -- Customers
    COUNT(DISTINCT b.user_id) as unique_customers,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.user_id END) as new_customers_last_30_days,
    -- Rates
    CASE 
        WHEN COUNT(b.id) > 0 THEN ROUND(COUNT(CASE WHEN b.status = 'CANCELLED' THEN 1 END)::NUMERIC / COUNT(b.id)::NUMERIC * 100, 2)
        ELSE 0 
    END as cancellation_rate,
    CASE 
        WHEN COUNT(b.id) > 0 THEN ROUND(COUNT(CASE WHEN b.status = 'COMPLETED' THEN 1 END)::NUMERIC / COUNT(b.id)::NUMERIC * 100, 2)
        ELSE 0 
    END as completion_rate
FROM providers p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN bookings b ON b.provider_id = p.id
LEFT JOIN reviews r ON r.booking_id = b.id
GROUP BY p.id, p.business_name, u.name;

-- Create daily revenue view
CREATE OR REPLACE VIEW provider_daily_revenue AS
SELECT 
    b.provider_id,
    b.booking_date as date,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'COMPLETED' THEN b.id END) as completed_bookings,
    COALESCE(SUM(b.total_amount), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.total_amount END), 0) as completed_revenue
FROM bookings b
WHERE b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY b.provider_id, b.booking_date
ORDER BY b.provider_id, b.booking_date DESC;

-- Create service analytics view
CREATE OR REPLACE VIEW provider_service_analytics AS
SELECT 
    s.id as service_id,
    s.provider_id,
    s.name_en,
    s.name_ar,
    s.price,
    s.duration_minutes,
    s.is_active as active,
    sc.name_en as category_name_en,
    sc.name_ar as category_name_ar,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'COMPLETED' THEN b.id END) as completed_bookings,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.id END) as bookings_last_30_days,
    COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.total_amount END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.total_amount END), 0) as revenue_last_30_days,
    COALESCE(AVG(r.rating), 0) as avg_rating,
    COUNT(DISTINCT r.id) as total_reviews,
    -- Popularity score (combination of bookings and rating)
    CASE 
        WHEN COUNT(DISTINCT b.id) > 0 THEN 
            (COUNT(DISTINCT b.id) * 0.7 + COALESCE(AVG(r.rating), 0) * 10 * 0.3)
        ELSE 0 
    END as popularity_score
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
LEFT JOIN bookings b ON b.service_id = s.id
LEFT JOIN reviews r ON r.booking_id = b.id
GROUP BY s.id, s.provider_id, s.name_en, s.name_ar, s.price, s.duration_minutes, s.is_active, sc.name_en, sc.name_ar;

-- Create hourly booking patterns view
CREATE OR REPLACE VIEW provider_hourly_patterns AS
SELECT 
    b.provider_id,
    EXTRACT(HOUR FROM b.start_time::TIME) as hour,
    COUNT(*) as booking_count
FROM bookings b
WHERE b.status IN ('COMPLETED', 'CONFIRMED')
AND b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY b.provider_id, EXTRACT(HOUR FROM b.start_time::TIME)
ORDER BY b.provider_id, hour;

-- Create popular time slots view
CREATE OR REPLACE VIEW provider_popular_time_slots AS
SELECT 
    b.provider_id,
    EXTRACT(DOW FROM b.booking_date) as day_of_week,
    EXTRACT(HOUR FROM b.start_time::TIME) as hour,
    COUNT(*) as booking_count,
    AVG(b.total_amount) as avg_revenue
FROM bookings b
WHERE b.status = 'COMPLETED'
AND b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY b.provider_id, EXTRACT(DOW FROM b.booking_date), EXTRACT(HOUR FROM b.start_time::TIME)
ORDER BY b.provider_id, booking_count DESC;

-- Create customer retention view
CREATE OR REPLACE VIEW provider_customer_retention AS
WITH customer_bookings AS (
    SELECT 
        provider_id,
        user_id,
        COUNT(*) as booking_count,
        MIN(booking_date) as first_booking,
        MAX(booking_date) as last_booking,
        SUM(CASE WHEN status = 'COMPLETED' THEN total_amount ELSE 0 END) as total_spent
    FROM bookings
    GROUP BY provider_id, user_id
)
SELECT 
    provider_id,
    COUNT(DISTINCT user_id) as total_customers,
    COUNT(DISTINCT CASE WHEN booking_count > 1 THEN user_id END) as returning_customers,
    COUNT(DISTINCT CASE WHEN booking_count = 1 THEN user_id END) as one_time_customers,
    CASE 
        WHEN COUNT(DISTINCT user_id) > 0 THEN 
            ROUND(COUNT(DISTINCT CASE WHEN booking_count > 1 THEN user_id END)::NUMERIC / COUNT(DISTINCT user_id)::NUMERIC * 100, 2)
        ELSE 0 
    END as retention_rate,
    AVG(booking_count) as avg_bookings_per_customer,
    AVG(total_spent) as avg_customer_value
FROM customer_bookings
GROUP BY provider_id;

-- Grant permissions
GRANT SELECT ON provider_performance_metrics TO authenticated;
GRANT SELECT ON provider_daily_revenue TO authenticated;
GRANT SELECT ON provider_service_analytics TO authenticated;
GRANT SELECT ON provider_hourly_patterns TO authenticated;
GRANT SELECT ON provider_popular_time_slots TO authenticated;
GRANT SELECT ON provider_customer_retention TO authenticated;