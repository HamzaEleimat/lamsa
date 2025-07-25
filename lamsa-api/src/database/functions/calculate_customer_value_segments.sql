-- Function to calculate customer value segments efficiently
-- This replaces multiple queries in customer-analytics.service.ts

CREATE OR REPLACE FUNCTION calculate_customer_value_segments(
  p_provider_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  user_id UUID,
  total_spent DECIMAL,
  booking_count INTEGER,
  average_booking_value DECIMAL,
  last_booking_date DATE,
  days_since_last_booking INTEGER,
  value_segment TEXT,
  recency_segment TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH customer_stats AS (
    SELECT 
      b.user_id,
      SUM(b.total_amount) as total_spent,
      COUNT(*) as booking_count,
      AVG(b.total_amount) as avg_booking_value,
      MAX(b.booking_date) as last_booking,
      EXTRACT(DAY FROM CURRENT_DATE - MAX(b.booking_date)) as days_since_last
    FROM bookings b
    WHERE b.provider_id = p_provider_id
      AND b.booking_date >= p_start_date
      AND b.booking_date <= p_end_date
      AND b.status = 'completed'
    GROUP BY b.user_id
  ),
  
  value_percentiles AS (
    SELECT 
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_spent) as p75,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_spent) as p25
    FROM customer_stats
  )
  
  SELECT 
    cs.user_id,
    cs.total_spent,
    cs.booking_count,
    cs.avg_booking_value,
    cs.last_booking as last_booking_date,
    cs.days_since_last::INTEGER as days_since_last_booking,
    CASE 
      WHEN cs.total_spent >= vp.p75 THEN 'high_value'
      WHEN cs.total_spent >= vp.p25 THEN 'medium_value'
      ELSE 'low_value'
    END as value_segment,
    CASE 
      WHEN cs.days_since_last <= 30 THEN 'active'
      WHEN cs.days_since_last <= 90 THEN 'at_risk'
      ELSE 'churned'
    END as recency_segment
  FROM customer_stats cs
  CROSS JOIN value_percentiles vp;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_customer_value_segments TO authenticated;

-- Create a composite index for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_provider_user_date 
ON bookings(provider_id, user_id, booking_date, total_amount)
WHERE status = 'completed';