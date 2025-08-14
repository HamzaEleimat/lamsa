-- Disable RLS for bookings and related tables for development
-- This allows our custom JWT authentication to work without Supabase Auth integration

-- Disable RLS for users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Disable RLS for bookings table
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Disable RLS for payments table (depends on bookings)
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Disable RLS for reviews table (depends on bookings)
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

-- Disable RLS for notifications table 
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Disable RLS for user_favorites table
ALTER TABLE user_favorites DISABLE ROW LEVEL SECURITY;

-- Disable RLS for settlements table
ALTER TABLE settlements DISABLE ROW LEVEL SECURITY;

-- Disable RLS for provider availability tables
ALTER TABLE provider_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE provider_special_dates DISABLE ROW LEVEL SECURITY;

-- Comment explaining the change
COMMENT ON TABLE users IS 'RLS disabled for development - using custom JWT authentication';
COMMENT ON TABLE bookings IS 'RLS disabled for development - using custom JWT authentication';
COMMENT ON TABLE payments IS 'RLS disabled for development - using custom JWT authentication';
COMMENT ON TABLE reviews IS 'RLS disabled for development - using custom JWT authentication';
COMMENT ON TABLE notifications IS 'RLS disabled for development - using custom JWT authentication';
COMMENT ON TABLE user_favorites IS 'RLS disabled for development - using custom JWT authentication';
COMMENT ON TABLE settlements IS 'RLS disabled for development - using custom JWT authentication';
COMMENT ON TABLE provider_availability IS 'RLS disabled for development - using custom JWT authentication';
COMMENT ON TABLE provider_special_dates IS 'RLS disabled for development - using custom JWT authentication';