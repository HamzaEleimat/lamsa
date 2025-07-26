-- Create booking statistics view for efficient aggregation
CREATE OR REPLACE VIEW booking_stats_by_provider AS
SELECT 
  provider_id,
  booking_date,
  status,
  COUNT(*) as booking_count,
  SUM(total_amount) as total_revenue,
  SUM(platform_fee) as total_platform_fees,
  SUM(provider_earnings) as total_provider_earnings,
  AVG(total_amount) as avg_booking_value,
  COUNT(DISTINCT user_id) as unique_customers
FROM bookings
GROUP BY provider_id, booking_date, status;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date_status 
ON bookings(provider_id, booking_date, status);

-- Create materialized view for provider performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_performance_summary AS
SELECT 
  provider_id,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE status = 'no_show') as no_show_bookings,
  COUNT(DISTINCT user_id) as total_unique_customers,
  COUNT(DISTINCT user_id) FILTER (WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days') as unique_customers_30d,
  SUM(total_amount) FILTER (WHERE status = 'completed') as total_revenue,
  SUM(provider_earnings) FILTER (WHERE status = 'completed') as total_earnings,
  AVG(total_amount) FILTER (WHERE status = 'completed') as avg_booking_value,
  MAX(booking_date) as last_booking_date,
  MIN(booking_date) as first_booking_date
FROM bookings
GROUP BY provider_id;

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_provider_performance_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW provider_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- Create function to get booking stats with date range
CREATE OR REPLACE FUNCTION get_booking_stats_by_period(
  p_provider_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  status TEXT,
  booking_count BIGINT,
  total_revenue NUMERIC,
  avg_booking_value NUMERIC,
  unique_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.status::TEXT,
    COUNT(*)::BIGINT as booking_count,
    COALESCE(SUM(b.total_amount), 0)::NUMERIC as total_revenue,
    COALESCE(AVG(b.total_amount), 0)::NUMERIC as avg_booking_value,
    COUNT(DISTINCT b.user_id)::BIGINT as unique_customers
  FROM bookings b
  WHERE b.provider_id = p_provider_id
    AND b.booking_date BETWEEN p_start_date AND p_end_date
  GROUP BY b.status;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for daily revenue aggregation
CREATE OR REPLACE FUNCTION get_daily_revenue_stats(
  p_provider_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  booking_date DATE,
  completed_bookings BIGINT,
  total_bookings BIGINT,
  revenue NUMERIC,
  platform_fees NUMERIC,
  net_earnings NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.booking_date,
    COUNT(*) FILTER (WHERE b.status = 'completed')::BIGINT as completed_bookings,
    COUNT(*)::BIGINT as total_bookings,
    COALESCE(SUM(b.total_amount) FILTER (WHERE b.status = 'completed'), 0)::NUMERIC as revenue,
    COALESCE(SUM(b.platform_fee) FILTER (WHERE b.status = 'completed'), 0)::NUMERIC as platform_fees,
    COALESCE(SUM(b.provider_earnings) FILTER (WHERE b.status = 'completed'), 0)::NUMERIC as net_earnings
  FROM bookings b
  WHERE b.provider_id = p_provider_id
    AND b.booking_date >= CURRENT_DATE - INTERVAL '1 day' * p_days
  GROUP BY b.booking_date
  ORDER BY b.booking_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create hourly pattern analysis function
CREATE OR REPLACE FUNCTION get_hourly_booking_patterns(
  p_provider_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  hour INTEGER,
  day_of_week INTEGER,
  booking_count BIGINT,
  avg_booking_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM b.start_time::TIME)::INTEGER as hour,
    EXTRACT(DOW FROM b.booking_date)::INTEGER as day_of_week,
    COUNT(*)::BIGINT as booking_count,
    COALESCE(AVG(b.total_amount), 0)::NUMERIC as avg_booking_value
  FROM bookings b
  WHERE b.provider_id = p_provider_id
    AND b.booking_date >= CURRENT_DATE - INTERVAL '1 day' * p_days
    AND b.status IN ('completed', 'confirmed')
  GROUP BY hour, day_of_week
  ORDER BY booking_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create customer retention analysis function
CREATE OR REPLACE FUNCTION get_customer_retention_stats(
  p_provider_id UUID
)
RETURNS TABLE (
  total_customers BIGINT,
  one_time_customers BIGINT,
  repeat_customers BIGINT,
  loyal_customers BIGINT,
  retention_rate NUMERIC,
  avg_customer_lifetime_value NUMERIC
) AS $$
DECLARE
  v_total_customers BIGINT;
  v_one_time BIGINT;
  v_repeat BIGINT;
  v_loyal BIGINT;
  v_retention_rate NUMERIC;
  v_avg_clv NUMERIC;
BEGIN
  -- Get customer booking counts
  WITH customer_bookings AS (
    SELECT 
      user_id,
      COUNT(*) as booking_count,
      SUM(total_amount) FILTER (WHERE status = 'completed') as total_spent
    FROM bookings
    WHERE provider_id = p_provider_id
    GROUP BY user_id
  )
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE booking_count = 1)::BIGINT,
    COUNT(*) FILTER (WHERE booking_count BETWEEN 2 AND 4)::BIGINT,
    COUNT(*) FILTER (WHERE booking_count >= 5)::BIGINT,
    AVG(total_spent)::NUMERIC
  INTO v_total_customers, v_one_time, v_repeat, v_loyal, v_avg_clv
  FROM customer_bookings;

  -- Calculate retention rate
  IF v_total_customers > 0 THEN
    v_retention_rate := ((v_repeat + v_loyal)::NUMERIC / v_total_customers::NUMERIC * 100)::NUMERIC(5,2);
  ELSE
    v_retention_rate := 0;
  END IF;

  RETURN QUERY SELECT 
    v_total_customers,
    v_one_time,
    v_repeat,
    v_loyal,
    v_retention_rate,
    COALESCE(v_avg_clv, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT SELECT ON booking_stats_by_provider TO authenticated;
GRANT SELECT ON provider_performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_stats_by_period TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_revenue_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_booking_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_retention_stats TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_provider_performance_summary TO authenticated;