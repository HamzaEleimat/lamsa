-- Make password_hash nullable since we're using Supabase Auth
ALTER TABLE providers 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN providers.password_hash IS 'Legacy password hash - authentication now handled by Supabase Auth';