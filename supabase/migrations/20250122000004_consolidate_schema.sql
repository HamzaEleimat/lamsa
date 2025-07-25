-- Consolidate Database Schema Migration
-- This migration ensures all tables, indexes, and constraints are properly created
-- Based on the optimized_schema.sql with additional performance improvements

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_availability_check 
ON bookings(provider_id, booking_date, start_time, end_time) 
WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_bookings_user_activity 
ON bookings(user_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '90 days';

CREATE INDEX IF NOT EXISTS idx_bookings_financial 
ON bookings(created_at, status) 
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_providers_search 
ON providers(verified, active, rating) 
WHERE active = true AND verified = true;

CREATE INDEX IF NOT EXISTS idx_services_provider_lookup 
ON services(provider_id, active, category_id, price) 
WHERE active = true;

-- Add missing unique constraints to prevent double-booking
ALTER TABLE bookings 
ADD CONSTRAINT IF NOT EXISTS unique_provider_timeslot 
UNIQUE (provider_id, booking_date, start_time, status) 
WHERE status IN ('pending', 'confirmed');

-- Add check constraints for data integrity
ALTER TABLE bookings 
ADD CONSTRAINT IF NOT EXISTS check_booking_future_date 
CHECK (
  (status = 'completed' OR status = 'cancelled') OR 
  (booking_date >= CURRENT_DATE)
);

ALTER TABLE services 
ADD CONSTRAINT IF NOT EXISTS check_service_duration 
CHECK (duration_minutes > 0 AND duration_minutes <= 480); -- Max 8 hours

ALTER TABLE services 
ADD CONSTRAINT IF NOT EXISTS check_service_price 
CHECK (price >= 0);

ALTER TABLE providers 
ADD CONSTRAINT IF NOT EXISTS check_provider_rating 
CHECK (rating >= 0 AND rating <= 5);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_services_search 
ON services(provider_id, category_id, active, price);

CREATE INDEX IF NOT EXISTS idx_reviews_provider_stats 
ON reviews(provider_id, rating, created_at);

CREATE INDEX IF NOT EXISTS idx_bookings_date_range 
ON bookings(booking_date, provider_id, status);

-- Add spatial index if not exists (for provider location queries)
CREATE INDEX IF NOT EXISTS idx_providers_location 
ON providers USING GIST (location) 
WHERE active = true AND verified = true;

-- Create partial indexes for performance
CREATE INDEX IF NOT EXISTS idx_active_providers 
ON providers(created_at DESC) 
WHERE active = true AND verified = true;

CREATE INDEX IF NOT EXISTS idx_pending_bookings 
ON bookings(created_at DESC) 
WHERE status = 'pending';

-- Add missing foreign key constraints with proper CASCADE behavior
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_user_id_fkey,
ADD CONSTRAINT bookings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_provider_id_fkey,
ADD CONSTRAINT bookings_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT;

-- Update services foreign key to prevent accidental deletion of booking history
ALTER TABLE services 
DROP CONSTRAINT IF EXISTS services_provider_id_fkey,
ADD CONSTRAINT services_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT;

-- Add audit columns if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0;

-- Create function to update provider stats
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE providers 
    SET 
      total_bookings = total_bookings + 1,
      total_revenue = total_revenue + NEW.total_amount,
      last_active_at = NOW()
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for provider stats
DROP TRIGGER IF EXISTS update_provider_stats_trigger ON bookings;
CREATE TRIGGER update_provider_stats_trigger
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_provider_stats();

-- Create function to validate booking times
CREATE OR REPLACE FUNCTION validate_booking_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure end_time is after start_time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  
  -- Ensure booking is within business hours (6 AM to 11 PM)
  IF EXTRACT(HOUR FROM NEW.start_time) < 6 OR EXTRACT(HOUR FROM NEW.end_time) > 23 THEN
    RAISE EXCEPTION 'Booking must be within business hours (6 AM to 11 PM)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking time validation
DROP TRIGGER IF EXISTS validate_booking_time_trigger ON bookings;
CREATE TRIGGER validate_booking_time_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION validate_booking_time();

-- Add indexes for the new PII encryption columns
CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phone_hash);
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);

-- Create materialized view for provider analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_analytics AS
SELECT 
  p.id,
  p.business_name_en,
  p.business_name_ar,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_bookings,
  COUNT(DISTINCT b.user_id) as unique_customers,
  AVG(r.rating) as average_rating,
  COUNT(DISTINCT r.id) as total_reviews,
  SUM(b.total_amount) FILTER (WHERE b.status = 'completed') as total_revenue,
  MAX(b.created_at) as last_booking_date
FROM providers p
LEFT JOIN bookings b ON p.id = b.provider_id
LEFT JOIN reviews r ON p.id = r.provider_id
WHERE p.active = true
GROUP BY p.id, p.business_name_en, p.business_name_ar;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_analytics_id ON provider_analytics(id);

-- Create function to refresh provider analytics
CREATE OR REPLACE FUNCTION refresh_provider_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_analytics;
END;
$$ LANGUAGE plpgsql;

-- Comments on important columns
COMMENT ON COLUMN providers.pii_encrypted IS 'Indicates if PII fields have been encrypted';
COMMENT ON COLUMN providers.pii_encrypted_at IS 'Timestamp when PII was encrypted';
COMMENT ON COLUMN bookings.platform_fee IS 'Platform fee: 2 JOD for services ≤25 JOD, 5 JOD for services >25 JOD';
COMMENT ON COLUMN bookings.provider_earning IS 'Provider earning = service_amount - platform_fee';

-- Grant appropriate permissions
GRANT SELECT ON provider_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_provider_analytics() TO service_role;