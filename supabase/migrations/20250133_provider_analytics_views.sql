-- Provider Analytics Views

-- View for provider performance metrics
CREATE OR REPLACE VIEW provider_performance_metrics AS
SELECT 
    p.id as provider_id,
    p.business_name_en as provider_name,
    -- Booking metrics
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) as cancelled_bookings,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.id END) as bookings_last_30_days,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '7 days' THEN b.id END) as bookings_last_7_days,
    COUNT(DISTINCT CASE WHEN b.booking_date = CURRENT_DATE THEN b.id END) as bookings_today,
    
    -- Revenue metrics
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.total_amount END), 0) as revenue_last_30_days,
    COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.booking_date >= CURRENT_DATE - INTERVAL '7 days' THEN b.total_amount END), 0) as revenue_last_7_days,
    COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.booking_date = CURRENT_DATE THEN b.total_amount END), 0) as revenue_today,
    
    -- Average metrics
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) as avg_booking_value,
    COALESCE(AVG(r.rating), 0) as avg_rating,
    COUNT(DISTINCT r.id) as total_reviews,
    
    -- Customer metrics
    COUNT(DISTINCT b.user_id) as unique_customers,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.user_id END) as new_customers_last_30_days,
    
    -- Cancellation rate
    CASE 
        WHEN COUNT(DISTINCT b.id) > 0 
        THEN ROUND((COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END)::NUMERIC / COUNT(DISTINCT b.id)::NUMERIC) * 100, 2)
        ELSE 0
    END as cancellation_rate,
    
    -- Completion rate
    CASE 
        WHEN COUNT(DISTINCT b.id) > 0 
        THEN ROUND((COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END)::NUMERIC / COUNT(DISTINCT b.id)::NUMERIC) * 100, 2)
        ELSE 0
    END as completion_rate
FROM 
    providers p
    LEFT JOIN bookings b ON p.id = b.provider_id
    LEFT JOIN reviews r ON b.id = r.booking_id
GROUP BY 
    p.id, p.business_name_en;

-- View for service performance analytics
CREATE OR REPLACE VIEW service_performance_analytics AS
SELECT 
    s.id as service_id,
    s.provider_id,
    s.name_en,
    s.name_ar,
    s.price,
    s.duration_minutes,
    s.active,
    c.name_en as category_name_en,
    c.name_ar as category_name_ar,
    
    -- Booking metrics
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.id END) as bookings_last_30_days,
    
    -- Revenue metrics
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.total_amount END), 0) as revenue_last_30_days,
    
    -- Average rating for this service
    COALESCE(AVG(r.rating), 0) as avg_rating,
    COUNT(DISTINCT r.id) as total_reviews,
    
    -- Popularity score (bookings in last 30 days weighted by completion rate)
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.id END) > 0
        THEN COUNT(DISTINCT CASE WHEN b.status = 'completed' AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.id END)::NUMERIC / 
             COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.id END)::NUMERIC * 100
        ELSE 0
    END as popularity_score
FROM 
    services s
    LEFT JOIN service_categories c ON s.category_id = c.id
    LEFT JOIN bookings b ON s.id = b.service_id
    LEFT JOIN reviews r ON b.id = r.booking_id
GROUP BY 
    s.id, s.provider_id, s.name_en, s.name_ar, s.price, s.duration_minutes, s.active, c.name_en, c.name_ar;

-- View for daily revenue trends
CREATE OR REPLACE VIEW provider_daily_revenue AS
SELECT 
    b.provider_id,
    DATE(b.booking_date) as date,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) as revenue,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.platform_fee END), 0) as platform_fees,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.provider_fee END), 0) as net_earnings
FROM 
    bookings b
WHERE 
    b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 
    b.provider_id, DATE(b.booking_date)
ORDER BY 
    b.provider_id, date DESC;

-- View for hourly booking patterns
CREATE OR REPLACE VIEW provider_hourly_patterns AS
SELECT 
    b.provider_id,
    EXTRACT(HOUR FROM b.start_time::time) as hour,
    EXTRACT(DOW FROM b.booking_date) as day_of_week,
    COUNT(*) as booking_count,
    AVG(b.total_amount) as avg_booking_value
FROM 
    bookings b
WHERE 
    b.status IN ('completed', 'confirmed')
    AND b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 
    b.provider_id, EXTRACT(HOUR FROM b.start_time::time), EXTRACT(DOW FROM b.booking_date);

-- View for customer retention metrics
CREATE OR REPLACE VIEW provider_customer_retention AS
WITH customer_bookings AS (
    SELECT 
        b.provider_id,
        b.user_id,
        COUNT(*) as booking_count,
        MIN(b.booking_date) as first_booking,
        MAX(b.booking_date) as last_booking,
        SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END) as total_spent
    FROM 
        bookings b
    GROUP BY 
        b.provider_id, b.user_id
)
SELECT 
    provider_id,
    COUNT(DISTINCT user_id) as total_customers,
    COUNT(DISTINCT CASE WHEN booking_count = 1 THEN user_id END) as one_time_customers,
    COUNT(DISTINCT CASE WHEN booking_count > 1 THEN user_id END) as repeat_customers,
    COUNT(DISTINCT CASE WHEN booking_count > 3 THEN user_id END) as loyal_customers,
    CASE 
        WHEN COUNT(DISTINCT user_id) > 0
        THEN ROUND((COUNT(DISTINCT CASE WHEN booking_count > 1 THEN user_id END)::NUMERIC / COUNT(DISTINCT user_id)::NUMERIC) * 100, 2)
        ELSE 0
    END as retention_rate,
    AVG(total_spent) as avg_customer_lifetime_value
FROM 
    customer_bookings
GROUP BY 
    provider_id;

-- View for popular time slots
CREATE OR REPLACE VIEW provider_popular_timeslots AS
SELECT 
    b.provider_id,
    b.start_time::time as time_slot,
    COUNT(*) as booking_count,
    ROUND(AVG(b.total_amount), 2) as avg_booking_value,
    STRING_AGG(DISTINCT s.name_en, ', ' ORDER BY s.name_en) as popular_services
FROM 
    bookings b
    JOIN services s ON b.service_id = s.id
WHERE 
    b.status IN ('completed', 'confirmed')
    AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 
    b.provider_id, b.start_time::time
HAVING 
    COUNT(*) >= 2
ORDER BY 
    b.provider_id, booking_count DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date ON bookings(provider_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings(status, booking_date);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);

-- Grant permissions
GRANT SELECT ON provider_performance_metrics TO authenticated;
GRANT SELECT ON service_performance_analytics TO authenticated;
GRANT SELECT ON provider_daily_revenue TO authenticated;
GRANT SELECT ON provider_hourly_patterns TO authenticated;
GRANT SELECT ON provider_customer_retention TO authenticated;
GRANT SELECT ON provider_popular_timeslots TO authenticated;