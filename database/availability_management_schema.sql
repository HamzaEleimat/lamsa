-- Availability Management Schema for Lamsa
-- This schema handles provider availability with Jordan-specific considerations
-- including prayer times, Ramadan schedules, and cultural business practices

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- For time range exclusion constraints

-- Provider availability settings (global preferences)
CREATE TABLE IF NOT EXISTS provider_availability_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    
    -- General settings
    advance_booking_days INTEGER DEFAULT 30,
    min_advance_booking_hours INTEGER DEFAULT 2,
    max_advance_booking_days INTEGER DEFAULT 90,
    
    -- Buffer time settings
    default_preparation_minutes INTEGER DEFAULT 0,
    default_cleanup_minutes INTEGER DEFAULT 0,
    between_appointments_minutes INTEGER DEFAULT 0,
    
    -- Prayer time settings
    enable_prayer_breaks BOOLEAN DEFAULT TRUE,
    prayer_time_flexibility_minutes INTEGER DEFAULT 15, -- ±15 minutes
    auto_adjust_prayer_times BOOLEAN DEFAULT TRUE,
    prayer_calculation_method VARCHAR(50) DEFAULT 'jordan', -- Islamic calculation method
    
    -- Ramadan settings
    auto_switch_ramadan_schedule BOOLEAN DEFAULT TRUE,
    ramadan_schedule_template VARCHAR(50) DEFAULT 'standard', -- 'early', 'late', 'split'
    
    -- Other preferences
    allow_instant_booking BOOLEAN DEFAULT FALSE,
    require_deposit BOOLEAN DEFAULT FALSE,
    deposit_percentage DECIMAL(5,2) DEFAULT 0.00,
    cancellation_notice_hours INTEGER DEFAULT 24,
    
    -- Women-only hours (optional)
    women_only_hours_enabled BOOLEAN DEFAULT FALSE,
    women_only_start_time TIME,
    women_only_end_time TIME,
    women_only_days INTEGER[], -- Array of day numbers
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id)
);

-- Enhanced working schedules with multiple shifts
CREATE TABLE IF NOT EXISTS provider_working_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    schedule_name VARCHAR(100), -- 'default', 'ramadan', 'summer', 'winter'
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher priority overrides lower
    
    -- Date range for this schedule
    effective_from DATE,
    effective_to DATE,
    
    -- Recurrence rules (for seasonal schedules)
    recurrence_rule VARCHAR(50), -- 'yearly', 'ramadan', 'none'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Individual shifts within a schedule
CREATE TABLE IF NOT EXISTS provider_schedule_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES provider_working_schedules(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    
    -- Shift times
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Shift metadata
    shift_type VARCHAR(50) DEFAULT 'regular', -- 'regular', 'women_only', 'vip'
    max_bookings INTEGER, -- Limit concurrent bookings for this shift
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_shift_times CHECK (end_time > start_time)
);

-- Provider breaks (recurring breaks like lunch, prayers)
CREATE TABLE IF NOT EXISTS provider_breaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES provider_working_schedules(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    
    break_type VARCHAR(50) NOT NULL, -- 'lunch', 'prayer', 'personal', 'maintenance'
    break_name VARCHAR(100), -- 'Dhuhr Prayer', 'Lunch Break', etc.
    
    -- Fixed time breaks
    start_time TIME,
    end_time TIME,
    
    -- Dynamic breaks (for prayers)
    is_dynamic BOOLEAN DEFAULT FALSE,
    prayer_name VARCHAR(20), -- 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha'
    duration_minutes INTEGER DEFAULT 30,
    
    -- Flexibility settings
    is_flexible BOOLEAN DEFAULT FALSE,
    flexibility_minutes INTEGER DEFAULT 15,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_break_times CHECK (
        (is_dynamic = TRUE) OR (end_time > start_time)
    )
);

-- Time off / exceptions (one-time events)
CREATE TABLE IF NOT EXISTS provider_time_off (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Time off period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME, -- NULL for full day
    end_time TIME, -- NULL for full day
    
    -- Metadata
    reason VARCHAR(100), -- 'holiday', 'vacation', 'sick', 'personal', 'training'
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule VARCHAR(100), -- For recurring holidays
    
    -- Booking handling
    block_bookings BOOLEAN DEFAULT TRUE,
    auto_reschedule BOOLEAN DEFAULT FALSE,
    notification_sent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_off CHECK (end_date >= start_date)
);

-- Prayer times table (cached daily prayer times by location)
CREATE TABLE IF NOT EXISTS prayer_times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(100) NOT NULL,
    prayer_date DATE NOT NULL,
    
    -- Prayer times
    fajr TIME NOT NULL,
    sunrise TIME NOT NULL,
    dhuhr TIME NOT NULL,
    asr TIME NOT NULL,
    maghrib TIME NOT NULL,
    isha TIME NOT NULL,
    
    -- Calculation metadata
    calculation_method VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'Asia/Amman',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(city, prayer_date)
);

-- Pre-calculated availability slots for performance
CREATE TABLE IF NOT EXISTS availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Slot metadata
    is_available BOOLEAN DEFAULT TRUE,
    slot_type VARCHAR(50) DEFAULT 'regular', -- 'regular', 'instant', 'emergency'
    max_services INTEGER DEFAULT 1,
    booked_services INTEGER DEFAULT 0,
    
    -- Constraints
    women_only BOOLEAN DEFAULT FALSE,
    specific_services UUID[], -- Array of allowed service IDs
    
    -- Performance optimization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(provider_id, slot_date, start_time)
);

-- Service-specific buffer rules
CREATE TABLE IF NOT EXISTS service_buffer_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    -- Buffer times
    preparation_minutes INTEGER DEFAULT 0,
    service_minutes INTEGER NOT NULL, -- Actual service duration
    cleanup_minutes INTEGER DEFAULT 0,
    
    -- Conditional buffers
    first_appointment_extra_minutes INTEGER DEFAULT 0, -- Extra time for first appointment
    last_appointment_extra_minutes INTEGER DEFAULT 0, -- Extra cleanup for last appointment
    
    -- Parallel booking rules
    allow_parallel BOOLEAN DEFAULT FALSE,
    max_parallel INTEGER DEFAULT 1,
    requires_same_customer BOOLEAN DEFAULT FALSE, -- For family/group bookings
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id)
);

-- Ramadan schedules configuration
CREATE TABLE IF NOT EXISTS ramadan_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    
    -- Schedule template
    template_type VARCHAR(50) NOT NULL, -- 'early_shift', 'late_shift', 'split_shift', 'custom'
    
    -- Early shift (morning to afternoon)
    early_start_time TIME,
    early_end_time TIME,
    
    -- Late shift (evening after iftar)
    late_start_time TIME,
    late_end_time TIME,
    
    -- Iftar break
    iftar_break_minutes INTEGER DEFAULT 60,
    auto_adjust_maghrib BOOLEAN DEFAULT TRUE,
    
    -- Special services
    offer_home_service_only BOOLEAN DEFAULT FALSE,
    special_ramadan_services UUID[], -- Array of service IDs available during Ramadan
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, year)
);

-- Booking conflicts and resolutions
CREATE TABLE IF NOT EXISTS booking_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    original_booking_id UUID REFERENCES bookings(id),
    
    -- Conflict details
    conflict_type VARCHAR(50) NOT NULL, -- 'time_off', 'prayer_time', 'schedule_change', 'emergency'
    conflict_date DATE NOT NULL,
    conflict_time TIME NOT NULL,
    
    -- Resolution
    resolution_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'rescheduled', 'cancelled', 'override'
    new_date DATE,
    new_time TIME,
    
    -- Communication
    customer_notified BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    customer_response VARCHAR(50), -- 'accepted', 'rejected', 'no_response'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_availability_settings_provider ON provider_availability_settings(provider_id);
CREATE INDEX idx_working_schedules_provider ON provider_working_schedules(provider_id, is_active);
CREATE INDEX idx_working_schedules_dates ON provider_working_schedules(effective_from, effective_to);
CREATE INDEX idx_schedule_shifts_schedule ON provider_schedule_shifts(schedule_id, day_of_week);
CREATE INDEX idx_breaks_schedule_day ON provider_breaks(schedule_id, day_of_week);
CREATE INDEX idx_breaks_prayer ON provider_breaks(prayer_name) WHERE is_dynamic = TRUE;
CREATE INDEX idx_time_off_provider_dates ON provider_time_off(provider_id, start_date, end_date);
CREATE INDEX idx_prayer_times_lookup ON prayer_times(city, prayer_date);
CREATE INDEX idx_availability_slots_lookup ON availability_slots(provider_id, slot_date, is_available);
CREATE INDEX idx_availability_slots_expiry ON availability_slots(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_buffer_rules_service ON service_buffer_rules(service_id);
CREATE INDEX idx_ramadan_schedules_lookup ON ramadan_schedules(provider_id, year);
CREATE INDEX idx_conflicts_pending ON booking_conflicts(provider_id, resolution_status) WHERE resolution_status = 'pending';

-- Functions for availability management

-- Function to get prayer times for a specific date and location
CREATE OR REPLACE FUNCTION get_prayer_times(p_city VARCHAR, p_date DATE)
RETURNS TABLE(
    prayer_name VARCHAR,
    prayer_time TIME
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 'fajr'::VARCHAR, fajr FROM prayer_times WHERE city = p_city AND prayer_date = p_date
    UNION ALL
    SELECT 'dhuhr'::VARCHAR, dhuhr FROM prayer_times WHERE city = p_city AND prayer_date = p_date
    UNION ALL
    SELECT 'asr'::VARCHAR, asr FROM prayer_times WHERE city = p_city AND prayer_date = p_date
    UNION ALL
    SELECT 'maghrib'::VARCHAR, maghrib FROM prayer_times WHERE city = p_city AND prayer_date = p_date
    UNION ALL
    SELECT 'isha'::VARCHAR, isha FROM prayer_times WHERE city = p_city AND prayer_date = p_date;
END;
$$;

-- Function to check if a time slot conflicts with prayer time
CREATE OR REPLACE FUNCTION conflicts_with_prayer(
    p_provider_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_settings RECORD;
    v_prayer RECORD;
    v_city VARCHAR;
    v_prayer_start TIME;
    v_prayer_end TIME;
BEGIN
    -- Get provider settings
    SELECT * INTO v_settings
    FROM provider_availability_settings
    WHERE provider_id = p_provider_id;
    
    -- If prayer breaks disabled, no conflict
    IF NOT v_settings.enable_prayer_breaks THEN
        RETURN FALSE;
    END IF;
    
    -- Get provider city
    SELECT city INTO v_city
    FROM providers
    WHERE id = p_provider_id;
    
    -- Check each prayer time
    FOR v_prayer IN SELECT * FROM get_prayer_times(v_city, p_date)
    LOOP
        -- Skip Fajr and Isha as they're usually outside business hours
        IF v_prayer.prayer_name IN ('dhuhr', 'asr', 'maghrib') THEN
            -- Calculate prayer window with flexibility
            v_prayer_start := v_prayer.prayer_time - (v_settings.prayer_time_flexibility_minutes || ' minutes')::INTERVAL;
            v_prayer_end := v_prayer.prayer_time + ((v_settings.prayer_time_flexibility_minutes + 30) || ' minutes')::INTERVAL;
            
            -- Check for overlap
            IF (p_start_time, p_end_time) OVERLAPS (v_prayer_start, v_prayer_end) THEN
                RETURN TRUE;
            END IF;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$;

-- Function to calculate available slots for a given date
CREATE OR REPLACE FUNCTION calculate_availability_slots(
    p_provider_id UUID,
    p_date DATE,
    p_service_id UUID DEFAULT NULL
)
RETURNS TABLE(
    slot_start TIME,
    slot_end TIME,
    is_available BOOLEAN,
    slot_type VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_schedule RECORD;
    v_shift RECORD;
    v_break RECORD;
    v_booking RECORD;
    v_service_duration INTEGER;
    v_buffer_time INTEGER;
    v_current_time TIME;
    v_slot_end TIME;
    v_is_available BOOLEAN;
BEGIN
    -- Get service duration and buffer time
    IF p_service_id IS NOT NULL THEN
        SELECT 
            COALESCE(sbr.service_minutes, s.duration_minutes) + 
            COALESCE(sbr.preparation_minutes, 0) + 
            COALESCE(sbr.cleanup_minutes, 0)
        INTO v_service_duration
        FROM services s
        LEFT JOIN service_buffer_rules sbr ON sbr.service_id = s.id
        WHERE s.id = p_service_id;
    ELSE
        v_service_duration := 30; -- Default slot size
    END IF;
    
    -- Get active schedule for the date
    SELECT * INTO v_schedule
    FROM provider_working_schedules
    WHERE provider_id = p_provider_id
    AND is_active = TRUE
    AND (
        (effective_from IS NULL OR effective_from <= p_date) AND
        (effective_to IS NULL OR effective_to >= p_date)
    )
    ORDER BY priority DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN; -- No schedule found
    END IF;
    
    -- Get shifts for the day
    FOR v_shift IN 
        SELECT * FROM provider_schedule_shifts
        WHERE schedule_id = v_schedule.id
        AND day_of_week = EXTRACT(DOW FROM p_date)
    LOOP
        v_current_time := v_shift.start_time;
        
        WHILE v_current_time < v_shift.end_time LOOP
            v_slot_end := v_current_time + (v_service_duration || ' minutes')::INTERVAL;
            
            -- Check if slot extends beyond shift
            IF v_slot_end > v_shift.end_time THEN
                EXIT;
            END IF;
            
            v_is_available := TRUE;
            
            -- Check for breaks
            FOR v_break IN 
                SELECT * FROM provider_breaks
                WHERE schedule_id = v_schedule.id
                AND day_of_week = EXTRACT(DOW FROM p_date)
            LOOP
                -- Handle fixed breaks
                IF NOT v_break.is_dynamic THEN
                    IF (v_current_time, v_slot_end) OVERLAPS (v_break.start_time, v_break.end_time) THEN
                        v_is_available := FALSE;
                        EXIT;
                    END IF;
                END IF;
            END LOOP;
            
            -- Check for prayer conflicts
            IF v_is_available AND conflicts_with_prayer(p_provider_id, p_date, v_current_time, v_slot_end) THEN
                v_is_available := FALSE;
            END IF;
            
            -- Check for existing bookings
            IF v_is_available THEN
                FOR v_booking IN 
                    SELECT * FROM bookings
                    WHERE provider_id = p_provider_id
                    AND booking_date = p_date
                    AND status IN ('confirmed', 'pending')
                LOOP
                    IF (v_current_time, v_slot_end) OVERLAPS (v_booking.start_time, v_booking.end_time) THEN
                        v_is_available := FALSE;
                        EXIT;
                    END IF;
                END LOOP;
            END IF;
            
            -- Return the slot
            RETURN QUERY SELECT 
                v_current_time,
                v_slot_end,
                v_is_available,
                v_shift.shift_type;
            
            -- Move to next slot
            v_current_time := v_current_time + (15 || ' minutes')::INTERVAL; -- 15-minute intervals
        END LOOP;
    END LOOP;
END;
$$;

-- Function to check if Ramadan schedule should be active
CREATE OR REPLACE FUNCTION is_ramadan_period(p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_hijri_month INTEGER;
BEGIN
    -- This is a simplified check - in production, use proper Hijri calendar conversion
    -- For now, we'll use a table or API to determine Ramadan dates
    -- Placeholder implementation
    RETURN FALSE;
END;
$$;

-- Triggers
CREATE OR REPLACE FUNCTION update_availability_slots()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark slots for recalculation when schedule changes
    UPDATE availability_slots
    SET expires_at = CURRENT_TIMESTAMP
    WHERE provider_id = NEW.provider_id
    AND slot_date >= CURRENT_DATE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schedule_change
AFTER INSERT OR UPDATE OR DELETE ON provider_working_schedules
FOR EACH ROW EXECUTE FUNCTION update_availability_slots();

CREATE TRIGGER trigger_break_change
AFTER INSERT OR UPDATE OR DELETE ON provider_breaks
FOR EACH ROW EXECUTE FUNCTION update_availability_slots();

CREATE TRIGGER trigger_time_off_change
AFTER INSERT OR UPDATE OR DELETE ON provider_time_off
FOR EACH ROW EXECUTE FUNCTION update_availability_slots();

-- Update triggers for timestamp columns
CREATE TRIGGER update_availability_settings_updated_at
BEFORE UPDATE ON provider_availability_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_schedules_updated_at
BEFORE UPDATE ON provider_working_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_off_updated_at
BEFORE UPDATE ON provider_time_off
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buffer_rules_updated_at
BEFORE UPDATE ON service_buffer_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ramadan_schedules_updated_at
BEFORE UPDATE ON ramadan_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for Jordan prayer calculation methods
INSERT INTO prayer_times (city, prayer_date, fajr, sunrise, dhuhr, asr, maghrib, isha, calculation_method, latitude, longitude)
VALUES 
    ('Amman', CURRENT_DATE, '04:30', '05:55', '12:35', '16:05', '18:45', '20:05', 'jordan', 31.9454, 35.9284),
    ('Irbid', CURRENT_DATE, '04:28', '05:53', '12:33', '16:03', '18:43', '20:03', 'jordan', 32.5510, 35.8479),
    ('Zarqa', CURRENT_DATE, '04:29', '05:54', '12:34', '16:04', '18:44', '20:04', 'jordan', 32.0728, 36.0880)
ON CONFLICT (city, prayer_date) DO NOTHING;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Availability management schema created successfully with Jordan-specific features!';
END$$;