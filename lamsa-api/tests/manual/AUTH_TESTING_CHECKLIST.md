# Lamsa Authentication Manual Testing Checklist

This comprehensive checklist covers manual testing scenarios for the Lamsa authentication system, including SMS OTP flows, edge cases, and multi-language support.

## Table of Contents
1. [Pre-Testing Setup](#pre-testing-setup)
2. [Customer Authentication Flow](#customer-authentication-flow)
3. [Provider Authentication Flow](#provider-authentication-flow)
4. [Phone Number Validation](#phone-number-validation)
5. [OTP Edge Cases](#otp-edge-cases)
6. [JWT Token Management](#jwt-token-management)
7. [Error Message Validation](#error-message-validation)
8. [Rate Limiting Tests](#rate-limiting-tests)
9. [Network Failure Simulation](#network-failure-simulation)
10. [Security Testing](#security-testing)
11. [Performance Testing](#performance-testing)
12. [Cross-Device Testing](#cross-device-testing)

---

## Pre-Testing Setup

### Environment Configuration
- [ ] Verify API server is running (`npm run dev`)
- [ ] Check environment variables are set correctly
- [ ] Confirm JWT_SECRET is properly configured
- [ ] Verify Supabase connection is active
- [ ] Check SMS service configuration (Twilio/Supabase)
- [ ] Ensure database is accessible and seeded with test data

### Testing Tools
- [ ] Postman collection imported (`postman/Lamsa-API.postman_collection.json`)
- [ ] Environment variables configured in Postman
- [ ] API documentation available
- [ ] Real test phone numbers prepared (Jordan format)
- [ ] SMS receiver device ready

### Test Data Preparation
- [ ] Valid Jordan phone numbers: `+962771234567`, `+962781234567`, `+962791234567`
- [ ] Invalid phone numbers for negative testing
- [ ] Test provider accounts ready
- [ ] Database in clean state

---

## Customer Authentication Flow

### Happy Path - Standard Customer Login

#### Test Case: CUS-001 - Send Customer OTP
**Objective**: Verify successful OTP sending for valid Jordan phone number

**Steps**:
1. Send POST request to `/api/auth/customer/send-otp`
2. Use body: `{ "phone": "+962771234567" }`
3. Wait for response

**Expected Results**:
- [ ] Status Code: 200
- [ ] Response contains: `{ "success": true }`
- [ ] Response includes `message` field
- [ ] Response includes `retryAfter` field (number > 0)
- [ ] In development: `mockOtp` field present
- [ ] SMS received on actual device (if using real SMS)

**Error Scenarios**:
- [ ] Verify rate limiting after multiple requests
- [ ] Check behavior with network timeouts

---

#### Test Case: CUS-002 - Verify Customer OTP
**Objective**: Verify successful OTP verification and JWT token generation

**Prerequisites**: Valid OTP sent via CUS-001

**Steps**:
1. Send POST request to `/api/auth/customer/verify-otp`
2. Use body: `{ "phone": "+962771234567", "otp": "123456" }`
3. Record the token from response

**Expected Results**:
- [ ] Status Code: 200
- [ ] Response contains: `{ "success": true }`
- [ ] `user` object with: `id`, `phone`, `role: "customer"`
- [ ] `token` field contains valid JWT
- [ ] JWT payload includes: `userId`, `phone`, `role`, `iat`, `exp`
- [ ] Token expiration set to 24 hours

**Verification**:
- [ ] Decode JWT manually to verify payload structure
- [ ] Verify phone number format is normalized to +962 format

---

#### Test Case: CUS-003 - Access Protected Route
**Objective**: Verify JWT token works for authenticated requests

**Prerequisites**: Valid JWT token from CUS-002

**Steps**:
1. Send GET request to `/api/auth/me`
2. Add header: `Authorization: Bearer <token>`

**Expected Results**:
- [ ] Status Code: 200
- [ ] Response contains user information
- [ ] User data matches original authentication

---

#### Test Case: CUS-004 - Token Refresh
**Objective**: Verify token refresh mechanism

**Prerequisites**: Valid JWT token from CUS-002

**Steps**:
1. Send POST request to `/api/auth/refresh`
2. Add header: `Authorization: Bearer <token>`

**Expected Results**:
- [ ] Status Code: 200
- [ ] New token received
- [ ] New token is different from original
- [ ] New token has updated `iat` timestamp
- [ ] Both old and new tokens work for authentication

---

#### Test Case: CUS-005 - Sign Out
**Objective**: Verify sign out functionality

**Prerequisites**: Valid JWT token

**Steps**:
1. Send POST request to `/api/auth/signout`
2. Add header: `Authorization: Bearer <token>`

**Expected Results**:
- [ ] Status Code: 200
- [ ] Success message returned
- [ ] Token still works (stateless JWT - expected behavior)

---

## Provider Authentication Flow

### Test Case: PRO-001 - Provider OTP Flow
**Objective**: Verify provider authentication works independently

**Steps**:
1. Send POST to `/api/auth/provider/send-otp` with `{ "phone": "+962781234567" }`
2. Verify OTP sent successfully
3. Send POST to `/api/auth/provider/verify-otp` with phone and OTP
4. Verify JWT token received with `role: "provider"`

**Expected Results**:
- [ ] Provider OTP flow identical to customer flow
- [ ] JWT contains `role: "provider"`
- [ ] Can access `/api/auth/me` with provider token

---

## Phone Number Validation

### Test Case: PHN-001 - Valid Jordan Phone Formats
**Objective**: Verify all valid Jordan phone formats are accepted

**Test Data**:
- `+962771234567` (International format)
- `962771234567` (Without +)
- `0771234567` (Local format)
- `771234567` (Short format)
- `+962 77 123 4567` (With spaces)
- `+962-77-123-4567` (With dashes)

**Steps**:
For each phone number:
1. Send OTP request
2. Verify success response
3. Check that phone is normalized to `+962xxxxxxxxx` format

**Expected Results**:
- [ ] All formats accepted
- [ ] All normalized to `+962` format in backend
- [ ] SMS sent to correct number

---

### Test Case: PHN-002 - Invalid Phone Numbers
**Objective**: Verify invalid phone numbers are rejected

**Test Data**:
- `+1234567890` (Wrong country)
- `+962761234567` (Wrong prefix - not 77/78/79)
- `123456` (Too short)
- `+96277123456789` (Too long)
- `invalid-phone` (Non-numeric)
- `` (Empty string)
- `null` (Null value)

**Steps**:
For each invalid phone:
1. Send OTP request
2. Verify error response

**Expected Results**:
- [ ] Status Code: 400
- [ ] Error code: `INVALID_PHONE_FORMAT` or `PHONE_REQUIRED`
- [ ] English error message provided
- [ ] Arabic error message provided (`messageAr`)
- [ ] No SMS sent

---

## OTP Edge Cases

### Test Case: OTP-001 - Invalid OTP Codes
**Objective**: Test various invalid OTP scenarios

**Prerequisites**: Valid OTP sent to phone

**Test Data**:
- `000000` (Wrong code)
- `123456` (After expiration)
- `ABCDEF` (Non-numeric)
- `12345` (Too short)
- `1234567` (Too long)
- `` (Empty)

**Steps**:
For each invalid OTP:
1. Send verify request
2. Record response and attempts remaining

**Expected Results**:
- [ ] Status Code: 400
- [ ] Error codes: `INVALID_OTP`, `OTP_EXPIRED`
- [ ] Bilingual error messages
- [ ] Attempts remaining counter decrements
- [ ] Account lockout after max attempts

---

### Test Case: OTP-002 - OTP Expiration
**Objective**: Verify OTP expires after time limit

**Steps**:
1. Send OTP request
2. Wait for OTP expiration time (usually 5-10 minutes)
3. Attempt verification with correct OTP

**Expected Results**:
- [ ] Status Code: 400
- [ ] Error code: `OTP_EXPIRED`
- [ ] Bilingual error message about expiration

---

### Test Case: OTP-003 - Multiple OTP Attempts
**Objective**: Test brute force protection

**Steps**:
1. Send valid OTP
2. Attempt verification with wrong codes multiple times
3. Record behavior after max attempts

**Expected Results**:
- [ ] First few attempts return `INVALID_OTP`
- [ ] After max attempts: `TOO_MANY_ATTEMPTS`
- [ ] Account locked for specified duration
- [ ] `lockoutDuration` provided in response

---

## JWT Token Management

### Test Case: JWT-001 - Token Structure Validation
**Objective**: Verify JWT token structure and claims

**Prerequisites**: Valid JWT token

**Steps**:
1. Decode JWT header and payload
2. Verify signature with secret
3. Check all required claims

**Expected Results**:
- [ ] Header contains: `{ "alg": "HS256", "typ": "JWT" }`
- [ ] Payload contains: `userId`, `phone`, `role`, `iat`, `exp`
- [ ] Signature verifies with JWT_SECRET
- [ ] Expiration is 24 hours from issue time

---

### Test Case: JWT-002 - Expired Token Handling
**Objective**: Test behavior with expired tokens

**Steps**:
1. Create token with short expiration (manually or wait)
2. Attempt to use expired token

**Expected Results**:
- [ ] Status Code: 401
- [ ] Error code: `TOKEN_EXPIRED`
- [ ] Bilingual error message

---

### Test Case: JWT-003 - Invalid Token Handling
**Objective**: Test various invalid token scenarios

**Test Data**:
- `invalid.jwt.token`
- `eyJhbGciOiJIUzI1NiJ9.invalid.signature`
- Token signed with wrong secret
- Malformed tokens

**Expected Results**:
- [ ] Status Code: 401
- [ ] Error code: `INVALID_TOKEN`
- [ ] No sensitive information leaked

---

## Error Message Validation

### Test Case: ERR-001 - English Error Messages
**Objective**: Verify English error messages are clear and helpful

**Steps**:
Test each error scenario and verify:
- [ ] Messages are in proper English
- [ ] Messages are user-friendly (no technical jargon)
- [ ] Messages provide actionable guidance
- [ ] No sensitive information exposed

---

### Test Case: ERR-002 - Arabic Error Messages
**Objective**: Verify Arabic error messages are properly localized

**Steps**:
Test each error scenario and verify:
- [ ] `messageAr` field present in all error responses
- [ ] Arabic text displays correctly (RTL)
- [ ] Arabic messages contain Arabic characters ([\u0600-\u06FF])
- [ ] Messages are grammatically correct Arabic
- [ ] No broken Unicode characters (�)

---

### Test Case: ERR-003 - Error Message Consistency
**Objective**: Verify consistent error structure across all endpoints

**Steps**:
Test errors from different endpoints and verify:
- [ ] All errors have `success: false`
- [ ] All errors have `error` code field
- [ ] All errors have `message` and `messageAr`
- [ ] Error codes follow UPPER_SNAKE_CASE pattern
- [ ] Additional fields (like `attemptsRemaining`) consistent

---

## Rate Limiting Tests

### Test Case: RATE-001 - OTP Rate Limiting
**Objective**: Verify OTP request rate limiting

**Steps**:
1. Send multiple OTP requests rapidly to same phone
2. Record when rate limiting kicks in
3. Wait for cooldown period
4. Verify requests work again

**Expected Results**:
- [ ] First few requests succeed (usually 3)
- [ ] Subsequent requests return 429 status
- [ ] `retryAfter` field indicates wait time
- [ ] After cooldown, requests work again

---

### Test Case: RATE-002 - Verification Rate Limiting
**Objective**: Verify OTP verification rate limiting

**Steps**:
1. Send multiple verification attempts rapidly
2. Test with both correct and incorrect OTPs

**Expected Results**:
- [ ] Rate limiting applies to verification attempts
- [ ] Different limits for correct vs incorrect OTPs
- [ ] Account lockout after too many failed attempts

---

## Network Failure Simulation

### Test Case: NET-001 - SMS Service Timeout
**Objective**: Simulate SMS service delays/failures

**Steps**:
1. Configure network delays (if possible)
2. Send OTP requests during simulated outage
3. Monitor response times and error handling

**Expected Results**:
- [ ] Graceful error handling during timeouts
- [ ] User-friendly error messages
- [ ] No application crashes
- [ ] Proper HTTP status codes

---

### Test Case: NET-002 - Database Connection Issues
**Objective**: Test resilience to database problems

**Steps**:
1. Simulate database connection issues
2. Test both OTP sending and verification
3. Monitor error responses

**Expected Results**:
- [ ] Database errors handled gracefully
- [ ] Generic error messages (no DB details exposed)
- [ ] Application remains stable

---

## Security Testing

### Test Case: SEC-001 - SQL Injection Attempts
**Objective**: Verify protection against SQL injection

**Test Data**:
- `+962771234567'; DROP TABLE users; --`
- `962771234567" OR "1"="1`

**Expected Results**:
- [ ] All malicious input rejected
- [ ] No database errors
- [ ] Input properly sanitized

---

### Test Case: SEC-002 - XSS Prevention
**Objective**: Verify protection against XSS attacks

**Test Data**:
- `<script>alert('xss')</script>`
- `javascript:alert('xss')`

**Expected Results**:
- [ ] Malicious scripts not reflected in responses
- [ ] Input properly escaped/sanitized

---

### Test Case: SEC-003 - Brute Force Protection
**Objective**: Test protection against brute force attacks

**Steps**:
1. Attempt rapid OTP guessing
2. Try multiple phone numbers from same IP
3. Test distributed attacks simulation

**Expected Results**:
- [ ] Rate limiting prevents brute force
- [ ] Account lockouts triggered appropriately
- [ ] IP-based limiting (if implemented)

---

## Performance Testing

### Test Case: PERF-001 - Concurrent Authentication
**Objective**: Test system under concurrent load

**Steps**:
1. Simulate 50+ concurrent OTP requests
2. Monitor response times
3. Check for any failures or timeouts

**Expected Results**:
- [ ] All requests handled successfully
- [ ] Response times remain reasonable (<2 seconds)
- [ ] No memory leaks or crashes

---

### Test Case: PERF-002 - Token Verification Performance
**Objective**: Test JWT verification performance

**Steps**:
1. Make 100+ rapid requests with valid tokens
2. Monitor response times and resource usage

**Expected Results**:
- [ ] Token verification fast (<100ms)
- [ ] No performance degradation over time
- [ ] Memory usage stable

---

## Cross-Device Testing

### Test Case: DEV-001 - Multiple Device Sessions
**Objective**: Test authentication across multiple devices

**Steps**:
1. Authenticate same user on multiple devices/browsers
2. Verify independent session management
3. Test token refresh on each device

**Expected Results**:
- [ ] Multiple sessions work independently
- [ ] Tokens don't interfere with each other
- [ ] Each device can refresh tokens independently

---

### Test Case: DEV-002 - Device Switching
**Objective**: Test user experience when switching devices

**Steps**:
1. Authenticate on Device A
2. Authenticate same user on Device B
3. Continue using both devices

**Expected Results**:
- [ ] Both devices remain authenticated
- [ ] No conflicts between sessions
- [ ] Consistent user experience

---

## Test Execution Checklist

### Before Testing
- [ ] Environment properly configured
- [ ] Test data prepared
- [ ] SMS service available (or mock configured)
- [ ] Database in clean state

### During Testing
- [ ] Record all test results
- [ ] Note any unexpected behavior
- [ ] Capture error messages for review
- [ ] Monitor server logs for errors

### After Testing
- [ ] All test cases executed
- [ ] Results documented
- [ ] Issues logged and prioritized
- [ ] Clean up test data
- [ ] Environment reset for next testing

---

## Common Issues and Troubleshooting

### SMS Not Received
- [ ] Check phone number format
- [ ] Verify SMS service configuration
- [ ] Check rate limiting status
- [ ] Review server logs for SMS errors

### JWT Token Issues
- [ ] Verify JWT_SECRET configuration
- [ ] Check token expiration times
- [ ] Validate token structure
- [ ] Review authentication middleware

### Error Message Problems
- [ ] Check localization files
- [ ] Verify Arabic text encoding
- [ ] Review error handling middleware
- [ ] Test message formatting

### Performance Issues
- [ ] Monitor database connections
- [ ] Check for memory leaks
- [ ] Review rate limiting settings
- [ ] Analyze response times

---

## Test Result Template

```
Test Case: [TEST_ID]
Date: [DATE]
Tester: [NAME]
Environment: [DEV/STAGING/PROD]

Results:
✅ PASS / ❌ FAIL

Notes:
[Any observations, issues, or recommendations]

Screenshots/Logs:
[Attach relevant evidence]
```