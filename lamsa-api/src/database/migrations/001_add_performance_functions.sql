-- Migration: Add performance optimization functions and indexes
-- Date: 2025-07-20
-- Description: Adds database functions for efficient analytics calculations and performance indexes

-- Drop existing functions if they exist (for idempotent migrations)
DROP FUNCTION IF EXISTS calculate_retention_metrics CASCADE;
DROP FUNCTION IF EXISTS calculate_customer_value_segments CASCADE;
DROP FUNCTION IF EXISTS calculate_booking_trends CASCADE;

-- Include the function definitions
\i ../functions/calculate_retention_metrics.sql
\i ../functions/calculate_customer_value_segments.sql
\i ../functions/calculate_booking_trends.sql

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