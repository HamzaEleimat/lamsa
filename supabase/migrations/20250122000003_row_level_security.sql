-- ====================================================================
-- Row Level Security (RLS) Policies
-- Date: 2025-07-21
-- Description: Security policies for all tables
-- ====================================================================

-- Note: These policies assume you're using Supabase Auth
-- The auth.uid() function returns the current user's ID from JWT

-- ====================================================================
-- USERS TABLE POLICIES
-- ====================================================================

-- Users can only read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow new user registration (handled by auth functions)
CREATE POLICY "Enable user registration" ON users
  FOR INSERT WITH CHECK (true);

-- ====================================================================
-- PROVIDERS TABLE POLICIES
-- ====================================================================

-- Anyone can view active providers
CREATE POLICY "Anyone can view active providers" ON providers
  FOR SELECT USING (status = 'active');

-- Providers can view their own profile regardless of status
CREATE POLICY "Providers can view own profile" ON providers
  FOR SELECT USING (auth.uid() = id);

-- Providers can update their own profile
CREATE POLICY "Providers can update own profile" ON providers
  FOR UPDATE USING (auth.uid() = id);

-- ====================================================================
-- SERVICES TABLE POLICIES
-- ====================================================================

-- Anyone can view active services
CREATE POLICY "Anyone can view active services" ON services
  FOR SELECT USING (active = true);

-- Providers can view all their services
CREATE POLICY "Providers can view own services" ON services
  FOR SELECT USING (provider_id = auth.uid());

-- Providers can create services
CREATE POLICY "Providers can create services" ON services
  FOR INSERT WITH CHECK (provider_id = auth.uid());

-- Providers can update their own services
CREATE POLICY "Providers can update own services" ON services
  FOR UPDATE USING (provider_id = auth.uid());

-- Providers can delete their own services
CREATE POLICY "Providers can delete own services" ON services
  FOR DELETE USING (provider_id = auth.uid());

-- ====================================================================
-- BOOKINGS TABLE POLICIES
-- ====================================================================

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (user_id = auth.uid());

-- Providers can view bookings for their services
CREATE POLICY "Providers can view their bookings" ON bookings
  FOR SELECT USING (provider_id = auth.uid());

-- Users can create bookings
CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their pending bookings
CREATE POLICY "Users can update own pending bookings" ON bookings
  FOR UPDATE USING (
    user_id = auth.uid() 
    AND status = 'pending'
  );

-- Providers can update bookings for their services
CREATE POLICY "Providers can update their bookings" ON bookings
  FOR UPDATE USING (provider_id = auth.uid());

-- ====================================================================
-- REVIEWS TABLE POLICIES
-- ====================================================================

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

-- Users can create reviews for their completed bookings
CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
      AND bookings.user_id = auth.uid()
      AND bookings.status = 'completed'
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (user_id = auth.uid());

-- Providers can update responses to their reviews
CREATE POLICY "Providers can respond to reviews" ON reviews
  FOR UPDATE USING (provider_id = auth.uid());

-- ====================================================================
-- PAYMENTS TABLE POLICIES
-- ====================================================================

-- Users can view payments for their bookings
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Providers can view payments for their bookings
CREATE POLICY "Providers can view their payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.provider_id = auth.uid()
    )
  );

-- ====================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ====================================================================

-- Users can view their notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Providers can view their notifications
CREATE POLICY "Providers can view own notifications" ON notifications
  FOR SELECT USING (provider_id = auth.uid());

-- Users can update their notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Providers can update their notifications
CREATE POLICY "Providers can update own notifications" ON notifications
  FOR UPDATE USING (provider_id = auth.uid());

-- ====================================================================
-- USER_FAVORITES TABLE POLICIES
-- ====================================================================

-- Users can view their favorites
CREATE POLICY "Users can view own favorites" ON user_favorites
  FOR SELECT USING (user_id = auth.uid());

-- Users can add favorites
CREATE POLICY "Users can add favorites" ON user_favorites
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can remove favorites
CREATE POLICY "Users can remove favorites" ON user_favorites
  FOR DELETE USING (user_id = auth.uid());

-- ====================================================================
-- SETTLEMENTS TABLE POLICIES
-- ====================================================================

-- Providers can view their own settlements
CREATE POLICY "Providers can view own settlements" ON settlements
  FOR SELECT USING (provider_id = auth.uid());

-- ====================================================================
-- SERVICE_CATEGORIES TABLE POLICIES
-- ====================================================================

-- Anyone can view active categories
CREATE POLICY "Anyone can view categories" ON service_categories
  FOR SELECT USING (is_active = true);

-- ====================================================================
-- PROVIDER_AVAILABILITY TABLE POLICIES
-- ====================================================================

-- Anyone can view provider availability
CREATE POLICY "Anyone can view availability" ON provider_availability
  FOR SELECT USING (true);

-- Providers can manage their availability
CREATE POLICY "Providers can insert availability" ON provider_availability
  FOR INSERT WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update availability" ON provider_availability
  FOR UPDATE USING (provider_id = auth.uid());

CREATE POLICY "Providers can delete availability" ON provider_availability
  FOR DELETE USING (provider_id = auth.uid());

-- ====================================================================
-- PROVIDER_SPECIAL_DATES TABLE POLICIES
-- ====================================================================

-- Anyone can view special dates
CREATE POLICY "Anyone can view special dates" ON provider_special_dates
  FOR SELECT USING (true);

-- Providers can manage their special dates
CREATE POLICY "Providers can insert special dates" ON provider_special_dates
  FOR INSERT WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update special dates" ON provider_special_dates
  FOR UPDATE USING (provider_id = auth.uid());

CREATE POLICY "Providers can delete special dates" ON provider_special_dates
  FOR DELETE USING (provider_id = auth.uid());

-- ====================================================================
-- OTP_VERIFICATIONS TABLE POLICIES
-- ====================================================================

-- Note: OTP table should typically be managed by service role only
-- No RLS policies for regular users