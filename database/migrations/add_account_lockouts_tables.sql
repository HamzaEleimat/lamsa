-- Create account lockouts table for tracking failed login attempts
CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  lockout_type VARCHAR(50) NOT NULL, -- 'customer', 'provider', 'otp', 'mfa'
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
  locked_until TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create composite unique index for identifier and lockout type
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_lockouts_identifier_type 
  ON account_lockouts(identifier, lockout_type);

-- Create index for faster lockout checks
CREATE INDEX IF NOT EXISTS idx_account_lockouts_locked_until 
  ON account_lockouts(locked_until) 
  WHERE locked_until IS NOT NULL;

-- Create security events table for audit trail
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  lockout_type VARCHAR(50),
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_identifier 
  ON security_events(identifier);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at 
  ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type 
  ON security_events(event_type);

-- Add RLS policies for account lockouts
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;

-- Only system can read/write lockouts (through service role)
CREATE POLICY "System can manage lockouts" ON account_lockouts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add RLS policies for security events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only system can write security events
CREATE POLICY "System can insert security events" ON security_events
  FOR INSERT
  WITH CHECK (true);

-- Admins can read security events
CREATE POLICY "Admins can read security events" ON security_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM providers 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE account_lockouts IS 'Tracks failed login attempts and account lockouts for brute force protection';
COMMENT ON COLUMN account_lockouts.identifier IS 'Phone number, email, or user ID being tracked';
COMMENT ON COLUMN account_lockouts.lockout_type IS 'Type of authentication: customer, provider, otp, mfa';
COMMENT ON COLUMN account_lockouts.attempts IS 'Number of failed attempts in current window';
COMMENT ON COLUMN account_lockouts.locked_until IS 'Timestamp when the lockout expires (NULL if not locked)';

COMMENT ON TABLE security_events IS 'Audit trail for security-related events including lockouts, suspicious activity, and admin actions';
COMMENT ON COLUMN security_events.identifier IS 'Phone number, email, or user ID involved in the event';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event: account_locked, login_success, admin_unlock, etc.';
COMMENT ON COLUMN security_events.metadata IS 'Additional event-specific data in JSON format';