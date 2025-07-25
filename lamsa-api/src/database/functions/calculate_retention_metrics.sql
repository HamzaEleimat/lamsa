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