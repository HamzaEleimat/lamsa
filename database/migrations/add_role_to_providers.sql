-- Add role field to providers table for admin management
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'provider';

-- Add check constraint to ensure valid roles
ALTER TABLE providers
ADD CONSTRAINT check_provider_role CHECK (role IN ('provider', 'admin', 'super_admin'));

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_providers_role ON providers(role);

-- Add comment for documentation
COMMENT ON COLUMN providers.role IS 'Provider role: provider (default), admin, super_admin';

-- Optional: Grant initial admin role to specific providers
-- UPDATE providers 
-- SET role = 'admin' 
-- WHERE email IN ('admin@lamsa.com') 
-- AND verified = true;