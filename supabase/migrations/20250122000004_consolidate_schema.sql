-- Consolidate Database Schema Migration
-- This migration ensures all tables, indexes, and constraints are properly created
-- Based on the optimized_schema.sql with additional performance improvements

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_availability_check 
ON bookings(provider_id, booking_date, start_time, end_time) 
WHERE status IN ('pending', 'confirmed');

-- Note: Partial index with NOW() removed as it's not IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_bookings_user_activity 
ON bookings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_financial 
ON bookings(created_at, status) 
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_providers_search 
ON providers(status, rating) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_services_provider_lookup 
ON services(provider_id, active, category_id, price) 
WHERE active = true;

-- Add missing constraints with proper error handling
DO $$ 
BEGIN
  -- Add unique constraint to prevent double-booking using a unique index
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'unique_provider_timeslot') THEN
    CREATE UNIQUE INDEX unique_provider_timeslot 
    ON bookings(provider_id, booking_date, start_time) 
    WHERE status IN ('pending', 'confirmed');
  END IF;

  -- Add check constraints for data integrity
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_booking_future_date') THEN
    ALTER TABLE bookings 
    ADD CONSTRAINT check_booking_future_date 
    CHECK (
      (status = 'completed' OR status = 'cancelled') OR 
      (booking_date >= CURRENT_DATE)
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_service_duration') THEN
    ALTER TABLE services 
    ADD CONSTRAINT check_service_duration 
    CHECK (duration_minutes > 0 AND duration_minutes <= 480); -- Max 8 hours
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_service_price') THEN
    ALTER TABLE services 
    ADD CONSTRAINT check_service_price 
    CHECK (price >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_provider_rating') THEN
    ALTER TABLE providers 
    ADD CONSTRAINT check_provider_rating 
    CHECK (rating >= 0 AND rating <= 5);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if constraints already exist
  NULL;
END $$;

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
WHERE status = 'active';

-- Create partial indexes for performance
CREATE INDEX IF NOT EXISTS idx_active_providers 
ON providers(created_at DESC) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_pending_bookings 
ON bookings(created_at DESC) 
WHERE status = 'pending';

-- Add missing foreign key constraints with proper CASCADE behavior
DO $$ 
BEGIN
  -- Update bookings foreign keys
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
  ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
  
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_provider_id_fkey;
  ALTER TABLE bookings ADD CONSTRAINT bookings_provider_id_fkey 
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT;
  
  -- Update services foreign key to prevent accidental deletion of booking history
  ALTER TABLE services DROP CONSTRAINT IF EXISTS services_provider_id_fkey;
  ALTER TABLE services ADD CONSTRAINT services_provider_id_fkey 
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if constraints already exist with the same definition
  NULL;
END $$;

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

-- Note: PII encryption columns are only on providers table, not users
-- Indexes for these columns are created in the encrypt_provider_phones migration

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
WHERE p.status = 'active'
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
COMMENT ON COLUMN bookings.provider_fee IS 'Provider earning = service_amount - platform_fee';

-- Grant appropriate permissions
GRANT SELECT ON provider_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_provider_analytics() TO service_role;