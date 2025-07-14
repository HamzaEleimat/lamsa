# BeautyCort Authentication Testing Guide

## Overview

This guide provides comprehensive instructions for testing the BeautyCort authentication system using the `test-auth.sh` script and manual verification procedures.

## Quick Start

```bash
# Make the script executable
chmod +x test-auth.sh

# Run with default settings (development mode)
./test-auth.sh

# Run with specific environment
API_BASE_URL="http://localhost:3001" NODE_ENV="development" ./test-auth.sh

# Run with production settings (use with caution)
API_BASE_URL="https://api.beautycort.com" NODE_ENV="production" MOCK_OTP_MODE="false" ./test-auth.sh
```

## Test Categories

### 1. Customer Authentication (CUST-001 to CUST-008)
- ✅ OTP sending to valid Jordan numbers
- ✅ Phone number format validation
- ✅ OTP verification with valid/invalid codes
- ✅ Phone number normalization (+962 format)
- ✅ OTP reuse prevention

### 2. Provider Authentication (PROV-001 to PROV-012)
- ✅ Provider signup with complete business data
- ✅ Email/phone uniqueness validation
- ✅ Password strength requirements
- ✅ Provider login with email/password
- ✅ Provider phone verification via OTP

### 3. Token Management (TOK-001 to TOK-006)
- ✅ JWT token generation and validation
- ✅ Protected endpoint access
- ✅ Token refresh mechanism
- ✅ Signout functionality

### 4. Password Recovery (PWD-001 to PWD-004)
- ✅ Forgot password flow
- ✅ Password reset with tokens
- ✅ Security-conscious error handling

### 5. Rate Limiting (RATE-001 to RATE-006)
- ✅ OTP rate limiting (3 per 15 min per phone)
- ✅ Auth rate limiting (10 per 15 min per IP)
- ✅ Rate limit header verification

### 6. Security Testing (SEC-001 to SEC-005)
- ✅ SQL injection prevention
- ✅ XSS attack prevention
- ✅ JWT token manipulation protection
- ✅ Oversized payload handling

### 7. OTP Expiration (EXP-001 to EXP-003)
- ✅ OTP lifecycle management
- ✅ Expiration behavior
- ✅ Single-use enforcement

## Test Phone Numbers

### Safe Numbers (No Real SMS)
```bash
# Jordan format test numbers
+962790000001  # Primary test number
+962780000002  # Secondary test number
+962770000003  # Tertiary test number

# Local format (will be normalized)
0790000001     # Normalizes to +962790000001
790000002      # Normalizes to +962790000002
```

### Invalid Numbers (For Error Testing)
```bash
123456789      # Too short
+962700000000  # Invalid prefix (70x not valid)
+1234567890123 # Wrong country code
notaphone      # Not a number
```

## Expected Responses

### Success Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Relevant data object
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "details": [
    // Optional validation details
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created (signup)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (auth error)
- `403` - Forbidden (verification required)
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)

## Database Verification

### Supabase Dashboard Checklist

1. **Customer Records** (`users` table)
   ```sql
   SELECT id, phone, name, created_at 
   FROM users 
   WHERE phone LIKE '+96279000000%' 
   ORDER BY created_at DESC;
   ```

2. **Provider Records** (`providers` table)
   ```sql
   SELECT id, email, business_name_en, owner_name, verified, created_at
   FROM providers 
   WHERE email LIKE '%@beautycort.test' 
   ORDER BY created_at DESC;
   ```

3. **Auth Users** (`auth.users` table)
   ```sql
   SELECT id, email, created_at, email_confirmed_at
   FROM auth.users 
   WHERE email LIKE '%@beautycort.test' 
   ORDER BY created_at DESC;
   ```

### Expected Database State

#### After Customer OTP Verification
- ✅ New record in `users` table
- ✅ Phone number normalized to +962 format
- ✅ `created_at` timestamp matches verification time
- ✅ `name` field populated if provided

#### After Provider Signup
- ✅ New record in `providers` table
- ✅ `verified` field set to `false`
- ✅ All business details stored correctly
- ✅ New record in `auth.users` table
- ✅ Email confirmation pending

#### After Provider Login
- ✅ No database changes (authentication only)
- ✅ JWT token contains correct provider ID
- ✅ Login succeeds only if `verified = true`

## Rate Limiting Verification

### OTP Rate Limits
- **Limit**: 3 requests per 15 minutes per phone number
- **Key**: Phone number
- **Response**: HTTP 429 after limit exceeded

### Auth Rate Limits
- **Limit**: 10 requests per 15 minutes per IP address
- **Key**: IP address
- **Response**: HTTP 429 after limit exceeded

### Testing Rate Limits
```bash
# Test OTP rate limiting
for i in {1..5}; do
  curl -X POST localhost:3001/api/auth/customer/send-otp \
    -H "Content-Type: application/json" \
    -d '{"phone":"+962790000099"}'
  echo "Request $i completed"
  sleep 1
done
```

## Security Testing

### SQL Injection Tests
```bash
# Phone field injection
curl -X POST localhost:3001/api/auth/customer/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"'\'''; DROP TABLE users; --"}'

# Email field injection
curl -X POST localhost:3001/api/auth/provider/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com'\'' OR 1=1 --","password":"any"}'
```

### XSS Tests
```bash
# Name field XSS
curl -X POST localhost:3001/api/auth/customer/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+962790000001","otp":"123456","name":"<script>alert(\"XSS\")</script>"}'
```

### JWT Token Tests
```bash
# Invalid token
curl -X GET localhost:3001/api/auth/me \
  -H "Authorization: Bearer invalid.token.here"

# Manipulated token
curl -X GET localhost:3001/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im1hbGljaW91cyJ9.fake"
```

## Environment Configuration

### Development Mode
```bash
export NODE_ENV="development"
export MOCK_OTP_MODE="true"
export SKIP_RATE_LIMIT="true"  # Optional
```

Features:
- Mock OTP included in responses
- Rate limiting may be disabled
- Detailed error messages
- Test phone numbers accepted

### Production Mode
```bash
export NODE_ENV="production"
export MOCK_OTP_MODE="false"
```

Features:
- Real SMS sending
- Full rate limiting
- Security-conscious error messages
- Real phone number validation

## Troubleshooting

### Common Issues

1. **API Server Not Running**
   ```
   Error: Connection refused
   Solution: Start the API server with `npm run dev`
   ```

2. **Invalid Phone Format**
   ```
   Error: Invalid Jordan phone number format
   Solution: Use format +962XXXXXXXXX or 07XXXXXXXX
   ```

3. **Rate Limit Exceeded**
   ```
   Error: Too many requests
   Solution: Wait 15 minutes or reset rate limiting
   ```

4. **Supabase Connection**
   ```
   Error: Failed to connect to Supabase
   Solution: Check SUPABASE_URL and SUPABASE_ANON_KEY
   ```

### Debug Commands

```bash
# Check API health
curl -v localhost:3001/api/health

# Check environment variables
env | grep -E "(SUPABASE|NODE_ENV|MOCK_OTP)"

# Test basic connectivity
ping localhost
telnet localhost 3001
```

## Performance Testing

### Load Testing Commands
```bash
# Apache Bench
ab -n 100 -c 10 -T application/json -p otp_payload.json \
  http://localhost:3001/api/auth/customer/send-otp

# wrk
wrk -t4 -c10 -d30s -s post.lua \
  http://localhost:3001/api/auth/customer/send-otp
```

### Metrics to Monitor
- Response time percentiles (p50, p95, p99)
- Error rates under load
- Database connection pool usage
- Memory and CPU utilization
- Rate limit effectiveness

## Cleanup

### Test Data Cleanup
```sql
-- Remove test customers
DELETE FROM users WHERE phone LIKE '+96279000000%';

-- Remove test providers
DELETE FROM providers WHERE email LIKE '%@beautycort.test';

-- Remove test auth users
DELETE FROM auth.users WHERE email LIKE '%@beautycort.test';
```

### Rate Limit Reset
```bash
# If using Redis for rate limiting
redis-cli FLUSHDB

# If using in-memory rate limiting
# Restart the API server
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Auth Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Start API server
        run: npm run dev &
        working-directory: ./beautycort-api
      - name: Wait for server
        run: sleep 10
      - name: Run auth tests
        run: ./test-auth.sh
        working-directory: ./beautycort-api
```

## Reporting Issues

When reporting authentication issues, please include:

1. **Test scenario** (e.g., CUST-001)
2. **Request details** (method, endpoint, payload)
3. **Expected response** (status code, body format)
4. **Actual response** (full response)
5. **Environment** (development/production, Node.js version)
6. **Configuration** (relevant environment variables)
7. **Database state** (before and after)

## Best Practices

### Testing Best Practices
- Always use test phone numbers in development
- Clean up test data after testing
- Test both happy path and error cases
- Verify database state changes
- Test rate limiting with multiple scenarios
- Validate security measures regularly

### Security Best Practices
- Never expose real OTPs in responses
- Always validate input on server side
- Use proper HTTP status codes
- Implement comprehensive rate limiting
- Sanitize error messages in production
- Regularly test for common vulnerabilities

### Performance Best Practices
- Monitor response times under load
- Test rate limiting effectiveness
- Verify database query performance
- Check memory usage during testing
- Test concurrent user scenarios
- Monitor SMS provider costs

This guide should be used in conjunction with the `test-auth.sh` script for comprehensive authentication system testing.
