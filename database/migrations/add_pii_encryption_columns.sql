-- Add hash columns for searchable encrypted PII fields

-- Users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64);

-- Create indexes for hash lookups
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phone_hash);

-- Providers table
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64);

-- Create indexes for hash lookups
CREATE INDEX IF NOT EXISTS idx_providers_email_hash ON providers(email_hash);
CREATE INDEX IF NOT EXISTS idx_providers_phone_hash ON providers(phone_hash);

-- Add encryption metadata columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pii_encrypted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pii_encrypted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE providers
ADD COLUMN IF NOT EXISTS pii_encrypted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pii_encrypted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS pii_encrypted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pii_encrypted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS pii_encrypted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pii_encrypted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS pii_encrypted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pii_encrypted_at TIMESTAMP WITH TIME ZONE;

-- Update column types to support encrypted data (larger size)
-- Encrypted data is approximately 2.5x larger than original
ALTER TABLE users
ALTER COLUMN name TYPE VARCHAR(500),
ALTER COLUMN email TYPE VARCHAR(500);

ALTER TABLE providers
ALTER COLUMN owner_name TYPE VARCHAR(500),
ALTER COLUMN email TYPE VARCHAR(500),
ALTER COLUMN phone TYPE VARCHAR(200),
ALTER COLUMN address TYPE TEXT,
ALTER COLUMN bank_account_number TYPE VARCHAR(500);

ALTER TABLE bookings
ALTER COLUMN customer_notes TYPE TEXT,
ALTER COLUMN provider_notes TYPE TEXT;

ALTER TABLE payments
ALTER COLUMN card_last_four TYPE VARCHAR(100),
ALTER COLUMN receipt_url TYPE TEXT;

-- Add comments
COMMENT ON COLUMN users.email_hash IS 'SHA-256 hash of email for searching encrypted data';
COMMENT ON COLUMN users.phone_hash IS 'SHA-256 hash of phone for searching encrypted data';
COMMENT ON COLUMN users.pii_encrypted IS 'Flag indicating if PII fields are encrypted';
COMMENT ON COLUMN users.pii_encrypted_at IS 'Timestamp when PII was encrypted';

COMMENT ON COLUMN providers.email_hash IS 'SHA-256 hash of email for searching encrypted data';
COMMENT ON COLUMN providers.phone_hash IS 'SHA-256 hash of phone for searching encrypted data';
COMMENT ON COLUMN providers.pii_encrypted IS 'Flag indicating if PII fields are encrypted';
COMMENT ON COLUMN providers.pii_encrypted_at IS 'Timestamp when PII was encrypted';

-- Create function to validate encryption status
CREATE OR REPLACE FUNCTION check_pii_encryption_status()
RETURNS TABLE (
  table_name TEXT,
  total_records BIGINT,
  encrypted_records BIGINT,
  unencrypted_records BIGINT,
  encryption_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'users'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE pii_encrypted = true)::BIGINT,
    COUNT(*) FILTER (WHERE pii_encrypted = false OR pii_encrypted IS NULL)::BIGINT,
    ROUND((COUNT(*) FILTER (WHERE pii_encrypted = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2)
  FROM users
  
  UNION ALL
  
  SELECT 
    'providers'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE pii_encrypted = true)::BIGINT,
    COUNT(*) FILTER (WHERE pii_encrypted = false OR pii_encrypted IS NULL)::BIGINT,
    ROUND((COUNT(*) FILTER (WHERE pii_encrypted = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2)
  FROM providers
  
  UNION ALL
  
  SELECT 
    'bookings'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE pii_encrypted = true)::BIGINT,
    COUNT(*) FILTER (WHERE pii_encrypted = false OR pii_encrypted IS NULL)::BIGINT,
    ROUND((COUNT(*) FILTER (WHERE pii_encrypted = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2)
  FROM bookings
  
  UNION ALL
  
  SELECT 
    'reviews'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE pii_encrypted = true)::BIGINT,
    COUNT(*) FILTER (WHERE pii_encrypted = false OR pii_encrypted IS NULL)::BIGINT,
    ROUND((COUNT(*) FILTER (WHERE pii_encrypted = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2)
  FROM reviews
  
  UNION ALL
  
  SELECT 
    'payments'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE pii_encrypted = true)::BIGINT,
    COUNT(*) FILTER (WHERE pii_encrypted = false OR pii_encrypted IS NULL)::BIGINT,
    ROUND((COUNT(*) FILTER (WHERE pii_encrypted = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2)
  FROM payments;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_pii_encryption_status() TO authenticated;