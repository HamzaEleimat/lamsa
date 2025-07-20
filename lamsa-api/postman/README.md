# Lamsa API Postman Collection

This comprehensive Postman collection provides complete testing and documentation for the Lamsa beauty booking platform API. It includes authentication flows, complete user journeys, error handling examples, and automated testing capabilities.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Collection Structure](#collection-structure)
3. [Environment Setup](#environment-setup)
4. [Authentication](#authentication)
5. [Complete User Journeys](#complete-user-journeys)
6. [Error Handling & Testing](#error-handling--testing)
7. [Automated Testing](#automated-testing)
8. [Newman CLI Integration](#newman-cli-integration)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Postman Desktop App or Web version
- Node.js (for Newman CLI automation)
- Access to Lamsa API (development or production)

### Installation

1. **Import the Collection**
   ```bash
   # Download the collection files
   curl -O https://raw.githubusercontent.com/your-repo/lamsa-api/main/postman/Lamsa-API.postman_collection.json
   curl -O https://raw.githubusercontent.com/your-repo/lamsa-api/main/postman/environments/development.postman_environment.json
   ```

2. **Import in Postman**
   - Open Postman
   - Click "Import" → "File" → Select the collection JSON file
   - Import the environment file the same way

3. **Set Environment**
   - Select "Lamsa API - Development" from the environment dropdown
   - Update the `base_url` variable to match your API endpoint

4. **Generate Authentication Tokens**
   - Run the "Auth & Setup" folder to generate JWT tokens
   - The tokens will be automatically stored in environment variables

## Collection Structure

### 📁 Auth & Setup
Essential authentication and setup requests that should be run first:

- **Generate JWT Token (Customer)**: Creates a test customer authentication token
- **Generate JWT Token (Provider)**: Creates a test provider authentication token
- **Generate JWT Token (Admin)**: Creates a test admin authentication token

### 📁 Booking Management
Core booking operations with comprehensive validation:

- **Create Booking**: Create new bookings with full validation
- **Get Booking Details**: Retrieve booking information
- **Update Booking**: Modify booking details
- **Cancel Booking**: Cancel bookings with proper constraints
- **Reschedule Booking**: Change booking date/time with availability checks

### 📁 Provider & Service Management
Provider marketplace functionality:

- **Get Provider Profile**: Retrieve provider information
- **Search Providers by Location**: Location-based provider search
- **Get Provider Availability**: Check available time slots
- **Get Service Details**: Service information and pricing

### 📁 Complete User Journeys
End-to-end workflow demonstrations:

- **Customer Journey**: Complete booking flow from search to confirmation
- **Provider Journey**: Provider booking management workflow

### 📁 Error Handling & Edge Cases
Comprehensive error scenario testing:

- **Authentication Errors**: Invalid/missing token scenarios
- **Validation Errors**: Input validation and business rule violations
- **Rate Limiting**: Abuse prevention testing
- **Conflict Resolution**: Double booking and time slot conflicts

## Environment Setup

### Development Environment
```json
{
  "base_url": "http://localhost:3000/api",
  "environment_name": "development",
  "debug_mode": "true",
  "default_timeout": "30000",
  "performance_threshold": "2000"
}
```

### Production Environment
```json
{
  "base_url": "https://api.lamsa.com/api",
  "environment_name": "production",
  "debug_mode": "false",
  "default_timeout": "60000",
  "performance_threshold": "5000"
}
```

### Key Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | `http://localhost:3000/api` |
| `customer_token` | Customer JWT token | Auto-generated |
| `provider_token` | Provider JWT token | Auto-generated |
| `admin_token` | Admin JWT token | Auto-generated |
| `test_provider_id` | Test provider ID | `provider-test-12345` |
| `test_service_id` | Test service ID | `service-test-12345` |
| `booking_date` | Test booking date | `2024-07-25` |
| `jordanian_phone` | Test phone number | `+962791234567` |
| `arabic_customer_name` | Arabic test name | `أحمد محمد` |
| `default_language` | Default language | `ar` |
| `default_currency` | Default currency | `JOD` |
| `platform_fee_rate` | Platform fee rate | `0.08` |

## Authentication

### Token Generation
The collection includes utility requests to generate JWT tokens for testing:

```javascript
// Auto-generated customer token
const customerToken = generateJWT({
    id: "customer-test-" + randomUUID(),
    type: "customer",
    phone: "+962791234567",
    email: "customer@test.com",
    language: "ar",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
});
```

### Token Usage
All authenticated requests include the token in the Authorization header:
```
Authorization: Bearer {{customer_token}}
```

### Token Validation
The collection includes tests to verify token validity:
- Token format validation
- Expiration checking
- Role-based access control
- Invalid token handling

## Complete User Journeys

### Customer Journey: Find & Book Service

**Step 1: Search Providers**
```http
GET /providers/search?latitude=31.9454&longitude=35.9284&radius=5&category=hair
```

**Step 2: View Provider Details**
```http
GET /providers/{{journey_provider_id}}
```

**Step 3: Check Availability**
```http
GET /providers/{{journey_provider_id}}/availability?date={{booking_date}}&serviceId={{journey_service_id}}
```

**Step 4: Create Booking**
```http
POST /bookings
{
  "providerId": "{{journey_provider_id}}",
  "serviceId": "{{journey_service_id}}",
  "date": "{{booking_date}}",
  "time": "{{journey_booking_time}}",
  "notes": "خدمة ممتازة، أتطلع للزيارة",
  "paymentMethod": "cash"
}
```

**Step 5: View Confirmation**
```http
GET /bookings/{{journey_booking_id}}
```

### Provider Journey: Manage Bookings

**Step 1: View Incoming Bookings**
```http
GET /bookings?providerId={{test_provider_id}}&status=confirmed&date={{booking_date}}
```

**Step 2: Update Booking Status**
```http
PUT /bookings/{{journey_booking_id}}/status
{
  "status": "in_progress",
  "notes": "العميل وصل في الوقت المحدد"
}
```

**Step 3: Complete Service**
```http
PUT /bookings/{{journey_booking_id}}/status
{
  "status": "completed",
  "notes": "تم تقديم الخدمة بنجاح"
}
```

## Error Handling & Testing

### Authentication Errors
```javascript
// Invalid token test
pm.test("Invalid token rejected", function () {
    pm.response.to.have.status(401);
    pm.response.to.have.jsonBody("success", false);
    pm.response.to.have.jsonBody("error");
});
```

### Validation Errors
```javascript
// Phone number validation
pm.test("Invalid phone number rejected", function () {
    pm.response.to.have.status(422);
    const error = pm.response.json().error;
    pm.expect(error.code).to.equal('VALIDATION_ERROR');
    pm.expect(error.details).to.have.property('phone');
});
```

### Rate Limiting
```javascript
// Rate limit testing
pm.test("Rate limit enforced", function () {
    if (pm.response.code === 429) {
        pm.expect(pm.response.json().error.code).to.equal('RATE_LIMIT_EXCEEDED');
        pm.expect(pm.response.json().error).to.have.property('retryAfter');
    }
});
```

### Jordan-Specific Validations
```javascript
// Phone number format validation
pm.test("Phone number is in Jordanian format", function () {
    const phone = pm.response.json().data.phone;
    pm.expect(phone).to.match(/^\\+962(77|78|79)\\d{7}$/);
});

// Currency validation
pm.test("Amount is in valid JOD format", function () {
    const amount = pm.response.json().data.amount;
    pm.expect(amount).to.be.a('number');
    pm.expect(amount).to.be.at.least(0);
    pm.expect(amount).to.be.at.most(1000);
});

// Arabic content validation
pm.test("Arabic content is present", function () {
    const arabicText = pm.response.json().data.providerName;
    pm.expect(arabicText).to.match(/[\\u0600-\\u06FF]/);
});
```

## Automated Testing

### Newman CLI Integration

The collection includes a powerful Newman CLI runner script (`newman-runner.js`) that provides:

- **Environment-specific testing**: Run tests against different environments
- **Parallel execution**: Run test folders in parallel for faster execution
- **Comprehensive reporting**: Generate detailed HTML, JSON, and text reports
- **Performance monitoring**: Track response times and performance metrics
- **CI/CD integration**: Perfect for automated testing pipelines

### Installation
```bash
npm install -g newman
npm install -g newman-reporter-html
```

### Basic Usage
```bash
# Run all tests against development environment
node newman-runner.js --environment development

# Run tests in parallel with verbose output
node newman-runner.js --environment development --parallel --verbose

# Run tests with custom timeout and output directory
node newman-runner.js --environment production --timeout 60000 --output ./test-results

# Run with specific configuration
node newman-runner.js --environment development --parallel --verbose --delay 1000
```

### Command Line Options
```bash
Options:
  -e, --environment <name>    Environment to test (development, production)
  -p, --parallel             Run tests in parallel by folder
  -v, --verbose              Verbose output
  -t, --timeout <ms>         Request timeout in milliseconds
  -o, --output <dir>         Output directory for reports
  -d, --delay <ms>           Delay between requests in milliseconds
  -h, --help                 Show help message
```

### Sample Output
```
🚀 Starting Lamsa API Tests
📍 Environment: development
📊 Reporters: cli, json, html
⏱️  Timeout: 30000ms
📁 Output Directory: ./test-results

🔄 Running 5 test folders in parallel...

==========================================================
🎯 Lamsa API Test Summary
==========================================================

📊 Results:
   Total Requests: 47
   Total Assertions: 152
   Failures: 0
   Success Rate: 100%
   Duration: 12847ms

⚡ Performance:
   Average Response Time: 234ms
   95th Percentile: 456ms

✅ All tests passed successfully!
```

### Report Generation
The Newman runner generates multiple report formats:

1. **HTML Report**: Detailed visual report with charts and statistics
2. **JSON Report**: Machine-readable results for CI/CD integration
3. **Text Report**: Human-readable summary report
4. **JUnit XML**: For integration with test reporting tools

## Best Practices

### 1. Environment Management
- Always use environment variables for dynamic values
- Keep sensitive data (tokens, keys) in environment variables
- Use different environments for different stages (dev, staging, prod)

### 2. Test Organization
- Run "Auth & Setup" folder first to generate tokens
- Use the complete user journeys for integration testing
- Run error handling tests to verify proper error responses

### 3. Data Management
- Use the auto-generated test data for consistent testing
- Environment variables are automatically populated with test values
- Jordan-specific data (phone numbers, Arabic text) is pre-configured

### 4. Response Validation
- All requests include comprehensive test scripts
- Validate response structure, data types, and business rules
- Check for Jordan-specific validations (phone format, currency, Arabic content)

### 5. Performance Testing
- Monitor response times using the global test scripts
- Use the Newman runner for performance threshold validation
- Check rate limiting headers and behavior

## Troubleshooting

### Common Issues

**1. Authentication Failures**
```
Error: Invalid token rejected
Solution: Run "Generate JWT Token" requests in Auth & Setup folder
```

**2. Environment Variables Not Set**
```
Error: Missing required environment variables
Solution: Import the environment file and run setup requests
```

**3. Rate Limiting Triggered**
```
Error: Rate limit exceeded
Solution: Wait for rate limit reset or increase delays between requests
```

**4. Test Failures**
```
Error: Assertions failed
Solution: Check API server status and environment configuration
```

### Debug Mode
Enable debug mode by setting `debug_mode: "true"` in environment variables:
- Adds detailed console logging
- Shows request/response details
- Enables verbose test output

### Performance Issues
If tests are running slowly:
- Increase timeout values in environment
- Use parallel execution with Newman runner
- Check network connectivity and API server performance

### Jordan-Specific Issues
- Ensure phone numbers follow Jordan format: `+962(77|78|79)XXXXXXX`
- Use Arabic text for provider/service names in test data
- Verify currency amounts are in JOD format

## Advanced Features

### Global Pre-request Scripts
The collection includes global scripts that run before every request:
- Set common headers
- Generate request IDs for tracking
- Validate environment variables
- Generate dynamic test data

### Global Test Scripts
All requests include global validation:
- Response status validation
- Response time monitoring
- JSON structure validation
- Security headers checking
- Rate limiting validation

### Dynamic Data Generation
The collection automatically generates:
- Future dates for bookings
- Random Jordanian phone numbers
- Request IDs for tracking
- Timestamps for auditing

## Contributing

To contribute to this collection:

1. Follow the existing folder structure
2. Include comprehensive test scripts for all requests
3. Add proper descriptions for all requests
4. Update environment variables as needed
5. Test all changes with Newman CLI runner
6. Update this documentation for new features

## Support

For issues or questions:
- Check the troubleshooting section
- Review the API documentation at `/docs/API.md`
- Create an issue in the project repository
- Contact the development team

---

**Version**: 1.0  
**Last Updated**: July 15, 2024  
**Maintainer**: Lamsa Development Team