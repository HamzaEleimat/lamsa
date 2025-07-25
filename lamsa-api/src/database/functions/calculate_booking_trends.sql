-- Function to calculate booking trends with various aggregations
-- This replaces multiple queries in dashboard.service.ts

CREATE OR REPLACE FUNCTION calculate_booking_trends(
  p_provider_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_group_by TEXT DEFAULT 'day' -- 'day', 'week', 'month'
)
RETURNS TABLE (
  period TEXT,
  period_start DATE,
  booking_count INTEGER,
  confirmed_count INTEGER,
  cancelled_count INTEGER,
  completed_count INTEGER,
  total_revenue DECIMAL,
  unique_customers INTEGER,
  new_customers INTEGER,
  avg_booking_value DECIMAL,
  cancellation_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    -- Generate complete date series based on grouping
    SELECT 
      CASE 
        WHEN p_group_by = 'day' THEN date_trunc('day', generate_series(p_start_date, p_end_date, '1 day'::interval))
        WHEN p_group_by = 'week' THEN date_trunc('week', generate_series(p_start_date, p_end_date, '1 week'::interval))
        ELSE date_trunc('month', generate_series(p_start_date, p_end_date, '1 month'::interval))
      END::DATE as period_date
  ),
  
  first_bookings AS (
    -- Find first booking date for each customer
    SELECT 
      user_id,
      MIN(booking_date) as first_booking_date
    FROM bookings
    WHERE provider_id = p_provider_id
      AND status = 'completed'
    GROUP BY user_id
  ),
  
  booking_aggregates AS (
    SELECT 
      CASE 
        WHEN p_group_by = 'day' THEN date_trunc('day', b.booking_date)
        WHEN p_group_by = 'week' THEN date_trunc('week', b.booking_date)
        ELSE date_trunc('month', b.booking_date)
      END::DATE as period_date,
      COUNT(*) as total_bookings,
      COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed,
      COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled,
      COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed,
      SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END) as revenue,
      COUNT(DISTINCT b.user_id) as unique_customers,
      COUNT(DISTINCT CASE 
        WHEN fb.first_booking_date >= date_trunc(p_group_by, b.booking_date)
        AND fb.first_booking_date < date_trunc(p_group_by, b.booking_date) + 
          CASE 
            WHEN p_group_by = 'day' THEN INTERVAL '1 day'
            WHEN p_group_by = 'week' THEN INTERVAL '1 week'
            ELSE INTERVAL '1 month'
          END
        THEN b.user_id 
      END) as new_customers
    FROM bookings b
    LEFT JOIN first_bookings fb ON fb.user_id = b.user_id
    WHERE b.provider_id = p_provider_id
      AND b.booking_date >= p_start_date
      AND b.booking_date <= p_end_date
    GROUP BY 1
  )
  
  SELECT 
    CASE 
      WHEN p_group_by = 'day' THEN TO_CHAR(ds.period_date, 'YYYY-MM-DD')
      WHEN p_group_by = 'week' THEN TO_CHAR(ds.period_date, 'YYYY-"W"IW')
      ELSE TO_CHAR(ds.period_date, 'YYYY-MM')
    END as period,
    ds.period_date as period_start,
    COALESCE(ba.total_bookings, 0) as booking_count,
    COALESCE(ba.confirmed, 0) as confirmed_count,
    COALESCE(ba.cancelled, 0) as cancelled_count,
    COALESCE(ba.completed, 0) as completed_count,
    COALESCE(ba.revenue, 0) as total_revenue,
    COALESCE(ba.unique_customers, 0) as unique_customers,
    COALESCE(ba.new_customers, 0) as new_customers,
    CASE 
      WHEN COALESCE(ba.completed, 0) > 0 
      THEN ROUND(ba.revenue / ba.completed, 2)
      ELSE 0 
    END as avg_booking_value,
    CASE 
      WHEN COALESCE(ba.total_bookings, 0) > 0 
      THEN ROUND((ba.cancelled::DECIMAL / ba.total_bookings) * 100, 2)
      ELSE 0 
    END as cancellation_rate
  FROM date_series ds
  LEFT JOIN booking_aggregates ba ON ba.period_date = ds.period_date
  ORDER BY ds.period_date;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_booking_trends TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_date_provider_status 
ON bookings(booking_date, provider_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_user_provider_date 
ON bookings(user_id, provider_id, booking_date);