# Postman Quick Start Guide

This guide helps you quickly set up and run Postman tests for the Lamsa API.

## Prerequisites

1. **API Server Must Be Running**
   ```bash
   cd /home/hamza/lamsa/lamsa-api
   npm run dev
   ```
   The server will start on the port specified in your .env file (default: 3000).

2. **Environment Variables**
   Ensure you have a `.env` file with:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`

## Available Environments

- **development** - Main development environment with comprehensive test variables
- **local** - Minimal local testing environment
- **staging** - Pre-production environment (requires different base URL)
- **production** - Production environment (requires different base URL)

Both `development` and `local` environments are configured for `localhost:3000`.

## Step-by-Step Guide

### 1. Verify Server Health
```bash
# Check if the API is running
node postman/scripts/pre-test-check.js
```

Expected output:
```
✅ API server is healthy and ready for tests!
✅ All required environment variables are set
✅ All pre-test checks passed!
```

### 2. Create Test Data
```bash
# For development environment
node postman/scripts/newman-runner.js -e development -c setup

# Or for local environment
node postman/scripts/newman-runner.js -e local -c setup
```

This creates:
- 2 test providers
- 2 test services
- 1 test customer
- Authentication tokens

### 3. Run Your Tests
```bash
# Run all tests (development environment)
node postman/scripts/newman-runner.js -e development -c all

# Or run specific collection (development environment)
node postman/scripts/newman-runner.js -e development -c bookings

# For local environment, use:
node postman/scripts/newman-runner.js -e local -c bookings
```

## Troubleshooting

### "Server not responding" Error
1. Check if the server is running: `ps aux | grep node.*server`
2. Start the server: `npm run dev`
3. Verify it's on the correct port: `curl http://localhost:3000/api/health`

### "Provider signup failed with 500" Error
1. Server is not running on the correct port
2. Database connection issues
3. Missing environment variables
4. Wrong port configuration - check your .env file has PORT=3000

Run the pre-test check to diagnose:
```bash
node postman/scripts/pre-test-check.js
```

### "Test data not found" Error
You need to run the setup collection first:
```bash
node postman/scripts/newman-runner.js -e local -c setup
```

### Port Configuration
The API uses the port specified in your `.env` file:
1. Default is PORT=3000
2. If you need a different port, update `.env`: `PORT=3001`
3. Restart the server after changing the port
4. Update Postman environments to match your port

## Test Data Reference

After setup, you'll have these test resources:

| Resource | Environment Variable | Description |
|----------|---------------------|-------------|
| Provider 1 | `test_provider_id` | Hair Salon in Abdali |
| Provider 2 | `test_provider_2_id` | Beauty Center in Sweifieh |
| Service 1 | `test_service_id` | Hair Cut (15 JOD) |
| Service 2 | `test_service_2_id` | Hair Coloring (45 JOD) |
| Customer | `test_customer_id` | Test customer account |

## Command Options

```bash
# Verbose output
node postman/scripts/newman-runner.js -e local -c bookings -v

# Stop on first failure
node postman/scripts/newman-runner.js -e local -c all --bail

# Custom timeout (milliseconds)
node postman/scripts/newman-runner.js -e local -c setup -t 60000
```

## Using Postman GUI

1. Import the collections from `postman/collections/`
2. Import the environment from `postman/environments/local.postman_environment.json`
3. Update the `base_url` to `http://localhost:3001`
4. Run collections in this order:
   - Pre-flight Checks (Health Check)
   - Test Data Setup
   - Your desired tests

## Expected Success Output

```
🚀 Starting Lamsa API Tests
📍 Environment: local
📊 Collection: setup

✅ API server is running and healthy
✅ Database connection confirmed
✅ Created test provider: [UUID]
✅ Created test provider 2: [UUID]
✅ Created test service 1: [UUID]
✅ Created test service 2: [UUID]
✅ Created test customer: [UUID]

Success Rate: 100%
```

## Next Steps

1. Review test results in `test-results/` directory
2. Use the created test data for manual testing
3. Customize test scenarios in `postman/data/booking-test-data.json`
4. Add your own test collections