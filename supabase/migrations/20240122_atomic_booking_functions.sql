-- Create atomic booking function to prevent race conditions
CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_user_id UUID,
  p_provider_id UUID,
  p_service_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_total_amount NUMERIC,
  p_payment_method TEXT,
  p_notes TEXT DEFAULT NULL,
  p_customer_address TEXT DEFAULT NULL,
  p_customer_location GEOMETRY DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_platform_fee NUMERIC;
  v_provider_earnings NUMERIC;
  v_conflict_count INTEGER;
BEGIN
  -- Lock the provider's schedule for the given date to prevent concurrent bookings
  PERFORM pg_advisory_xact_lock(
    ('x' || substr(md5(p_provider_id::text || p_booking_date::text), 1, 16))::bit(64)::bigint
  );
  
  -- Check for time slot conflicts
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM bookings
  WHERE provider_id = p_provider_id
    AND booking_date = p_booking_date
    AND status IN ('pending', 'confirmed')
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
    );
  
  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Time slot conflict: The selected time is not available';
  END IF;
  
  -- Calculate platform fee
  IF p_total_amount <= 25 THEN
    v_platform_fee := 2;
  ELSE
    v_platform_fee := 5;
  END IF;
  
  v_provider_earnings := p_total_amount - v_platform_fee;
  
  -- Create the booking atomically
  INSERT INTO bookings (
    user_id,
    provider_id,
    service_id,
    booking_date,
    start_time,
    end_time,
    status,
    total_amount,
    platform_fee,
    provider_earnings,
    payment_method,
    payment_status,
    notes,
    customer_address,
    customer_location,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_provider_id,
    p_service_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    'pending',
    p_total_amount,
    v_platform_fee,
    v_provider_earnings,
    p_payment_method,
    'pending',
    p_notes,
    p_customer_address,
    p_customer_location,
    NOW(),
    NOW()
  ) RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details for debugging
    RAISE NOTICE 'Error creating booking: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create function to check slot availability atomically
CREATE OR REPLACE FUNCTION check_slot_availability_atomic(
  p_provider_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  -- Lock the provider's schedule for read
  PERFORM pg_advisory_xact_lock_shared(
    ('x' || substr(md5(p_provider_id::text || p_booking_date::text), 1, 16))::bit(64)::bigint
  );
  
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM bookings
  WHERE provider_id = p_provider_id
    AND booking_date = p_booking_date
    AND status IN ('pending', 'confirmed')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
    );
  
  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to update booking status atomically
CREATE OR REPLACE FUNCTION update_booking_status_atomic(
  p_booking_id UUID,
  p_new_status TEXT,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
  v_provider_id UUID;
  v_booking_date DATE;
BEGIN
  -- Get booking details and lock it
  SELECT status, provider_id, booking_date
  INTO v_current_status, v_provider_id, v_booking_date
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Validate status transitions
  IF v_current_status = 'completed' THEN
    RAISE EXCEPTION 'Cannot modify completed bookings';
  END IF;
  
  IF v_current_status = 'cancelled' AND p_new_status != 'cancelled' THEN
    RAISE EXCEPTION 'Cannot reactivate cancelled bookings';
  END IF;
  
  -- Lock the provider's schedule if changing to/from confirmed status
  IF p_new_status IN ('confirmed', 'cancelled') OR v_current_status = 'confirmed' THEN
    PERFORM pg_advisory_xact_lock(
      ('x' || substr(md5(v_provider_id::text || v_booking_date::text), 1, 16))::bit(64)::bigint
    );
  END IF;
  
  -- Update the booking
  UPDATE bookings
  SET 
    status = p_new_status,
    cancelled_by = CASE WHEN p_new_status = 'cancelled' THEN p_cancelled_by ELSE NULL END,
    cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN p_cancellation_reason ELSE NULL END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE NULL END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function for batch booking creation (for recurring appointments)
CREATE OR REPLACE FUNCTION create_recurring_bookings_atomic(
  p_user_id UUID,
  p_provider_id UUID,
  p_service_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_day_of_week INTEGER[], -- 0 = Sunday, 6 = Saturday
  p_start_time TIME,
  p_end_time TIME,
  p_total_amount NUMERIC,
  p_payment_method TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID[] AS $$
DECLARE
  v_booking_ids UUID[] := '{}';
  v_current_date DATE;
  v_booking_id UUID;
BEGIN
  -- Validate date range
  IF p_end_date - p_start_date > 365 THEN
    RAISE EXCEPTION 'Recurring bookings cannot span more than 1 year';
  END IF;
  
  -- Lock the provider's schedule for the entire date range
  PERFORM pg_advisory_xact_lock(
    ('x' || substr(md5(p_provider_id::text || p_start_date::text || p_end_date::text), 1, 16))::bit(64)::bigint
  );
  
  -- Iterate through dates
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    -- Check if current day matches requested days of week
    IF EXTRACT(DOW FROM v_current_date)::INTEGER = ANY(p_day_of_week) THEN
      -- Try to create booking for this date
      BEGIN
        v_booking_id := create_booking_atomic(
          p_user_id,
          p_provider_id,
          p_service_id,
          v_current_date,
          p_start_time,
          p_end_time,
          p_total_amount,
          p_payment_method,
          p_notes
        );
        
        v_booking_ids := array_append(v_booking_ids, v_booking_id);
      EXCEPTION
        WHEN OTHERS THEN
          -- Skip this date if there's a conflict
          RAISE NOTICE 'Skipping date % due to conflict: %', v_current_date, SQLERRM;
      END;
    END IF;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  -- Ensure at least one booking was created
  IF array_length(v_booking_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No bookings could be created due to conflicts';
  END IF;
  
  RETURN v_booking_ids;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_booking_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION check_slot_availability_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION update_booking_status_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION create_recurring_bookings_atomic TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION create_booking_atomic IS 'Creates a booking atomically with automatic conflict detection and platform fee calculation';
COMMENT ON FUNCTION check_slot_availability_atomic IS 'Checks if a time slot is available with proper locking to prevent race conditions';
COMMENT ON FUNCTION update_booking_status_atomic IS 'Updates booking status with validation and proper locking';
COMMENT ON FUNCTION create_recurring_bookings_atomic IS 'Creates multiple bookings for recurring appointments with conflict detection';