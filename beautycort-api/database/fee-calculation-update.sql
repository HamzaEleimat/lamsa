-- Update database fee calculation to match BeautyCort's JOD-based fee structure
-- Fee Rules:
-- - Services ≤25 JOD: 2 JOD platform fee  
-- - Services >25 JOD: 5 JOD platform fee

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS calculate_fees_before_insert ON bookings;
DROP FUNCTION IF EXISTS calculate_booking_fees();

-- Create updated function with JOD-based fee calculation
CREATE OR REPLACE FUNCTION calculate_booking_fees()
RETURNS TRIGGER AS $$
DECLARE
    low_tier_threshold DECIMAL(10,2) := 25.00; -- JOD
    low_tier_fee DECIMAL(10,2) := 2.00; -- JOD
    high_tier_fee DECIMAL(10,2) := 5.00; -- JOD
BEGIN
    -- Calculate platform fee based on service amount
    IF NEW.amount <= low_tier_threshold THEN
        NEW.platform_fee := low_tier_fee;
    ELSE
        NEW.platform_fee := high_tier_fee;
    END IF;
    
    -- Calculate provider earnings
    NEW.provider_fee := NEW.amount - NEW.platform_fee;
    
    -- Ensure provider fee is not negative
    IF NEW.provider_fee < 0 THEN
        RAISE EXCEPTION 'Platform fee (%) cannot exceed service amount (%)', NEW.platform_fee, NEW.amount;
    END IF;
    
    -- Round to 2 decimal places
    NEW.platform_fee := ROUND(NEW.platform_fee, 2);
    NEW.provider_fee := ROUND(NEW.provider_fee, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
CREATE TRIGGER calculate_fees_before_insert
    BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION calculate_booking_fees();

-- Create trigger for UPDATE operations (in case amount changes)
CREATE TRIGGER calculate_fees_before_update
    BEFORE UPDATE ON bookings
    FOR EACH ROW 
    WHEN (OLD.amount IS DISTINCT FROM NEW.amount)
    EXECUTE FUNCTION calculate_booking_fees();

-- Add comment explaining the fee structure
COMMENT ON FUNCTION calculate_booking_fees() IS 
'Calculates platform and provider fees based on BeautyCort fee structure:
- Services ≤25 JOD: 2 JOD platform fee
- Services >25 JOD: 5 JOD platform fee
Provider earnings = Service amount - Platform fee';

-- Create helper function to preview fee calculation without creating booking
CREATE OR REPLACE FUNCTION preview_booking_fees(service_amount DECIMAL(10,2))
RETURNS TABLE(
    amount DECIMAL(10,2),
    platform_fee DECIMAL(10,2),
    provider_fee DECIMAL(10,2),
    fee_percentage DECIMAL(5,2)
) AS $$
DECLARE
    low_tier_threshold DECIMAL(10,2) := 25.00;
    low_tier_fee DECIMAL(10,2) := 2.00;
    high_tier_fee DECIMAL(10,2) := 5.00;
    calculated_platform_fee DECIMAL(10,2);
    calculated_provider_fee DECIMAL(10,2);
BEGIN
    -- Validate input
    IF service_amount <= 0 THEN
        RAISE EXCEPTION 'Service amount must be positive';
    END IF;
    
    -- Calculate fees
    IF service_amount <= low_tier_threshold THEN
        calculated_platform_fee := low_tier_fee;
    ELSE
        calculated_platform_fee := high_tier_fee;
    END IF;
    
    calculated_provider_fee := service_amount - calculated_platform_fee;
    
    -- Validate calculation
    IF calculated_provider_fee < 0 THEN
        RAISE EXCEPTION 'Platform fee (%) would exceed service amount (%)', calculated_platform_fee, service_amount;
    END IF;
    
    -- Return results
    RETURN QUERY SELECT 
        ROUND(service_amount, 2),
        ROUND(calculated_platform_fee, 2),
        ROUND(calculated_provider_fee, 2),
        ROUND((calculated_platform_fee / service_amount * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM preview_booking_fees(20.00); -- Should return 2 JOD fee
-- SELECT * FROM preview_booking_fees(30.00); -- Should return 5 JOD fee