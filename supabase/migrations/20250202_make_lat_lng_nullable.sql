-- Make latitude and longitude nullable for providers
ALTER TABLE providers 
ALTER COLUMN latitude DROP NOT NULL,
ALTER COLUMN longitude DROP NOT NULL;

-- Update the trigger function to handle null values
CREATE OR REPLACE FUNCTION update_provider_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
    NEW.location = ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
  ELSE
    NEW.location = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN providers.latitude IS 'Provider location latitude (optional)';
COMMENT ON COLUMN providers.longitude IS 'Provider location longitude (optional)';