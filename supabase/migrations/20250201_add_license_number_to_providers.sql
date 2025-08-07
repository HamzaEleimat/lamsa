-- Add license_number column to providers table
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS license_number VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN providers.license_number IS 'Business license number for provider verification';