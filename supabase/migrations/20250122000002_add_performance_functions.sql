-- Migration: Add performance optimization functions and indexes
-- Date: 2025-07-20
-- Description: Adds database functions for efficient analytics calculations and performance indexes

-- Drop existing functions if they exist (for idempotent migrations)
DROP FUNCTION IF EXISTS calculate_retention_metrics CASCADE;
DROP FUNCTION IF EXISTS calculate_customer_value_segments CASCADE;
DROP FUNCTION IF EXISTS calculate_booking_trends CASCADE;

-- Function to calculate retention metrics efficiently
-- This replaces the O(n²) complexity in customer-analytics.service.ts
CREATE OR REPLACE FUNCTION calculate_retention_metrics(
  p_provider_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  cohort_month TEXT,
  cohort_size INTEGER,
  retained_customers INTEGER,
  retention_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH cohort_data AS (
    -- Find first booking for each customer
    SELECT 
      user_id,
      DATE_TRUNC('month', MIN(booking_date))::DATE as cohort_date
    FROM bookings
    WHERE provider_id = p_provider_id
      AND booking_date >= p_start_date
      AND booking_date <= p_end_date
      AND status = 'completed'
    GROUP BY user_id
  ),
  
  retention_data AS (
    -- Calculate retention for each cohort
    SELECT 
      TO_CHAR(cd.cohort_date, 'YYYY-MM') as cohort_month,
      COUNT(DISTINCT cd.user_id) as cohort_size,
      COUNT(DISTINCT CASE 
        WHEN b2.user_id IS NOT NULL THEN cd.user_id 
      END) as retained_customers
    FROM cohort_data cd
    LEFT JOIN bookings b2 ON 
      b2.user_id = cd.user_id
      AND b2.provider_id = p_provider_id
      AND b2.booking_date >= (cd.cohort_date + INTERVAL '1 month')::DATE
      AND b2.booking_date < (cd.cohort_date + INTERVAL '2 months')::DATE
      AND b2.status = 'completed'
    GROUP BY cd.cohort_date
  )
  
  SELECT 
    cohort_month,
    cohort_size,
    retained_customers,
    ROUND((retained_customers::DECIMAL / NULLIF(cohort_size, 0)) * 100, 2) as retention_rate
  FROM retention_data
  ORDER BY cohort_month;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_retention_metrics TO authenticated;

-- Create an index to improve performance
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date_status 
ON bookings(provider_id, booking_date, status)
WHERE status = 'completed';

-- Function to calculate customer value segments
-- This provides efficient segmentation without loading all data into memory
CREATE OR REPLACE FUNCTION calculate_customer_value_segments(
  p_provider_id UUID,
  p_lookback_days INTEGER DEFAULT 365
)
RETURNS TABLE (
  segment_name TEXT,
  customer_count INTEGER,
  avg_booking_frequency DECIMAL,
  avg_booking_value DECIMAL,
  total_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH customer_metrics AS (
    SELECT 
      user_id,
      COUNT(*) as booking_count,
      AVG(total_amount) as avg_amount,
      SUM(total_amount) as total_amount,
      DATE_PART('day', MAX(booking_date) - MIN(booking_date)) + 1 as customer_lifetime_days
    FROM bookings
    WHERE provider_id = p_provider_id
      AND booking_date >= CURRENT_DATE - INTERVAL '1 day' * p_lookback_days
      AND status = 'completed'
    GROUP BY user_id
  ),
  
  customer_segments AS (
    SELECT 
      user_id,
      booking_count,
      avg_amount,
      total_amount,
      CASE 
        WHEN booking_count >= 10 AND total_amount >= 500 THEN 'VIP'
        WHEN booking_count >= 5 AND total_amount >= 200 THEN 'Regular'
        WHEN booking_count >= 2 THEN 'Occasional'
        ELSE 'New'
      END as segment,
      -- Monthly frequency
      CASE 
        WHEN customer_lifetime_days > 0 
        THEN (booking_count::DECIMAL / customer_lifetime_days) * 30
        ELSE booking_count 
      END as monthly_frequency
    FROM customer_metrics
  )
  
  SELECT 
    segment as segment_name,
    COUNT(*)::INTEGER as customer_count,
    ROUND(AVG(monthly_frequency), 2) as avg_booking_frequency,
    ROUND(AVG(avg_amount), 2) as avg_booking_value,
    ROUND(SUM(total_amount), 2) as total_revenue
  FROM customer_segments
  GROUP BY segment
  ORDER BY 
    CASE segment
      WHEN 'VIP' THEN 1
      WHEN 'Regular' THEN 2
      WHEN 'Occasional' THEN 3
      WHEN 'New' THEN 4
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_customer_value_segments TO authenticated;

-- Function to calculate booking trends efficiently
-- This replaces multiple queries with a single efficient calculation
CREATE OR REPLACE FUNCTION calculate_booking_trends(
  p_provider_id UUID,
  p_period TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  period_date DATE,
  period_label TEXT,
  total_bookings INTEGER,
  completed_bookings INTEGER,
  cancelled_bookings INTEGER,
  total_revenue DECIMAL,
  unique_customers INTEGER,
  completion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH booking_data AS (
    SELECT 
      CASE 
        WHEN p_period = 'daily' THEN booking_date
        WHEN p_period = 'weekly' THEN DATE_TRUNC('week', booking_date)::DATE
        WHEN p_period = 'monthly' THEN DATE_TRUNC('month', booking_date)::DATE
      END as period_date,
      status,
      total_amount,
      user_id
    FROM bookings
    WHERE provider_id = p_provider_id
      AND booking_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
  )
  
  SELECT 
    bd.period_date,
    CASE 
      WHEN p_period = 'daily' THEN TO_CHAR(bd.period_date, 'YYYY-MM-DD')
      WHEN p_period = 'weekly' THEN 'Week of ' || TO_CHAR(bd.period_date, 'YYYY-MM-DD')
      WHEN p_period = 'monthly' THEN TO_CHAR(bd.period_date, 'YYYY-MM')
    END as period_label,
    COUNT(*)::INTEGER as total_bookings,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_bookings,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::INTEGER as cancelled_bookings,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0)::DECIMAL as total_revenue,
    COUNT(DISTINCT user_id)::INTEGER as unique_customers,
    ROUND(
      COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(*), 0) * 100, 
      2
    ) as completion_rate
  FROM booking_data bd
  GROUP BY bd.period_date
  ORDER BY bd.period_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_booking_trends TO authenticated;

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_bookings_status_date 
ON bookings(status, booking_date);

CREATE INDEX IF NOT EXISTS idx_reviews_provider_rating 
ON reviews(provider_id, rating);

CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users(created_at);

-- Create materialized view for provider statistics (optional, for even better performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_stats_daily AS
SELECT 
  provider_id,
  DATE(booking_date) as date,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
  SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as revenue,
  COUNT(DISTINCT user_id) as unique_customers
FROM bookings
GROUP BY provider_id, DATE(booking_date);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_provider_stats_daily_provider_date 
ON provider_stats_daily(provider_id, date);

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_provider_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_stats_daily;
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic refresh (this would need to be done via cron job or scheduler)
-- Example: SELECT cron.schedule('refresh-provider-stats', '0 * * * *', 'SELECT refresh_provider_stats();');