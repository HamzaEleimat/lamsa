-- Add MFA fields to providers table
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT,
ADD COLUMN IF NOT EXISTS mfa_setup_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mfa_disabled_at TIMESTAMP WITH TIME ZONE;

-- Create MFA events table for audit trail
CREATE TABLE IF NOT EXISTS mfa_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_mfa_events_provider_id ON mfa_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_mfa_events_created_at ON mfa_events(created_at);

-- Add RLS policies for MFA events
ALTER TABLE mfa_events ENABLE ROW LEVEL SECURITY;

-- Providers can only see their own MFA events
CREATE POLICY "Providers can view own MFA events" ON mfa_events
  FOR SELECT
  USING (auth.uid() = provider_id);

-- Only system can insert MFA events (through service role)
CREATE POLICY "System can insert MFA events" ON mfa_events
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON COLUMN providers.mfa_secret IS 'Encrypted TOTP secret for 2FA';
COMMENT ON COLUMN providers.mfa_enabled IS 'Whether 2FA is enabled for this provider';
COMMENT ON COLUMN providers.mfa_backup_codes IS 'Encrypted backup codes for account recovery';
COMMENT ON COLUMN providers.mfa_setup_at IS 'When MFA was first set up';
COMMENT ON COLUMN providers.mfa_verified_at IS 'When MFA was first successfully verified';
COMMENT ON COLUMN providers.mfa_disabled_at IS 'When MFA was last disabled';
COMMENT ON TABLE mfa_events IS 'Audit trail for MFA-related events';