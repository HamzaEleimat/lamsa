# Test Data Setup Guide

This guide explains how to include and use test data in your Postman collections for the Lamsa API.

## Quick Start

1. **Run Test Data Setup First**
   ```bash
   # Using Newman CLI
   newman run postman/collections/setup/Test-Data-Setup.postman_collection.json \
     -e postman/environments/local.postman_environment.json

   # Or using the runner script
   node postman/scripts/newman-runner.js -e local -c setup
   ```

2. **Run Your Tests**
   ```bash
   # Run booking tests with pre-populated test data
   node postman/scripts/newman-runner.js -e local -c bookings
   ```

## What Gets Created

The Test Data Setup collection creates:

- **2 Test Providers** (auto-approved in development)
  - Provider 1: Hair Salon in Abdali
  - Provider 2: Beauty Center in Sweifieh
  
- **2 Test Services**
  - Service 1: Hair Cut (15 JOD) - triggers 2 JOD platform fee
  - Service 2: Hair Coloring (45 JOD) - triggers 5 JOD platform fee
  
- **1 Test Customer**
  - With valid Jordanian phone number
  - Pre-verified for immediate use

## Environment Variables Set

After running the setup, these variables are available:

```javascript
// Provider IDs
test_provider_id      // Primary test provider
test_provider_2_id    // Secondary test provider

// Service IDs  
test_service_id       // Hair Cut service (15 JOD)
test_service_2_id     // Hair Coloring service (45 JOD)

// Customer data
test_customer_id      // Test customer ID
customer_token        // Valid JWT token for customer

// Dynamic data (regenerated on each request)
booking_date          // 3 days in future
booking_time          // Random business hours time
random_jordan_phone   // Valid Jordanian phone number
```

## Using Test Data in Requests

### Example: Create Booking Request

```json
{
  "providerId": "{{test_provider_id}}",
  "serviceId": "{{test_service_id}}",
  "date": "{{booking_date}}",
  "time": "{{booking_time}}",
  "paymentMethod": "cash",
  "notes": "Test booking from Postman"
}
```

## Pre-request Scripts

The booking collection includes pre-request scripts that:

1. **Validate Test Data Exists**
   - Checks for required provider/service IDs
   - Throws error if setup hasn't been run

2. **Generate Dynamic Data**
   - Sets booking date (3 days future)
   - Sets random booking time
   - Generates test phone numbers

3. **Handle Authentication**
   - Validates JWT tokens
   - Auto-refreshes expired tokens
   - Uses stored credentials

## Data-Driven Testing

Use the included test data file for comprehensive testing:

```bash
# Run bookings with multiple test scenarios
newman run postman/collections/bookings/Booking-Management.postman_collection.json \
  -e postman/environments/local.postman_environment.json \
  -d postman/data/booking-test-data.json
```

### Test Data Scenarios

The `booking-test-data.json` includes:
- Standard vs Premium service bookings
- Different time slots (morning/evening)
- Various booking days ahead
- Arabic notes testing
- Long notes validation
- Alternative provider testing

## Troubleshooting

### "Test data not found" Error
Run the Test Data Setup collection first:
```bash
node postman/scripts/newman-runner.js -e local -c setup
```

### "Invalid token" Error
The setup collection creates tokens automatically. If expired:
1. Re-run the setup collection, OR
2. The pre-request scripts will auto-refresh

### "Provider not active" Error
In development, providers are auto-approved. In other environments, you may need to manually activate providers.

## Best Practices

1. **Always Run Setup First**
   - Include setup in your CI/CD pipeline
   - Run before any test suite

2. **Use Environment Variables**
   - Never hardcode IDs
   - Use `{{test_provider_id}}` not actual UUIDs

3. **Clean Up Test Data**
   - Consider adding cleanup collection
   - Useful for CI/CD environments

4. **Monitor Token Expiry**
   - Tokens expire after 1 hour
   - Pre-request scripts handle refresh

## Integration with CI/CD

```yaml
# Example GitHub Actions
- name: Setup Test Data
  run: node postman/scripts/newman-runner.js -e ${{ matrix.env }} -c setup

- name: Run API Tests
  run: node postman/scripts/newman-runner.js -e ${{ matrix.env }} -c all
```

## Advanced Usage

### Custom Test Data
Edit `postman/data/booking-test-data.json` to add scenarios:

```json
{
  "test_name": "Your Custom Test",
  "service_type": "standard",
  "payment_method": "card",
  "notes": "Custom test scenario",
  "expected_platform_fee": 2.00
}
```

### Environment-Specific Setup
The setup collection respects environment settings:
- Development: Auto-approves providers
- Staging/Production: Creates pending providers

### Parallel Testing
Test data includes multiple providers/services to support parallel execution without conflicts.