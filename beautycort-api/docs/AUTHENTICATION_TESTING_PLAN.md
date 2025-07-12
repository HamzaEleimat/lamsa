# Authentication System Testing Plan

## Overview

This document provides a comprehensive testing plan for the BeautyCort authentication system, including test scenarios, curl commands, expected responses, and verification procedures.

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Test Phone Numbers](#test-phone-numbers)
3. [Test Scenarios Matrix](#test-scenarios-matrix)
4. [Curl Commands Library](#curl-commands-library)
5. [Expected Responses](#expected-responses)
6. [Rate Limiting Tests](#rate-limiting-tests)
7. [OTP Expiration Tests](#otp-expiration-tests)
8. [Database Verification](#database-verification)
9. [Supabase Dashboard Checklist](#supabase-dashboard-checklist)
10. [Security Testing](#security-testing)

## Test Environment Setup

### Environment Variables
```bash
# Set these before running tests
export API_BASE_URL="http://localhost:3000"
export NODE_ENV="development"
export MOCK_OTP_MODE="true"

# For production testing (use with caution)
export NODE_ENV="production"
export MOCK_OTP_MODE="false"
```

### Headers Template
```bash
# Common headers for all requests
HEADERS='-H "Content-Type: application/json" -H "Accept: application/json"'
```

## Test Phone Numbers

### Safe Test Numbers (No Real SMS)

**Jordan Format (for development with mock OTP):**
```bash
# Valid Jordan mobile numbers (won't send real SMS in dev mode)
JORDAN_PHONE_1="+962790000001"
JORDAN_PHONE_2="+962780000002"
JORDAN_PHONE_3="+962770000003"

# Alternative formats (should normalize to +962 format)
JORDAN_LOCAL_1="0790000001"
JORDAN_LOCAL_2="790000002"
```

**International Test Numbers (for development):**
```bash
# US test numbers (recognized by system as test numbers)
US_TEST_PHONE="+15551234567"
# Spain test numbers
SPAIN_TEST_PHONE="+34612345678"
```

### Invalid Phone Numbers (for error testing)
```bash
INVALID_PHONE_1="123456789"        # Too short
INVALID_PHONE_2="+962700000000"    # Invalid prefix (70)
INVALID_PHONE_3="+1234567890123"   # Wrong country
INVALID_PHONE_4="notaphone"        # Not a number
```

## Test Scenarios Matrix

### Customer Authentication Flow

| Test Case | Scenario | Expected Result | Status Code |
|-----------|----------|----------------|-------------|
| CUST-001 | Send OTP to new Jordan number | OTP sent, test OTP returned in dev mode | 200 |
| CUST-002 | Send OTP to existing Jordan number | OTP sent to existing customer | 200 |
| CUST-003 | Send OTP with invalid phone format | Validation error | 400 |
| CUST-004 | Send OTP with missing phone | Missing field error | 400 |
| CUST-005 | Verify OTP with correct code | Customer created/logged in, JWT returned | 200 |
| CUST-006 | Verify OTP with wrong code | Invalid OTP error | 400 |
| CUST-007 | Verify OTP with expired code | Expired OTP error | 400 |
| CUST-008 | Verify OTP with missing fields | Validation error | 400 |

### Provider Authentication Flow

| Test Case | Scenario | Expected Result | Status Code |
|-----------|----------|----------------|-------------|
| PROV-001 | Signup with valid data | Provider created, JWT returned | 201 |
| PROV-002 | Signup with duplicate email | Email exists error | 409 |
| PROV-003 | Signup with duplicate phone | Phone exists error | 409 |
| PROV-004 | Signup with invalid email | Validation error | 400 |
| PROV-005 | Signup with weak password | Validation error | 400 |
| PROV-006 | Signup with missing required fields | Validation error | 400 |
| PROV-007 | Login with valid credentials | JWT returned | 200 |
| PROV-008 | Login with invalid email | Authentication error | 401 |
| PROV-009 | Login with wrong password | Authentication error | 401 |
| PROV-010 | Login with unverified account | Verification required error | 403 |

### Token Management

| Test Case | Scenario | Expected Result | Status Code |
|-----------|----------|----------------|-------------|
| TOK-001 | Refresh valid token | New JWT returned | 200 |
| TOK-002 | Refresh expired token | Invalid token error | 401 |
| TOK-003 | Refresh malformed token | Invalid token error | 401 |
| TOK-004 | Logout with valid session | Success message | 200 |

## Curl Commands Library

### Customer OTP Flow

#### 1. Send OTP to Customer
```bash
# Test Case CUST-001: Send OTP to new Jordan number
curl -X POST ${API_BASE_URL}/auth/customer/send-otp \
  ${HEADERS} \
  -d '{
    "phone": "'+${JORDAN_PHONE_1}+'"
  }'

# Test Case CUST-003: Invalid phone format
curl -X POST ${API_BASE_URL}/auth/customer/send-otp \
  ${HEADERS} \
  -d '{
    "phone": "'+${INVALID_PHONE_1}+'"
  }'

# Test Case CUST-004: Missing phone
curl -X POST ${API_BASE_URL}/auth/customer/send-otp \
  ${HEADERS} \
  -d '{}'
```

#### 2. Verify OTP
```bash
# Test Case CUST-005: Valid OTP (use testOTP from previous response)
curl -X POST ${API_BASE_URL}/auth/verify-otp \
  ${HEADERS} \
  -d '{
    "phone": "'+${JORDAN_PHONE_1}+'",
    "otp": "123456",
    "name": "Test Customer"
  }'

# Test Case CUST-006: Invalid OTP
curl -X POST ${API_BASE_URL}/auth/verify-otp \
  ${HEADERS} \
  -d '{
    "phone": "'+${JORDAN_PHONE_1}+'",
    "otp": "000000"
  }'

# Test Case CUST-008: Missing required fields
curl -X POST ${API_BASE_URL}/auth/verify-otp \
  ${HEADERS} \
  -d '{
    "phone": "'+${JORDAN_PHONE_1}+'"
  }'
```

### Provider Authentication

#### 1. Provider Signup
```bash
# Test Case PROV-001: Valid provider signup
curl -X POST ${API_BASE_URL}/auth/provider/signup \
  ${HEADERS} \
  -d '{
    "email": "provider1@test.com",
    "password": "SecurePass123",
    "phone": "'+${JORDAN_PHONE_2}+'",
    "business_name_ar": "صالون الجمال",
    "business_name_en": "Beauty Salon",
    "owner_name": "Ahmed Ali",
    "latitude": 31.9454,
    "longitude": 35.9284,
    "address": {
      "street": "Al-Malek Hussein Street",
      "city": "Amman",
      "district": "Abdoun",
      "country": "Jordan"
    },
    "license_number": "BS123456"
  }'

# Test Case PROV-002: Duplicate email
curl -X POST ${API_BASE_URL}/auth/provider/signup \
  ${HEADERS} \
  -d '{
    "email": "provider1@test.com",
    "password": "AnotherPass123",
    "phone": "'+${JORDAN_PHONE_3}+'",
    "business_name_ar": "صالون آخر",
    "business_name_en": "Another Salon",
    "owner_name": "Sara Ahmed",
    "latitude": 31.9454,
    "longitude": 35.9284,
    "address": {
      "street": "Rainbow Street",
      "city": "Amman",
      "district": "Jabal Amman",
      "country": "Jordan"
    }
  }'

# Test Case PROV-004: Invalid email
curl -X POST ${API_BASE_URL}/auth/provider/signup \
  ${HEADERS} \
  -d '{
    "email": "invalid-email",
    "password": "SecurePass123",
    "phone": "'+${JORDAN_PHONE_2}+'",
    "business_name_ar": "صالون الجمال",
    "business_name_en": "Beauty Salon",
    "owner_name": "Ahmed Ali",
    "latitude": 31.9454,
    "longitude": 35.9284,
    "address": {
      "street": "Al-Malek Hussein Street",
      "city": "Amman",
      "district": "Abdoun",
      "country": "Jordan"
    }
  }'

# Test Case PROV-005: Weak password
curl -X POST ${API_BASE_URL}/auth/provider/signup \
  ${HEADERS} \
  -d '{
    "email": "provider2@test.com",
    "password": "123",
    "phone": "'+${JORDAN_PHONE_2}+'",
    "business_name_ar": "صالون الجمال",
    "business_name_en": "Beauty Salon",
    "owner_name": "Ahmed Ali",
    "latitude": 31.9454,
    "longitude": 35.9284,
    "address": {
      "street": "Al-Malek Hussein Street",
      "city": "Amman",
      "district": "Abdoun",
      "country": "Jordan"
    }
  }'
```

#### 2. Provider Login
```bash
# Test Case PROV-007: Valid login
curl -X POST ${API_BASE_URL}/auth/provider/login \
  ${HEADERS} \
  -d '{
    "email": "provider1@test.com",
    "password": "SecurePass123"
  }'

# Test Case PROV-008: Invalid email
curl -X POST ${API_BASE_URL}/auth/provider/login \
  ${HEADERS} \
  -d '{
    "email": "nonexistent@test.com",
    "password": "SecurePass123"
  }'

# Test Case PROV-009: Wrong password
curl -X POST ${API_BASE_URL}/auth/provider/login \
  ${HEADERS} \
  -d '{
    "email": "provider1@test.com",
    "password": "WrongPassword"
  }'
```

### Token Management

#### 1. Refresh Token
```bash
# Test Case TOK-001: Refresh valid token
# First, get a token from login, then:
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Replace with actual token

curl -X POST ${API_BASE_URL}/auth/refresh \
  ${HEADERS} \
  -d '{
    "refreshToken": "'+${JWT_TOKEN}+'"
  }'

# Test Case TOK-002: Refresh expired token
curl -X POST ${API_BASE_URL}/auth/refresh \
  ${HEADERS} \
  -d '{
    "refreshToken": "expired.token.here"
  }'

# Test Case TOK-003: Malformed token
curl -X POST ${API_BASE_URL}/auth/refresh \
  ${HEADERS} \
  -d '{
    "refreshToken": "invalid-token-format"
  }'
```

#### 2. Logout
```bash
# Test Case TOK-004: Logout
curl -X POST ${API_BASE_URL}/auth/logout \
  ${HEADERS} \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

### Password Recovery

```bash
# Forgot password
curl -X POST ${API_BASE_URL}/auth/provider/forgot-password \
  ${HEADERS} \
  -d '{
    "email": "provider1@test.com"
  }'

# Reset password
curl -X POST ${API_BASE_URL}/auth/provider/reset-password \
  ${HEADERS} \
  -d '{
    "token": "reset-token-here-32-chars-minimum",
    "newPassword": "NewSecurePass123"
  }'
```

## Expected Responses

### Success Responses

#### OTP Send Success
```json
{
  "success": true,
  "message": "OTP sent successfully to +962790000001",
  "data": {
    "phone": "+962790000001",
    "testOTP": "123456",
    "testMode": true,
    "warning": "OTP included for testing only - never do this in production!"
  }
}
```

#### OTP Verification Success
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone": "+962790000001",
      "name": "Test Customer",
      "language": "en",
      "created_at": "2025-01-12T15:32:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "customer"
  }
}
```

#### Provider Signup Success
```json
{
  "success": true,
  "message": "Provider account created successfully. Pending verification.",
  "data": {
    "provider": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "business_name_ar": "صالون الجمال",
      "business_name_en": "Beauty Salon",
      "owner_name": "Ahmed Ali",
      "phone": "+962780000002",
      "email": "provider1@test.com",
      "verified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "provider"
  }
}
```

#### Provider Login Success
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "provider": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "business_name_ar": "صالون الجمال",
      "business_name_en": "Beauty Salon",
      "owner_name": "Ahmed Ali",
      "phone": "+962780000002",
      "email": "provider1@test.com",
      "rating": 4.5,
      "total_reviews": 23
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "provider"
  }
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format. Please use Jordan format (e.g., 0791234567)",
    "details": [
      {
        "field": "phone",
        "message": "Invalid phone number format"
      }
    ]
  }
}
```

#### Authentication Error (401)
```json
{
  "success": false,
  "error": {
    "code": "AUTH_ERROR",
    "message": "Invalid email or password"
  }
}
```

#### Resource Conflict (409)
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Email already registered"
  }
}
```

#### Rate Limit Error (429)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 15 minutes",
    "retryAfter": 900
  }
}
```

## Rate Limiting Tests

### Setup Rate Limiting Test Script
```bash
#!/bin/bash
# test-rate-limits.sh

API_BASE_URL="http://localhost:3000"
PHONE="+962790000001"

echo "Testing OTP rate limiting..."
for i in {1..10}; do
  echo "Request $i:"
  curl -s -X POST ${API_BASE_URL}/auth/customer/send-otp \
    -H "Content-Type: application/json" \
    -d '{"phone":"'${PHONE}'"}' | jq '.success, .error.code, .error.retryAfter'
  sleep 1
done
```

### Expected Rate Limiting Behavior
- **OTP Requests**: Max 3 per hour per phone number
- **OTP Verification**: Max 5 attempts per 10 minutes
- **Provider Login**: Max 5 attempts per 15 minutes per IP
- **After Limit**: HTTP 429 with `retryAfter` in seconds

### Rate Limit Test Cases
```bash
# Test Case RATE-001: OTP send rate limit
for i in {1..5}; do
  curl -X POST ${API_BASE_URL}/auth/customer/send-otp \
    ${HEADERS} \
    -d '{"phone":"'+${JORDAN_PHONE_1}+'"}'
  echo "--- Request $i completed ---"
done

# Test Case RATE-002: OTP verification rate limit
for i in {1..7}; do
  curl -X POST ${API_BASE_URL}/auth/verify-otp \
    ${HEADERS} \
    -d '{"phone":"'+${JORDAN_PHONE_1}+'","otp":"000000"}'
  echo "--- Verification attempt $i ---"
done

# Test Case RATE-003: Provider login rate limit
for i in {1..7}; do
  curl -X POST ${API_BASE_URL}/auth/provider/login \
    ${HEADERS} \
    -d '{"email":"test@test.com","password":"wrongpass"}'
  echo "--- Login attempt $i ---"
done
```

## OTP Expiration Tests

### OTP Expiration Test Procedure

1. **Send OTP and Wait**
```bash
# Send OTP
curl -X POST ${API_BASE_URL}/auth/customer/send-otp \
  ${HEADERS} \
  -d '{"phone":"'+${JORDAN_PHONE_1}+'"}'

# Wait for expiration (default: 5 minutes in production, configurable in dev)
# For testing, you can modify the expiration time in mock-otp.ts

# Try to verify expired OTP
curl -X POST ${API_BASE_URL}/auth/verify-otp \
  ${HEADERS} \
  -d '{"phone":"'+${JORDAN_PHONE_1}+'","otp":"123456"}'
```

2. **Test OTP Invalidation After Use**
```bash
# Send OTP
RESPONSE=$(curl -s -X POST ${API_BASE_URL}/auth/customer/send-otp \
  ${HEADERS} \
  -d '{"phone":"'+${JORDAN_PHONE_1}+'"}')

# Extract test OTP
TEST_OTP=$(echo $RESPONSE | jq -r '.data.testOTP')

# Use OTP successfully
curl -X POST ${API_BASE_URL}/auth/verify-otp \
  ${HEADERS} \
  -d '{"phone":"'+${JORDAN_PHONE_1}+'","otp":"'${TEST_OTP}'"}'

# Try to reuse the same OTP (should fail)
curl -X POST ${API_BASE_URL}/auth/verify-otp \
  ${HEADERS} \
  -d '{"phone":"'+${JORDAN_PHONE_1}+'","otp":"'${TEST_OTP}'"}'
```

## Database Verification

### Expected Database Changes

#### After Customer OTP Send
- **No database changes** (OTP stored in memory/Redis)
- Check logs for OTP generation

#### After Customer OTP Verification (New User)
```sql
-- New record in users table
SELECT id, phone, name, created_at 
FROM users 
WHERE phone = '+962790000001'
ORDER BY created_at DESC 
LIMIT 1;
```

#### After Provider Signup
```sql
-- New record in providers table
SELECT id, email, business_name_en, owner_name, verified, created_at
FROM providers 
WHERE email = 'provider1@test.com';

-- Check Supabase auth.users table
SELECT id, email, created_at, email_confirmed_at
FROM auth.users 
WHERE email = 'provider1@test.com';
```

#### After Provider Login
- **No database changes** (authentication only)
- Check audit logs if implemented

## Supabase Dashboard Checklist

### Pre-Testing Setup

1. **Access Supabase Dashboard**
   - URL: `https://app.supabase.com/project/[project-id]`
   - Navigate to: Table Editor

2. **Prepare Test Data Views**
   - Open `users` table
   - Open `providers` table
   - Open `auth.users` table (Authentication > Users)

3. **Enable Real-time Updates**
   - Refresh tables after each test
   - Use filters to find test data quickly

### During Testing Verification

#### Customer OTP Flow Verification
1. **After Send OTP**
   - ✅ No new records in `users` table
   - ✅ Check API logs for OTP generation
   - ✅ In dev mode: testOTP included in response

2. **After OTP Verification (New Customer)**
   - ✅ New record in `users` table with correct phone
   - ✅ `created_at` timestamp matches test time
   - ✅ `name` field populated if provided

3. **After OTP Verification (Existing Customer)**
   - ✅ No duplicate record created
   - ✅ Existing record unchanged
   - ✅ JWT token contains correct user ID

#### Provider Flow Verification
1. **After Provider Signup**
   - ✅ New record in `providers` table
   - ✅ `verified` field set to `false`
   - ✅ All business details stored correctly
   - ✅ New record in `auth.users` table
   - ✅ Email confirmation pending

2. **After Provider Login**
   - ✅ No database changes
   - ✅ JWT token contains provider ID
   - ✅ Login only succeeds if `verified = true`

### Data Cleanup After Testing
```sql
-- Clean up test data
DELETE FROM users WHERE phone LIKE '+962790000%';
DELETE FROM providers WHERE email LIKE '%@test.com';

-- Clean up Supabase auth (use dashboard or SQL)
DELETE FROM auth.users WHERE email LIKE '%@test.com';
```

## Security Testing

### JWT Token Testing

1. **Token Structure Validation**
```bash
# Decode JWT token (header and payload only)
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo $JWT_TOKEN | cut -d. -f1 | base64 -d | jq  # Header
echo $JWT_TOKEN | cut -d. -f2 | base64 -d | jq  # Payload
```

2. **Token Manipulation Tests**
```bash
# Test with modified token
MODIFIED_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im1hbGljaW91cyJ9.signature"
curl -X GET ${API_BASE_URL}/protected-endpoint \
  -H "Authorization: Bearer ${MODIFIED_TOKEN}"

# Test with no signature
NO_SIG_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InZhbGlkLWlkIn0."
curl -X GET ${API_BASE_URL}/protected-endpoint \
  -H "Authorization: Bearer ${NO_SIG_TOKEN}"
```

### Input Validation Testing

1. **SQL Injection Attempts**
```bash
# Test SQL injection in phone field
curl -X POST ${API_BASE_URL}/auth/customer/send-otp \
  ${HEADERS} \
  -d '{"phone":"'+962790000001'; DROP TABLE users; --'"}'

# Test SQL injection in email field
curl -X POST ${API_BASE_URL}/auth/provider/login \
  ${HEADERS} \
  -d '{"email":"admin@test.com'\'' OR 1=1 --","password":"any"}'
```

2. **XSS Attempts**
```bash
# Test XSS in name field
curl -X POST ${API_BASE_URL}/auth/verify-otp \
  ${HEADERS} \
  -d '{"phone":"'+${JORDAN_PHONE_1}+'","otp":"123456","name":"<script>alert(\"XSS\")</script>"}'
```

3. **Payload Size Testing**
```bash
# Test oversized payloads
LARGE_STRING=$(python3 -c "print('A' * 10000)")
curl -X POST ${API_BASE_URL}/auth/verify-otp \
  ${HEADERS} \
  -d '{"phone":"'+${JORDAN_PHONE_1}+'","otp":"123456","name":"'${LARGE_STRING}'"}'
```

## Automated Testing Script

### Complete Test Suite
```bash
#!/bin/bash
# complete-auth-test.sh

set -e  # Exit on any error

API_BASE_URL="http://localhost:3000"
JORDAN_PHONE="+962790000001"
PROVIDER_EMAIL="testprovider@test.com"
PROVIDER_PASSWORD="SecureTest123"

echo "🚀 Starting BeautyCort Authentication Tests"
echo "============================================"

# Test 1: Customer OTP Flow
echo "📱 Testing Customer OTP Flow..."
OTP_RESPONSE=$(curl -s -X POST ${API_BASE_URL}/auth/customer/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"'${JORDAN_PHONE}'"}')

echo "OTP Response: $OTP_RESPONSE"

if echo "$OTP_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ OTP send successful"
  TEST_OTP=$(echo "$OTP_RESPONSE" | jq -r '.data.testOTP // "123456"')
  
  # Verify OTP
  VERIFY_RESPONSE=$(curl -s -X POST ${API_BASE_URL}/auth/verify-otp \
    -H "Content-Type: application/json" \
    -d '{"phone":"'${JORDAN_PHONE}'","otp":"'${TEST_OTP}'","name":"Test Customer"}')
  
  if echo "$VERIFY_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ OTP verification successful"
    CUSTOMER_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.data.token')
  else
    echo "❌ OTP verification failed"
    echo "$VERIFY_RESPONSE"
  fi
else
  echo "❌ OTP send failed"
  echo "$OTP_RESPONSE"
fi

# Test 2: Provider Signup
echo ""
echo "🏢 Testing Provider Signup..."
SIGNUP_RESPONSE=$(curl -s -X POST ${API_BASE_URL}/auth/provider/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'${PROVIDER_EMAIL}'",
    "password": "'${PROVIDER_PASSWORD}'",
    "phone": "+962780000002",
    "business_name_ar": "صالون الجمال",
    "business_name_en": "Test Beauty Salon",
    "owner_name": "Test Owner",
    "latitude": 31.9454,
    "longitude": 35.9284,
    "address": {
      "street": "Test Street",
      "city": "Amman",
      "district": "Test District",
      "country": "Jordan"
    }
  }')

if echo "$SIGNUP_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ Provider signup successful"
  PROVIDER_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.token')
else
  echo "❌ Provider signup failed"
  echo "$SIGNUP_RESPONSE"
fi

# Test 3: Provider Login
echo ""
echo "🔐 Testing Provider Login..."
LOGIN_RESPONSE=$(curl -s -X POST ${API_BASE_URL}/auth/provider/login \
  -H "Content-Type: application/json" \
  -d '{"email":"'${PROVIDER_EMAIL}'","password":"'${PROVIDER_PASSWORD}'"}')

if echo "$LOGIN_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ Provider login successful"
else
  echo "❌ Provider login failed (this might be expected if verification is required)"
  echo "$LOGIN_RESPONSE"
fi

# Test 4: Error Cases
echo ""
echo "🚫 Testing Error Cases..."

# Invalid phone format
INVALID_PHONE_RESPONSE=$(curl -s -X POST ${API_BASE_URL}/auth/customer/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"invalid"}')

if echo "$INVALID_PHONE_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "❌ Invalid phone test failed - should have returned error"
else
  echo "✅ Invalid phone correctly rejected"
fi

# Duplicate email
DUPLICATE_RESPONSE=$(curl -s -X POST ${API_BASE_URL}/auth/provider/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"'${PROVIDER_EMAIL}'","password":"Different123","phone":"+962770000003","business_name_ar":"مختلف","business_name_en":"Different","owner_name":"Different","latitude":31.9454,"longitude":35.9284,"address":{"street":"Different","city":"Amman","district":"Different","country":"Jordan"}}')

if echo "$DUPLICATE_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "❌ Duplicate email test failed - should have returned error"
else
  echo "✅ Duplicate email correctly rejected"
fi

echo ""
echo "🎉 Authentication tests completed!"
echo "Check the responses above for any failures."
```

## Test Execution Checklist

### Pre-Test Setup
- [ ] API server running on correct port
- [ ] Environment variables set correctly
- [ ] Test database/environment isolated
- [ ] Supabase dashboard accessible

### During Testing
- [ ] Run individual curl commands
- [ ] Verify responses match expected format
- [ ] Check database state after each operation
- [ ] Monitor server logs for errors
- [ ] Verify JWT token structure and claims

### Post-Test Cleanup
- [ ] Clean up test data from database
- [ ] Reset any rate limiting counters
- [ ] Document any issues found
- [ ] Update test cases based on findings

### Error Investigation
- [ ] Check server logs for detailed error messages
- [ ] Verify network connectivity
- [ ] Confirm API endpoints are correct
- [ ] Check environment variable configuration
- [ ] Validate JSON request format

## Troubleshooting Common Issues

### OTP Not Received
1. Check if using development mode with mock OTP
2. Verify Twilio configuration in Supabase
3. Check phone number format and validation
4. Look for SMS delivery errors in logs

### Token Issues
1. Verify JWT secret configuration
2. Check token expiration settings
3. Ensure Bearer token format in Authorization header
4. Validate token claims and structure

### Database Connection
1. Verify Supabase URL and keys
2. Check network connectivity
3. Confirm table permissions and RLS policies
4. Test database connection independently

### Rate Limiting
1. Clear any existing rate limit data
2. Adjust rate limit settings for testing
3. Use different IP addresses or identifiers
4. Check rate limiting implementation

This comprehensive testing plan covers all aspects of the authentication system and provides a structured approach to verifying functionality, security, and reliability.
