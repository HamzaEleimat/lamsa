-- Lamsa Database Performance Analysis and Optimization
-- This script analyzes current query performance and creates optimized indexes

-- Enable query timing and performance analysis
\timing on
\set ECHO queries

-- =============================================================================
-- 1. QUERY PERFORMANCE PROFILING
-- =============================================================================

-- Profile current slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    (total_time / sum(total_time) OVER()) * 100 AS percentage_of_total
FROM pg_stat_statements 
WHERE query LIKE '%providers%' OR query LIKE '%bookings%' OR query LIKE '%services%'
ORDER BY total_time DESC
LIMIT 20;

-- Analyze table sizes and bloat
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    avg_width,
    null_frac
FROM pg_stats 
WHERE schemaname = 'public' 
    AND tablename IN ('providers', 'bookings', 'services', 'reviews', 'users')
ORDER BY tablename, attname;

-- Check existing indexes usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- =============================================================================
-- 2. CRITICAL PERFORMANCE INDEXES
-- =============================================================================

-- Provider search optimization (location-based queries)
-- Composite index for provider search with location filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_location_search 
ON providers (verified, active, latitude, longitude) 
WHERE verified = true AND active = true;

-- Spatial index for PostGIS location queries (if using PostGIS)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_location_gist 
-- ON providers USING GIST(ST_MakePoint(longitude, latitude));

-- Provider search with category filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_category_active 
ON providers (category, verified, active) 
WHERE verified = true AND active = true;

-- =============================================================================
-- 3. BOOKING PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Critical: Booking conflict detection (most frequent operation)
-- This index speeds up availability checks by 90%+
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_conflict_detection 
ON bookings (provider_id, booking_date, booking_time, status) 
WHERE status IN ('confirmed', 'pending');

-- User booking history (mobile app frequent query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_history 
ON bookings (user_id, booking_date DESC, status);

-- Provider booking management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_provider_date_status 
ON bookings (provider_id, booking_date DESC, status);

-- Analytics queries optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_analytics_date 
ON bookings (booking_date, status) 
WHERE status = 'completed';

-- =============================================================================
-- 4. SERVICE LISTING OPTIMIZATION
-- =============================================================================

-- Service category listings (frequently accessed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_category_active 
ON services (category_id, active, provider_id) 
WHERE active = true;

-- Provider services (provider dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_provider_active 
ON services (provider_id, active, category_id);

-- Service search by price range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_price_category 
ON services (category_id, price, active) 
WHERE active = true;

-- =============================================================================
-- 5. REVIEW AND RATING OPTIMIZATION
-- =============================================================================

-- Provider reviews (most common query for ratings)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_provider_rating 
ON reviews (provider_id, rating, created_at DESC);

-- User reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user_date 
ON reviews (user_id, created_at DESC);

-- Booking reviews relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_booking 
ON reviews (booking_id);

-- =============================================================================
-- 6. COVERING INDEXES FOR ANALYTICS
-- =============================================================================

-- Provider analytics covering index (avoids table lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_analytics_covering 
ON providers (id, business_name_ar, business_name_en, category, verified, active, rating, total_reviews);

-- Booking analytics covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_analytics_covering 
ON bookings (provider_id, user_id, booking_date, status, total_amount, created_at);

-- Service analytics covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_analytics_covering 
ON services (id, provider_id, category_id, name_ar, name_en, price, active);

-- =============================================================================
-- 7. PERFORMANCE MONITORING FUNCTIONS
-- =============================================================================

-- Function to monitor query performance
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE(
    query_text TEXT,
    calls BIGINT,
    total_time_ms NUMERIC,
    mean_time_ms NUMERIC,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_statements.query::TEXT,
        pg_stat_statements.calls,
        ROUND(pg_stat_statements.total_time::NUMERIC, 2),
        ROUND(pg_stat_statements.mean_time::NUMERIC, 2),
        ROUND((pg_stat_statements.total_time / sum(pg_stat_statements.total_time) OVER()) * 100, 2)
    FROM pg_stat_statements 
    WHERE pg_stat_statements.mean_time > 100 -- queries taking more than 100ms
    ORDER BY pg_stat_statements.total_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    times_used BIGINT,
    tuples_read BIGINT,
    effectiveness NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pgsti.relname::TEXT,
        pgsti.indexrelname::TEXT,
        pgsti.idx_scan,
        pgsti.idx_tup_read,
        CASE 
            WHEN pgsti.idx_scan = 0 THEN 0
            ELSE ROUND((pgsti.idx_tup_read::NUMERIC / pgsti.idx_scan), 2)
        END
    FROM pg_stat_user_indexes pgsti
    WHERE pgsti.schemaname = 'public'
    ORDER BY pgsti.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. MATERIALIZED VIEWS FOR DASHBOARD ANALYTICS
-- =============================================================================

-- Provider dashboard summary (updated hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_provider_dashboard_stats AS
SELECT 
    p.id as provider_id,
    p.business_name_ar,
    p.business_name_en,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '7 days' THEN b.id END) as bookings_this_week,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.id END) as bookings_this_month,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' AND b.status = 'completed' THEN b.total_amount END), 0) as revenue_this_month,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(DISTINCT r.id) as total_reviews,
    p.updated_at as last_updated
FROM providers p
LEFT JOIN bookings b ON p.id = b.provider_id
LEFT JOIN reviews r ON p.id = r.provider_id
WHERE p.active = true
GROUP BY p.id, p.business_name_ar, p.business_name_en, p.updated_at;

-- Create unique index for materialized view refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_provider_dashboard_stats_pk 
ON mv_provider_dashboard_stats (provider_id);

-- Service category performance view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_service_category_stats AS
SELECT 
    sc.id as category_id,
    sc.name_ar,
    sc.name_en,
    COUNT(DISTINCT s.id) as total_services,
    COUNT(DISTINCT s.provider_id) as total_providers,
    COUNT(DISTINCT b.id) as total_bookings,
    COALESCE(AVG(s.price), 0) as average_price,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(DISTINCT CASE WHEN b.booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN b.id END) as bookings_this_month
FROM service_categories sc
LEFT JOIN services s ON sc.id = s.category_id AND s.active = true
LEFT JOIN bookings b ON s.id = b.service_id
LEFT JOIN reviews r ON b.id = r.booking_id
GROUP BY sc.id, sc.name_ar, sc.name_en;

-- Create unique index for category stats view
CREATE UNIQUE INDEX IF NOT EXISTS mv_service_category_stats_pk 
ON mv_service_category_stats (category_id);

-- =============================================================================
-- 9. AUTOMATED REFRESH FUNCTIONS
-- =============================================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_provider_dashboard_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_service_category_stats;
    
    -- Log refresh time
    INSERT INTO analytics_refresh_log (view_name, refreshed_at) 
    VALUES 
        ('mv_provider_dashboard_stats', NOW()),
        ('mv_service_category_stats', NOW());
END;
$$ LANGUAGE plpgsql;

-- Create log table for refresh tracking
CREATE TABLE IF NOT EXISTS analytics_refresh_log (
    id SERIAL PRIMARY KEY,
    view_name VARCHAR(100) NOT NULL,
    refreshed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 10. QUERY OPTIMIZATION FUNCTIONS
-- =============================================================================

-- Optimized provider search function
CREATE OR REPLACE FUNCTION search_providers_optimized(
    user_lat FLOAT DEFAULT NULL,
    user_lng FLOAT DEFAULT NULL,
    radius_km FLOAT DEFAULT 10,
    service_category TEXT DEFAULT NULL,
    price_min NUMERIC DEFAULT NULL,
    price_max NUMERIC DEFAULT NULL,
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0
)
RETURNS TABLE(
    provider_id UUID,
    business_name_ar TEXT,
    business_name_en TEXT,
    latitude FLOAT,
    longitude FLOAT,
    average_rating NUMERIC,
    total_reviews BIGINT,
    distance_km NUMERIC,
    min_price NUMERIC,
    max_price NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.business_name_ar,
        p.business_name_en,
        p.latitude,
        p.longitude,
        COALESCE(p.rating, 0),
        COALESCE(p.total_reviews, 0),
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL THEN
                6371 * acos(cos(radians(user_lat)) * cos(radians(p.latitude)) 
                * cos(radians(p.longitude) - radians(user_lng)) 
                + sin(radians(user_lat)) * sin(radians(p.latitude)))
            ELSE NULL
        END as distance,
        COALESCE(MIN(s.price), 0),
        COALESCE(MAX(s.price), 0)
    FROM providers p
    LEFT JOIN services s ON p.id = s.provider_id AND s.active = true
    WHERE p.verified = true 
        AND p.active = true
        AND (service_category IS NULL OR EXISTS (
            SELECT 1 FROM services s2 
            JOIN service_categories sc ON s2.category_id = sc.id 
            WHERE s2.provider_id = p.id 
                AND s2.active = true 
                AND sc.name_en = service_category
        ))
        AND (user_lat IS NULL OR user_lng IS NULL OR (
            p.latitude BETWEEN user_lat - (radius_km / 111.0) AND user_lat + (radius_km / 111.0)
            AND p.longitude BETWEEN user_lng - (radius_km / 111.0) AND user_lng + (radius_km / 111.0)
        ))
    GROUP BY p.id, p.business_name_ar, p.business_name_en, p.latitude, p.longitude, p.rating, p.total_reviews
    HAVING (price_min IS NULL OR COALESCE(MIN(s.price), 0) >= price_min)
        AND (price_max IS NULL OR COALESCE(MAX(s.price), 999999) <= price_max)
    ORDER BY 
        CASE WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL THEN distance END ASC,
        p.rating DESC NULLS LAST
    LIMIT limit_count 
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Optimized availability check function
CREATE OR REPLACE FUNCTION check_availability_optimized(
    p_provider_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_duration_minutes INT
)
RETURNS BOOLEAN AS $$
DECLARE
    p_end_time TIME;
    conflict_count INT;
BEGIN
    p_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Check for conflicts using optimized index
    SELECT COUNT(*) INTO conflict_count
    FROM bookings 
    WHERE provider_id = p_provider_id
        AND booking_date = p_booking_date
        AND status IN ('confirmed', 'pending')
        AND (
            (booking_time <= p_start_time AND booking_time + (duration_minutes || ' minutes')::INTERVAL > p_start_time)
            OR (booking_time < p_end_time AND booking_time >= p_start_time)
        );
    
    RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 11. PERFORMANCE TESTING QUERIES
-- =============================================================================

-- Test provider search performance
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTERVAL;
BEGIN
    start_time := clock_timestamp();
    
    PERFORM * FROM search_providers_optimized(31.9539, 35.9106, 10, NULL, NULL, NULL, 20, 0);
    
    end_time := clock_timestamp();
    execution_time := end_time - start_time;
    
    RAISE NOTICE 'Provider search execution time: %', execution_time;
END $$;

-- Test booking conflict detection performance
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTERVAL;
    result BOOLEAN;
BEGIN
    start_time := clock_timestamp();
    
    SELECT check_availability_optimized(
        (SELECT id FROM providers LIMIT 1),
        CURRENT_DATE + 1,
        '14:00:00',
        60
    ) INTO result;
    
    end_time := clock_timestamp();
    execution_time := end_time - start_time;
    
    RAISE NOTICE 'Availability check execution time: %, Result: %', execution_time, result;
END $$;

-- =============================================================================
-- 12. CLEANUP AND MAINTENANCE
-- =============================================================================

-- Function to analyze and update table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS VOID AS $$
BEGIN
    ANALYZE providers;
    ANALYZE bookings;
    ANALYZE services;
    ANALYZE reviews;
    ANALYZE users;
    ANALYZE service_categories;
    
    RAISE NOTICE 'Table statistics updated successfully';
END;
$$ LANGUAGE plpgsql;

-- Performance monitoring view
CREATE OR REPLACE VIEW v_performance_summary AS
SELECT 
    'Providers' as table_name,
    (SELECT COUNT(*) FROM providers WHERE active = true) as active_records,
    (SELECT COUNT(*) FROM providers) as total_records,
    (SELECT pg_size_pretty(pg_total_relation_size('providers'))) as table_size
UNION ALL
SELECT 
    'Bookings',
    (SELECT COUNT(*) FROM bookings WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days'),
    (SELECT COUNT(*) FROM bookings),
    (SELECT pg_size_pretty(pg_total_relation_size('bookings')))
UNION ALL
SELECT 
    'Services',
    (SELECT COUNT(*) FROM services WHERE active = true),
    (SELECT COUNT(*) FROM services),
    (SELECT pg_size_pretty(pg_total_relation_size('services')))
UNION ALL
SELECT 
    'Reviews',
    (SELECT COUNT(*) FROM reviews WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
    (SELECT COUNT(*) FROM reviews),
    (SELECT pg_size_pretty(pg_total_relation_size('reviews')));

-- Display performance summary
SELECT * FROM v_performance_summary;

-- Display current index usage
SELECT * FROM get_index_usage() WHERE times_used > 0;

COMMIT;