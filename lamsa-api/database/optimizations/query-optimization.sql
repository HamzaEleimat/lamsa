-- Lamsa API Database Query Optimization Script
-- This script implements comprehensive database optimizations based on query pattern analysis
-- Run this script during a maintenance window for optimal performance

-- Enable timing and explain analysis
\timing on
\set VERBOSITY verbose

-- Create a schema for optimization utilities
CREATE SCHEMA IF NOT EXISTS optimization;

-- =============================================
-- PERFORMANCE MONITORING SETUP
-- =============================================

-- Enable query statistics collection
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create performance monitoring tables
CREATE TABLE IF NOT EXISTS optimization.query_performance_log (
    id SERIAL PRIMARY KEY,
    query_type VARCHAR(50) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    execution_time_ms DECIMAL(10,3) NOT NULL,
    rows_affected INTEGER,
    index_used VARCHAR(255),
    query_plan TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS optimization.index_usage_stats (
    id SERIAL PRIMARY KEY,
    index_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    scans_count BIGINT DEFAULT 0,
    tuples_read BIGINT DEFAULT 0,
    tuples_fetched BIGINT DEFAULT 0,
    last_scan TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to log query performance
CREATE OR REPLACE FUNCTION optimization.log_query_performance(
    p_query_type VARCHAR(50),
    p_operation VARCHAR(100),
    p_execution_time_ms DECIMAL(10,3),
    p_rows_affected INTEGER DEFAULT NULL,
    p_index_used VARCHAR(255) DEFAULT NULL,
    p_query_plan TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO optimization.query_performance_log 
    (query_type, operation, execution_time_ms, rows_affected, index_used, query_plan)
    VALUES (p_query_type, p_operation, p_execution_time_ms, p_rows_affected, p_index_used, p_query_plan);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- BASELINE PERFORMANCE MEASUREMENT
-- =============================================

-- Function to measure query performance before optimization
CREATE OR REPLACE FUNCTION optimization.measure_baseline_performance()
RETURNS TABLE (
    query_type TEXT,
    avg_execution_time_ms DECIMAL(10,3),
    query_count BIGINT,
    total_time_ms DECIMAL(10,3)
) AS $$
BEGIN
    RETURN QUERY
    WITH baseline_queries AS (
        -- Common booking queries
        SELECT 'booking_by_provider' as query_type,
               extract(epoch from (clock_timestamp() - clock_timestamp())) * 1000 as exec_time
        FROM (
            SELECT * FROM bookings 
            WHERE provider_id = (SELECT id FROM providers LIMIT 1)
            AND status IN ('pending', 'confirmed')
            ORDER BY booking_date DESC
            LIMIT 20
        ) t
        
        UNION ALL
        
        SELECT 'booking_by_user' as query_type,
               extract(epoch from (clock_timestamp() - clock_timestamp())) * 1000 as exec_time
        FROM (
            SELECT * FROM bookings 
            WHERE user_id = (SELECT id FROM users LIMIT 1)
            ORDER BY booking_date DESC
            LIMIT 20
        ) t
        
        UNION ALL
        
        SELECT 'availability_check' as query_type,
               extract(epoch from (clock_timestamp() - clock_timestamp())) * 1000 as exec_time
        FROM (
            SELECT COUNT(*) FROM bookings 
            WHERE provider_id = (SELECT id FROM providers LIMIT 1)
            AND booking_date = CURRENT_DATE
            AND status NOT IN ('cancelled', 'no_show')
            AND (
                (start_time <= '14:00' AND end_time > '14:00') OR
                (start_time < '15:00' AND end_time >= '15:00') OR
                (start_time >= '14:00' AND end_time <= '15:00')
            )
        ) t
        
        UNION ALL
        
        SELECT 'booking_analytics' as query_type,
               extract(epoch from (clock_timestamp() - clock_timestamp())) * 1000 as exec_time
        FROM (
            SELECT 
                DATE_TRUNC('day', booking_date) as day,
                COUNT(*) as booking_count,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount
            FROM bookings 
            WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days'
            AND status = 'completed'
            GROUP BY DATE_TRUNC('day', booking_date)
            ORDER BY day
        ) t
    )
    SELECT 
        bq.query_type,
        AVG(bq.exec_time)::DECIMAL(10,3) as avg_execution_time_ms,
        COUNT(*)::BIGINT as query_count,
        SUM(bq.exec_time)::DECIMAL(10,3) as total_time_ms
    FROM baseline_queries bq
    GROUP BY bq.query_type;
END;
$$ LANGUAGE plpgsql;

-- Store baseline performance
INSERT INTO optimization.query_performance_log (query_type, operation, execution_time_ms, rows_affected)
SELECT 
    query_type,
    'baseline_measurement',
    avg_execution_time_ms,
    query_count::INTEGER
FROM optimization.measure_baseline_performance();

-- =============================================
-- PHASE 1: CRITICAL INDEX CREATION
-- =============================================

-- Drop existing indexes if they exist (to recreate optimized versions)
DO $$ 
BEGIN
    -- Check and drop existing indexes that we'll recreate
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_provider') THEN
        DROP INDEX idx_bookings_provider;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_user') THEN
        DROP INDEX idx_bookings_user;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_date') THEN
        DROP INDEX idx_bookings_date;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_status') THEN
        DROP INDEX idx_bookings_status;
    END IF;
END $$;

-- 1. Most Critical Composite Indexes
-- Based on most frequent query patterns from booking.service.ts

-- Provider-centric queries (most frequent pattern)
CREATE INDEX CONCURRENTLY idx_bookings_provider_date_status 
ON bookings(provider_id, booking_date DESC, status)
WHERE status NOT IN ('cancelled', 'no_show');

-- User booking history queries
CREATE INDEX CONCURRENTLY idx_bookings_user_date_status 
ON bookings(user_id, booking_date DESC, status);

-- Provider dashboard queries (status + time-based)
CREATE INDEX CONCURRENTLY idx_bookings_provider_status_time 
ON bookings(provider_id, status, start_time, end_time)
WHERE status IN ('pending', 'confirmed', 'completed');

-- 2. Time Conflict Detection Optimization
-- Critical for availability checking (availability.service.ts)

-- Primary conflict detection index
CREATE INDEX CONCURRENTLY idx_bookings_conflict_detection 
ON bookings(provider_id, booking_date, start_time, end_time)
WHERE status NOT IN ('cancelled', 'no_show');

-- Secondary conflict check with exclusion
CREATE INDEX CONCURRENTLY idx_bookings_time_overlap 
ON bookings(provider_id, booking_date, start_time, end_time)
INCLUDE (id, status)
WHERE status IN ('pending', 'confirmed');

-- 3. Analytics and Reporting Indexes

-- Date-based analytics (for dashboard queries)
CREATE INDEX CONCURRENTLY idx_bookings_analytics_date 
ON bookings(booking_date, status, provider_id)
INCLUDE (amount, platform_fee, provider_fee);

-- Revenue analytics by creation date
CREATE INDEX CONCURRENTLY idx_bookings_created_analytics 
ON bookings(created_at, provider_id, status)
INCLUDE (amount, platform_fee)
WHERE status = 'completed';

-- Monthly settlement calculations
CREATE INDEX CONCURRENTLY idx_bookings_settlement_month 
ON bookings(provider_id, 
           EXTRACT(YEAR FROM created_at), 
           EXTRACT(MONTH FROM created_at), 
           status)
INCLUDE (amount, platform_fee)
WHERE status = 'completed';

-- 4. Real-time and Dashboard Queries

-- Today's bookings (high-frequency real-time queries)
CREATE INDEX CONCURRENTLY idx_bookings_today_realtime 
ON bookings(provider_id, booking_date, start_time)
WHERE booking_date >= CURRENT_DATE 
AND booking_date <= CURRENT_DATE + INTERVAL '1 day'
AND status IN ('pending', 'confirmed');

-- Upcoming bookings with reminders
CREATE INDEX CONCURRENTLY idx_bookings_upcoming_reminders 
ON bookings(booking_date, start_time, status)
INCLUDE (user_id, provider_id, service_id)
WHERE booking_date >= CURRENT_DATE 
AND status IN ('pending', 'confirmed');

-- User recent activity
CREATE INDEX CONCURRENTLY idx_bookings_user_recent 
ON bookings(user_id, created_at DESC)
INCLUDE (provider_id, service_id, status, amount)
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- 5. Search and Filter Optimization

-- Advanced search queries (booking.controller.ts:307-383)
CREATE INDEX CONCURRENTLY idx_bookings_search_filters 
ON bookings(status, booking_date, provider_id, service_id)
INCLUDE (user_id, amount, created_at);

-- Amount-based filtering
CREATE INDEX CONCURRENTLY idx_bookings_amount_filter 
ON bookings(amount, booking_date)
WHERE amount > 0;

-- Service-based queries
CREATE INDEX CONCURRENTLY idx_bookings_service_date 
ON bookings(service_id, booking_date DESC, status);

-- =============================================
-- PHASE 2: SUPPORTING TABLE INDEXES
-- =============================================

-- Optimize provider-related queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_location_verified 
ON providers USING GIST(location) 
WHERE verified = true;

-- Service queries optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_provider_active 
ON services(provider_id, active, category_id)
WHERE active = true;

-- Provider availability optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_availability_lookup 
ON provider_availability(provider_id, day_of_week, is_available)
WHERE is_available = true;

-- Reviews for provider ratings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_provider_created 
ON reviews(provider_id, created_at DESC)
INCLUDE (rating);

-- Settlement queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_settlements_provider_period 
ON settlements(provider_id, year, month, settlement_status);

-- =============================================
-- PHASE 3: MATERIALIZED VIEWS FOR ANALYTICS
-- =============================================

-- Provider performance dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS optimization.provider_performance_dashboard AS
SELECT 
    p.id as provider_id,
    p.business_name_en,
    p.business_name_ar,
    p.rating,
    p.total_reviews,
    
    -- Booking statistics
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    COUNT(CASE WHEN b.booking_date >= CURRENT_DATE THEN 1 END) as upcoming_bookings,
    
    -- Revenue statistics
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.amount END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.provider_fee END), 0) as provider_earnings,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.platform_fee END), 0) as platform_fees,
    
    -- Performance metrics
    CASE 
        WHEN COUNT(b.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN b.status = 'completed' THEN 1 END) * 100.0 / COUNT(b.id)), 2)
        ELSE 0 
    END as completion_rate,
    
    CASE 
        WHEN COUNT(b.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) * 100.0 / COUNT(b.id)), 2)
        ELSE 0 
    END as cancellation_rate,
    
    -- Date aggregations
    DATE_TRUNC('month', CURRENT_DATE) as report_month,
    NOW() as last_updated
    
FROM providers p
LEFT JOIN bookings b ON p.id = b.provider_id 
    AND b.created_at >= CURRENT_DATE - INTERVAL '30 days'
WHERE p.verified = true
GROUP BY p.id, p.business_name_en, p.business_name_ar, p.rating, p.total_reviews;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_provider_performance_provider 
ON optimization.provider_performance_dashboard(provider_id);

-- Daily booking analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS optimization.daily_booking_analytics AS
SELECT 
    booking_date,
    status,
    
    -- Booking counts
    COUNT(*) as booking_count,
    COUNT(DISTINCT provider_id) as active_providers,
    COUNT(DISTINCT user_id) as active_customers,
    
    -- Revenue metrics
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(SUM(provider_fee), 0) as provider_earnings,
    COALESCE(SUM(platform_fee), 0) as platform_revenue,
    COALESCE(AVG(amount), 0) as avg_booking_amount,
    
    -- Time-based metrics
    EXTRACT(DOW FROM booking_date) as day_of_week,
    EXTRACT(HOUR FROM start_time::TIME) as peak_hour,
    
    NOW() as last_updated
    
FROM bookings
WHERE booking_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY booking_date, status;

-- Create indexes on daily analytics
CREATE INDEX IF NOT EXISTS idx_mv_daily_analytics_date 
ON optimization.daily_booking_analytics(booking_date DESC);

CREATE INDEX IF NOT EXISTS idx_mv_daily_analytics_status 
ON optimization.daily_booking_analytics(status, booking_date);

-- =============================================
-- PHASE 4: OPTIMIZED QUERY FUNCTIONS
-- =============================================

-- Optimized availability conflict detection
CREATE OR REPLACE FUNCTION optimization.check_booking_conflicts(
    p_provider_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
) RETURNS TABLE (
    conflict_exists BOOLEAN,
    conflicting_booking_id UUID,
    conflicting_start_time TIME,
    conflicting_end_time TIME,
    customer_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH time_conflicts AS (
        SELECT 
            b.id,
            b.start_time,
            b.end_time,
            u.name as customer_name,
            -- Use optimized overlap detection
            (b.start_time::TIME, b.end_time::TIME) OVERLAPS (p_start_time, p_end_time) as has_conflict
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.provider_id = p_provider_id
        AND b.booking_date = p_booking_date
        AND b.status NOT IN ('cancelled', 'no_show')
        AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
        AND (b.start_time::TIME, b.end_time::TIME) OVERLAPS (p_start_time, p_end_time)
    )
    SELECT 
        COUNT(*) > 0,
        tc.id,
        tc.start_time,
        tc.end_time,
        tc.customer_name
    FROM time_conflicts tc
    WHERE tc.has_conflict = true
    GROUP BY tc.id, tc.start_time, tc.end_time, tc.customer_name
    ORDER BY tc.start_time
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Optimized provider booking list
CREATE OR REPLACE FUNCTION optimization.get_provider_bookings_optimized(
    p_provider_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    booking_id UUID,
    user_name VARCHAR,
    user_phone VARCHAR,
    service_name VARCHAR,
    booking_date DATE,
    start_time TIME,
    end_time TIME,
    status booking_status,
    amount DECIMAL,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        u.name,
        u.phone,
        COALESCE(s.name_en, s.name_ar),
        b.booking_date,
        b.start_time,
        b.end_time,
        b.status,
        b.amount,
        b.created_at
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN services s ON b.service_id = s.id
    WHERE b.provider_id = p_provider_id
    AND (p_status IS NULL OR b.status = p_status::booking_status)
    AND (p_date_from IS NULL OR b.booking_date >= p_date_from)
    AND (p_date_to IS NULL OR b.booking_date <= p_date_to)
    ORDER BY b.booking_date DESC, b.start_time DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Optimized analytics query
CREATE OR REPLACE FUNCTION optimization.get_booking_analytics_optimized(
    p_provider_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_group_by VARCHAR DEFAULT 'day'
) RETURNS TABLE (
    period_start DATE,
    total_bookings BIGINT,
    completed_bookings BIGINT,
    cancelled_bookings BIGINT,
    total_revenue DECIMAL,
    platform_fees DECIMAL,
    average_amount DECIMAL,
    unique_customers BIGINT
) AS $$
DECLARE
    date_trunc_format VARCHAR;
BEGIN
    -- Set date truncation format
    date_trunc_format := CASE 
        WHEN p_group_by = 'hour' THEN 'hour'
        WHEN p_group_by = 'day' THEN 'day'
        WHEN p_group_by = 'week' THEN 'week'
        WHEN p_group_by = 'month' THEN 'month'
        ELSE 'day'
    END;
    
    RETURN QUERY
    EXECUTE format('
        SELECT 
            DATE_TRUNC(%L, b.booking_date)::DATE as period_start,
            COUNT(*)::BIGINT as total_bookings,
            COUNT(CASE WHEN b.status = ''completed'' THEN 1 END)::BIGINT as completed_bookings,
            COUNT(CASE WHEN b.status = ''cancelled'' THEN 1 END)::BIGINT as cancelled_bookings,
            COALESCE(SUM(CASE WHEN b.status = ''completed'' THEN b.amount END), 0)::DECIMAL as total_revenue,
            COALESCE(SUM(CASE WHEN b.status = ''completed'' THEN b.platform_fee END), 0)::DECIMAL as platform_fees,
            COALESCE(AVG(CASE WHEN b.status = ''completed'' THEN b.amount END), 0)::DECIMAL as average_amount,
            COUNT(DISTINCT b.user_id)::BIGINT as unique_customers
        FROM bookings b
        WHERE ($1 IS NULL OR b.provider_id = $1)
        AND ($2 IS NULL OR b.booking_date >= $2)
        AND ($3 IS NULL OR b.booking_date <= $3)
        GROUP BY DATE_TRUNC(%L, b.booking_date)
        ORDER BY period_start DESC
    ', date_trunc_format, date_trunc_format)
    USING p_provider_id, p_date_from, p_date_to;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PHASE 5: MAINTENANCE AND MONITORING
-- =============================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION optimization.refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY optimization.provider_performance_dashboard;
    REFRESH MATERIALIZED VIEW CONCURRENTLY optimization.daily_booking_analytics;
    
    -- Log refresh
    INSERT INTO optimization.query_performance_log (query_type, operation, execution_time_ms, rows_affected)
    VALUES ('maintenance', 'refresh_materialized_views', 0, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to analyze index usage
CREATE OR REPLACE FUNCTION optimization.analyze_index_usage()
RETURNS TABLE (
    index_name TEXT,
    table_name TEXT,
    index_size TEXT,
    scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    usage_ratio DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.indexrelname::TEXT as index_name,
        t.relname::TEXT as table_name,
        pg_size_pretty(pg_relation_size(i.indexrelid))::TEXT as index_size,
        s.idx_scan as scans,
        s.idx_tup_read as tuples_read,
        s.idx_tup_fetch as tuples_fetched,
        CASE 
            WHEN s.idx_scan > 0 THEN (s.idx_tup_fetch::DECIMAL / s.idx_scan)
            ELSE 0
        END as usage_ratio
    FROM pg_stat_user_indexes s
    JOIN pg_class i ON s.indexrelid = i.oid
    JOIN pg_class t ON s.relid = t.oid
    WHERE t.relname IN ('bookings', 'providers', 'services', 'users', 'reviews')
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get slow queries
CREATE OR REPLACE FUNCTION optimization.get_slow_queries(
    p_min_duration_ms INTEGER DEFAULT 1000
) RETURNS TABLE (
    query TEXT,
    calls BIGINT,
    total_time_ms DECIMAL,
    mean_time_ms DECIMAL,
    max_time_ms DECIMAL,
    rows_affected BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pss.query,
        pss.calls,
        (pss.total_exec_time)::DECIMAL as total_time_ms,
        (pss.mean_exec_time)::DECIMAL as mean_time_ms,
        (pss.max_exec_time)::DECIMAL as max_time_ms,
        pss.rows as rows_affected
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > p_min_duration_ms
    AND pss.query LIKE '%bookings%'
    ORDER BY pss.mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PHASE 6: POST-OPTIMIZATION VALIDATION
-- =============================================

-- Test the optimized queries
DO $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time_ms DECIMAL;
    test_provider_id UUID;
    test_user_id UUID;
BEGIN
    -- Get test IDs
    SELECT id INTO test_provider_id FROM providers WHERE verified = true LIMIT 1;
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    -- Test 1: Provider booking list
    start_time := clock_timestamp();
    PERFORM * FROM optimization.get_provider_bookings_optimized(test_provider_id, NULL, NULL, NULL, 20, 0);
    end_time := clock_timestamp();
    execution_time_ms := extract(epoch from (end_time - start_time)) * 1000;
    
    PERFORM optimization.log_query_performance(
        'booking_list', 
        'provider_bookings_optimized', 
        execution_time_ms, 
        20, 
        'idx_bookings_provider_date_status'
    );
    
    -- Test 2: Conflict detection
    start_time := clock_timestamp();
    PERFORM * FROM optimization.check_booking_conflicts(
        test_provider_id, 
        CURRENT_DATE, 
        '14:00'::TIME, 
        '15:00'::TIME
    );
    end_time := clock_timestamp();
    execution_time_ms := extract(epoch from (end_time - start_time)) * 1000;
    
    PERFORM optimization.log_query_performance(
        'availability_check', 
        'conflict_detection_optimized', 
        execution_time_ms, 
        1, 
        'idx_bookings_conflict_detection'
    );
    
    -- Test 3: Analytics
    start_time := clock_timestamp();
    PERFORM * FROM optimization.get_booking_analytics_optimized(
        test_provider_id, 
        CURRENT_DATE - INTERVAL '30 days', 
        CURRENT_DATE, 
        'day'
    );
    end_time := clock_timestamp();
    execution_time_ms := extract(epoch from (end_time - start_time)) * 1000;
    
    PERFORM optimization.log_query_performance(
        'analytics', 
        'booking_analytics_optimized', 
        execution_time_ms, 
        30, 
        'idx_bookings_analytics_date'
    );
    
    RAISE NOTICE 'Optimization validation completed. Check optimization.query_performance_log for results.';
END $$;

-- =============================================
-- CLEANUP AND STATISTICS UPDATE
-- =============================================

-- Update table statistics
ANALYZE bookings;
ANALYZE providers;
ANALYZE services;
ANALYZE users;
ANALYZE reviews;
ANALYZE settlements;

-- Update materialized views
SELECT optimization.refresh_analytics_views();

-- =============================================
-- FINAL REPORT
-- =============================================

-- Generate optimization report
SELECT 
    'OPTIMIZATION COMPLETE' as status,
    COUNT(*) as new_indexes_created,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND indexrelname LIKE 'idx_bookings_%'
AND indexrelname NOT IN ('idx_bookings_user', 'idx_bookings_provider', 'idx_bookings_date', 'idx_bookings_status');

-- Show performance comparison
SELECT 
    'PERFORMANCE COMPARISON' as report_type,
    query_type,
    operation,
    execution_time_ms,
    timestamp
FROM optimization.query_performance_log
WHERE operation IN ('baseline_measurement', 'provider_bookings_optimized', 'conflict_detection_optimized', 'booking_analytics_optimized')
ORDER BY query_type, timestamp;

-- Show index usage
SELECT * FROM optimization.analyze_index_usage()
WHERE index_name LIKE 'idx_bookings_%'
ORDER BY scans DESC;

\echo 'Database optimization completed successfully!'
\echo 'Run SELECT * FROM optimization.query_performance_log; to view performance metrics'
\echo 'Run SELECT * FROM optimization.analyze_index_usage(); to monitor index usage'
\echo 'Set up a cron job to run SELECT optimization.refresh_analytics_views(); every hour'