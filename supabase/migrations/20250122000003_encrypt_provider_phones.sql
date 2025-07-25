-- Migration to add encryption fields for provider PII
-- This migration adds columns to track encrypted PII status

-- Add columns to track PII encryption status if they don't exist
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS pii_encrypted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pii_encrypted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS phone_hash TEXT,
ADD COLUMN IF NOT EXISTS email_hash TEXT;

-- Create indexes on hash columns for faster lookups
CREATE INDEX IF NOT EXISTS idx_providers_phone_hash ON providers(phone_hash);
CREATE INDEX IF NOT EXISTS idx_providers_email_hash ON providers(email_hash);

-- Note: Actual encryption of existing data should be done through the API
-- using the encryptedDb.migrateUnencryptedData() method
-- This ensures proper encryption key usage and avoids storing keys in SQL

COMMENT ON COLUMN providers.pii_encrypted IS 'Indicates if PII fields have been encrypted';
COMMENT ON COLUMN providers.pii_encrypted_at IS 'Timestamp when PII was encrypted';
COMMENT ON COLUMN providers.phone_hash IS 'HMAC hash of phone number for secure lookups';
COMMENT ON COLUMN providers.email_hash IS 'HMAC hash of email for secure lookups';