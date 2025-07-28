-- ====================================================================
-- Employee Management Feature
-- Date: 2025-07-27
-- Description: Add employee selection capability to the booking system
-- ====================================================================

-- ====================================================================
-- TABLES
-- ====================================================================

-- Employees table - Staff members within provider organizations
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  title_ar VARCHAR(100), -- "كبير مصففي الشعر", "أخصائية أظافر", "خبيرة مكياج"
  title_en VARCHAR(100), -- "Senior Hairstylist", "Nail Technician", "Makeup Artist"
  phone VARCHAR(20),
  email VARCHAR(255),
  avatar_url TEXT,
  bio_ar TEXT,
  bio_en TEXT,
  years_experience INTEGER CHECK (years_experience >= 0),
  specialties TEXT[], -- ['hair coloring', 'bridal makeup', 'nail art', 'keratin treatment']
  
  -- Status and ratings
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  
  -- Metadata
  joined_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee services junction table - Which services each employee can perform
CREATE TABLE IF NOT EXISTS employee_services (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Primary specialist for this service
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (employee_id, service_id)
);

-- Employee weekly availability schedule
CREATE TABLE IF NOT EXISTS employee_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  break_start TIME,
  break_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, day_of_week),
  CONSTRAINT valid_work_hours CHECK (ends_at > starts_at),
  CONSTRAINT valid_break_hours CHECK (
    (break_start IS NULL AND break_end IS NULL) OR
    (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start AND 
     break_start >= starts_at AND break_end <= ends_at)
  )
);

-- Employee special dates (time off, holidays, special schedules)
CREATE TABLE IF NOT EXISTS employee_special_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT false,
  starts_at TIME,
  ends_at TIME,
  reason VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date),
  CONSTRAINT future_dates_only CHECK (date >= CURRENT_DATE),
  CONSTRAINT valid_special_hours CHECK (
    (is_available = false) OR 
    (is_available = true AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at > starts_at)
  )
);

-- User favorite employees
CREATE TABLE IF NOT EXISTS user_favorite_employees (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, employee_id)
);

-- ====================================================================
-- MODIFY EXISTING TABLES
-- ====================================================================

-- Add employee assignment to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS employee_requested BOOLEAN DEFAULT false;

-- Add employee-specific ratings to reviews
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS employee_rating INTEGER CHECK (employee_rating BETWEEN 1 AND 5);

-- ====================================================================
-- INDEXES
-- ====================================================================

-- Employees
CREATE INDEX idx_employees_provider ON employees(provider_id);
CREATE INDEX idx_employees_active ON employees(is_active) WHERE is_active = true;
CREATE INDEX idx_employees_rating ON employees(rating DESC) WHERE is_active = true;

-- Employee services
CREATE INDEX idx_employee_services_employee ON employee_services(employee_id);
CREATE INDEX idx_employee_services_service ON employee_services(service_id);
CREATE INDEX idx_employee_services_primary ON employee_services(service_id, is_primary) WHERE is_primary = true;

-- Employee availability
CREATE INDEX idx_employee_availability_employee ON employee_availability(employee_id);
CREATE INDEX idx_employee_availability_available ON employee_availability(employee_id, day_of_week) WHERE is_available = true;

-- Employee special dates
CREATE INDEX idx_employee_special_dates_employee_date ON employee_special_dates(employee_id, date);

-- Bookings employee
CREATE INDEX idx_bookings_employee ON bookings(employee_id);
CREATE INDEX idx_bookings_employee_date ON bookings(employee_id, booking_date, status) 
WHERE status IN ('pending', 'confirmed');

-- Reviews employee
CREATE INDEX idx_reviews_employee ON reviews(employee_id);

-- User favorites
CREATE INDEX idx_user_favorite_employees_user ON user_favorite_employees(user_id);
CREATE INDEX idx_user_favorite_employees_employee ON user_favorite_employees(employee_id);

-- ====================================================================
-- FUNCTIONS & TRIGGERS
-- ====================================================================

-- Update timestamp trigger for new tables
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_availability_updated_at BEFORE UPDATE ON employee_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check employee availability for a booking
CREATE OR REPLACE FUNCTION check_employee_availability(
  p_employee_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_is_available BOOLEAN;
  v_starts_at TIME;
  v_ends_at TIME;
  v_break_start TIME;
  v_break_end TIME;
  v_has_conflict BOOLEAN;
  v_provider_available BOOLEAN;
  v_provider_id UUID;
BEGIN
  -- Get provider_id for this employee
  SELECT provider_id INTO v_provider_id FROM employees WHERE id = p_employee_id;
  
  -- First check if provider is available
  SELECT check_provider_availability(v_provider_id, p_booking_date, p_start_time, p_end_time) 
  INTO v_provider_available;
  
  IF NOT v_provider_available THEN
    RETURN FALSE;
  END IF;
  
  -- Get day of week (0=Sunday, 6=Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_booking_date);
  
  -- Check special dates first
  SELECT is_available, starts_at, ends_at
  INTO v_is_available, v_starts_at, v_ends_at
  FROM employee_special_dates
  WHERE employee_id = p_employee_id AND date = p_booking_date;
  
  -- If no special date, check regular availability
  IF NOT FOUND THEN
    SELECT is_available, starts_at, ends_at, break_start, break_end
    INTO v_is_available, v_starts_at, v_ends_at, v_break_start, v_break_end
    FROM employee_availability
    WHERE employee_id = p_employee_id AND day_of_week = v_day_of_week;
  END IF;
  
  -- Employee not available on this day
  IF NOT v_is_available OR v_starts_at IS NULL OR v_ends_at IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if requested time is within employee work hours
  IF p_start_time < v_starts_at OR p_end_time > v_ends_at THEN
    RETURN FALSE;
  END IF;
  
  -- Check if requested time conflicts with break time
  IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
    IF NOT (p_end_time <= v_break_start OR p_start_time >= v_break_end) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check for booking conflicts
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE employee_id = p_employee_id
      AND booking_date = p_booking_date
      AND status IN ('pending', 'confirmed')
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
      )
  ) INTO v_has_conflict;
  
  RETURN NOT v_has_conflict;
END;
$$ LANGUAGE plpgsql;

-- Function to get available employees for a service at a specific time
CREATE OR REPLACE FUNCTION get_available_employees(
  p_service_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS TABLE (
  employee_id UUID,
  name_ar VARCHAR,
  name_en VARCHAR,
  title_ar VARCHAR,
  title_en VARCHAR,
  avatar_url TEXT,
  rating DECIMAL,
  total_reviews INTEGER,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e.id as employee_id,
    e.name_ar,
    e.name_en,
    e.title_ar,
    e.title_en,
    e.avatar_url,
    e.rating,
    e.total_reviews,
    es.is_primary
  FROM employees e
  INNER JOIN employee_services es ON e.id = es.employee_id
  WHERE 
    es.service_id = p_service_id
    AND e.is_active = true
    AND check_employee_availability(e.id, p_booking_date, p_start_time, p_end_time)
  ORDER BY es.is_primary DESC, e.rating DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update employee rating after review
CREATE OR REPLACE FUNCTION update_employee_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_id IS NOT NULL THEN
    UPDATE employees
    SET 
      rating = (
        SELECT ROUND(AVG(employee_rating)::DECIMAL, 2)
        FROM reviews
        WHERE employee_id = NEW.employee_id AND employee_rating IS NOT NULL
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM reviews
        WHERE employee_id = NEW.employee_id AND employee_rating IS NOT NULL
      )
    WHERE id = NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_rating_trigger
AFTER INSERT OR UPDATE OF employee_rating ON reviews
FOR EACH ROW 
WHEN (NEW.employee_id IS NOT NULL)
EXECUTE FUNCTION update_employee_rating();

-- Function to update employee booking count
CREATE OR REPLACE FUNCTION update_employee_booking_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.employee_id IS NOT NULL THEN
    UPDATE employees 
    SET total_bookings = total_bookings + 1
    WHERE id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_booking_count_trigger
AFTER UPDATE ON bookings
FOR EACH ROW
WHEN (NEW.employee_id IS NOT NULL)
EXECUTE FUNCTION update_employee_booking_count();

-- ====================================================================
-- ROW LEVEL SECURITY
-- ====================================================================

-- Enable RLS on new tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_special_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees (public read, provider manage)
CREATE POLICY "Anyone can view active employees"
ON employees FOR SELECT
USING (is_active = true);

CREATE POLICY "Providers can manage their employees"
ON employees FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM providers p
    WHERE p.id = employees.provider_id
    AND p.user_id = auth.uid()
  )
);

-- RLS Policies for employee_services
CREATE POLICY "Anyone can view employee services"
ON employee_services FOR SELECT
USING (true);

CREATE POLICY "Providers can manage employee services"
ON employee_services FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN providers p ON e.provider_id = p.id
    WHERE e.id = employee_services.employee_id
    AND p.user_id = auth.uid()
  )
);

-- RLS Policies for employee_availability
CREATE POLICY "Anyone can view employee availability"
ON employee_availability FOR SELECT
USING (true);

CREATE POLICY "Providers can manage employee availability"
ON employee_availability FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN providers p ON e.provider_id = p.id
    WHERE e.id = employee_availability.employee_id
    AND p.user_id = auth.uid()
  )
);

-- RLS Policies for employee_special_dates
CREATE POLICY "Anyone can view employee special dates"
ON employee_special_dates FOR SELECT
USING (true);

CREATE POLICY "Providers can manage employee special dates"
ON employee_special_dates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN providers p ON e.provider_id = p.id
    WHERE e.id = employee_special_dates.employee_id
    AND p.user_id = auth.uid()
  )
);

-- RLS Policies for user_favorite_employees
CREATE POLICY "Users can view their favorite employees"
ON user_favorite_employees FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their favorite employees"
ON user_favorite_employees FOR ALL
USING (user_id = auth.uid());

-- ====================================================================
-- SAMPLE DATA FOR TESTING
-- ====================================================================

-- This will be added in a separate seed file for development/testing

-- ====================================================================
-- COMMENTS
-- ====================================================================

COMMENT ON TABLE employees IS 'Staff members working at provider locations';
COMMENT ON TABLE employee_services IS 'Services that each employee can perform';
COMMENT ON TABLE employee_availability IS 'Weekly work schedule for employees';
COMMENT ON TABLE employee_special_dates IS 'Employee time off and special schedules';
COMMENT ON TABLE user_favorite_employees IS 'Users saved favorite employees';

COMMENT ON COLUMN bookings.employee_id IS 'Employee assigned to this booking (optional)';
COMMENT ON COLUMN bookings.employee_requested IS 'Whether customer specifically requested this employee';
COMMENT ON COLUMN reviews.employee_id IS 'Employee who provided the service';
COMMENT ON COLUMN reviews.employee_rating IS 'Rating specific to the employee performance';