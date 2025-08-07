-- Add hash columns for searchable encrypted PII fields in providers table
-- This migration ensures the columns exist for provider signup to work properly

-- Add hash columns if they don't exist
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64);

-- Create indexes for hash lookups if they don't exist
CREATE INDEX IF NOT EXISTS idx_providers_email_hash ON providers(email_hash);
CREATE INDEX IF NOT EXISTS idx_providers_phone_hash ON providers(phone_hash);

-- Add comments for documentation
COMMENT ON COLUMN providers.email_hash IS 'SHA-256 hash of email for searching encrypted data';
COMMENT ON COLUMN providers.phone_hash IS 'SHA-256 hash of phone for searching encrypted data';