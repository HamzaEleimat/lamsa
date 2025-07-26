-- Security Rules and Data Validation for Lamsa Platform

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles are viewable"
ON users FOR SELECT
USING (is_active = true);

-- Providers table policies
CREATE POLICY "Providers can view their own data"
ON providers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Active providers are publicly viewable"
ON providers FOR SELECT
USING (is_active = true);

CREATE POLICY "Providers can update their own data"
ON providers FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Services table policies
CREATE POLICY "Anyone can view active services"
ON services FOR SELECT
USING (active = true);

CREATE POLICY "Providers can view their own services"
ON services FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = services.provider_id
    AND providers.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can create services"
ON services FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = provider_id
    AND providers.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their services"
ON services FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = services.provider_id
    AND providers.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete their services"
ON services FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = services.provider_id
    AND providers.user_id = auth.uid()
  )
);

-- Bookings table policies
CREATE POLICY "Users can view their own bookings"
ON bookings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Providers can view their bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = bookings.provider_id
    AND providers.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create bookings"
ON bookings FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and providers can update bookings"
ON bookings FOR UPDATE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = bookings.provider_id
    AND providers.user_id = auth.uid()
  )
);

-- Reviews table policies
CREATE POLICY "Anyone can view reviews"
ON reviews FOR SELECT
USING (true);

CREATE POLICY "Users can create reviews for their completed bookings"
ON reviews FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_id
    AND bookings.user_id = auth.uid()
    AND bookings.status = 'completed'
  )
);

CREATE POLICY "Users can update their own reviews"
ON reviews FOR UPDATE
USING (user_id = auth.uid());

-- Categories table policies
CREATE POLICY "Anyone can view active categories"
ON categories FOR SELECT
USING (active = true);

-- Data validation functions

-- Validate phone number format (Jordanian)
CREATE OR REPLACE FUNCTION validate_jordanian_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NOT NEW.phone ~ '^(07[789]|079)[0-9]{7}$' THEN
    RAISE EXCEPTION 'Invalid Jordanian phone number format';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply phone validation to users and providers
CREATE TRIGGER validate_user_phone
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION validate_jordanian_phone();

CREATE TRIGGER validate_provider_phone
BEFORE INSERT OR UPDATE ON providers
FOR EACH ROW
EXECUTE FUNCTION validate_jordanian_phone();

-- Validate booking times
CREATE OR REPLACE FUNCTION validate_booking_times()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if end time is after start time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  
  -- Check if booking is not in the past
  IF NEW.booking_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot create bookings in the past';
  END IF;
  
  -- Check if booking date and time are not too far in the future (90 days)
  IF NEW.booking_date > CURRENT_DATE + INTERVAL '90 days' THEN
    RAISE EXCEPTION 'Cannot create bookings more than 90 days in advance';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_booking_times_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION validate_booking_times();

-- Validate service prices
CREATE OR REPLACE FUNCTION validate_service_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.price < 0 THEN
    RAISE EXCEPTION 'Service price cannot be negative';
  END IF;
  
  IF NEW.price > 1000 THEN
    RAISE EXCEPTION 'Service price cannot exceed 1000 JOD';
  END IF;
  
  IF NEW.duration_minutes < 15 THEN
    RAISE EXCEPTION 'Service duration must be at least 15 minutes';
  END IF;
  
  IF NEW.duration_minutes > 480 THEN
    RAISE EXCEPTION 'Service duration cannot exceed 8 hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_service_price_trigger
BEFORE INSERT OR UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION validate_service_price();

-- Validate review ratings
CREATE OR REPLACE FUNCTION validate_review_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  
  -- Check if booking is completed
  IF NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE id = NEW.booking_id
    AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Can only review completed bookings';
  END IF;
  
  -- Check if review already exists
  IF TG_OP = 'INSERT' AND EXISTS (
    SELECT 1 FROM reviews
    WHERE booking_id = NEW.booking_id
  ) THEN
    RAISE EXCEPTION 'Booking has already been reviewed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_review_rating_trigger
BEFORE INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION validate_review_rating();

-- Prevent booking conflicts
CREATE OR REPLACE FUNCTION prevent_booking_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for time conflicts with existing bookings
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE provider_id = NEW.provider_id
    AND booking_date = NEW.booking_date
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    AND status IN ('confirmed', 'pending')
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
      (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
      (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Time slot conflicts with existing booking';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_booking_conflicts_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION prevent_booking_conflicts();

-- Update provider ratings when reviews are added
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
DECLARE
  new_rating DECIMAL(3,2);
  new_count INTEGER;
BEGIN
  -- Calculate new average rating
  SELECT 
    ROUND(AVG(rating)::DECIMAL, 2),
    COUNT(*)
  INTO new_rating, new_count
  FROM reviews
  WHERE provider_id = NEW.provider_id;
  
  -- Update provider
  UPDATE providers
  SET 
    rating = new_rating,
    review_count = new_count,
    updated_at = NOW()
  WHERE id = NEW.provider_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_provider_rating();

-- Audit trail for important changes
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, user_id, record_id, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging to critical tables
CREATE TRIGGER audit_bookings
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_providers
AFTER UPDATE OR DELETE ON providers
FOR EACH ROW
EXECUTE FUNCTION create_audit_log();

-- Index for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);

-- Grant permissions
GRANT SELECT ON audit_log TO authenticated;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete old notifications (older than 90 days)
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete old audit logs (older than 1 year)
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Delete cancelled bookings older than 6 months
  DELETE FROM bookings
  WHERE status = 'cancelled'
  AND cancelled_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data();');