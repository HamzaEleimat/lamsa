# Postman Testing Guide for BeautyCort Authentication

This guide provides step-by-step instructions for testing the BeautyCort authentication system using Postman.

## Table of Contents
1. [Setup Instructions](#setup-instructions)
2. [Environment Configuration](#environment-configuration)
3. [Test Collection Overview](#test-collection-overview)
4. [Manual Testing Workflows](#manual-testing-workflows)
5. [Automated Test Scripts](#automated-test-scripts)
6. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Setup Instructions

### 1. Import Collection
1. Open Postman
2. Click "Import" in the top left
3. Select file: `postman/BeautyCort-API.postman_collection.json`
4. Click "Import"

### 2. Import Environment
1. Click "Environments" in the left sidebar
2. Click "Import"
3. Select file: `postman/environments/development.postman_environment.json`
4. Click "Import"
5. Select the "BeautyCort Development" environment

### 3. Verify Environment Variables
Check that these variables are set:
- `api_url`: `http://localhost:3000`
- `jwt_token`: (will be set automatically during tests)
- `test_phone`: `+962771234567`
- `test_otp`: `123456`

---

## Environment Configuration

### Development Environment Variables
```json
{
  "api_url": "http://localhost:3000",
  "jwt_token": "",
  "test_phone": "+962771234567",
  "test_phone_2": "+962781234567",
  "test_otp": "123456",
  "provider_phone": "+962791234567"
}
```

### Production Environment Variables
```json
{
  "api_url": "https://api.beautycort.com",
  "jwt_token": "",
  "test_phone": "+962771234567",
  "test_phone_2": "+962781234567",
  "test_otp": "",
  "provider_phone": "+962791234567"
}
```

---

## Test Collection Overview

### Authentication Folder Structure
```
BeautyCort API
├── Authentication
│   ├── Customer Auth
│   │   ├── Send Customer OTP
│   │   ├── Verify Customer OTP
│   │   └── Customer Auth Flow (Combined)
│   ├── Provider Auth
│   │   ├── Send Provider OTP
│   │   ├── Verify Provider OTP
│   │   └── Provider Auth Flow (Combined)
│   ├── Token Management
│   │   ├── Get Current User
│   │   ├── Refresh Token
│   │   └── Sign Out
│   └── Error Scenarios
│       ├── Invalid Phone Numbers
│       ├── Invalid OTP Codes
│       ├── Expired Tokens
│       └── Rate Limiting Tests
```

---

## Manual Testing Workflows

### Workflow 1: Complete Customer Authentication

#### Step 1: Send Customer OTP
**Request**: `POST {{api_url}}/api/auth/customer/send-otp`

**Body**:
```json
{
  "phone": "{{test_phone}}"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "retryAfter": 60,
  "mockOtp": "123456"
}
```

**Post-Request Script**:
```javascript
// Automatically save the mock OTP for development
if (pm.response.json().mockOtp) {
    pm.environment.set("test_otp", pm.response.json().mockOtp);
}

// Test response structure
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    pm.expect(pm.response.json()).to.have.property('success', true);
});

pm.test("Response has retryAfter field", function () {
    pm.expect(pm.response.json()).to.have.property('retryAfter');
});
```

#### Step 2: Verify Customer OTP
**Request**: `POST {{api_url}}/api/auth/customer/verify-otp`

**Body**:
```json
{
  "phone": "{{test_phone}}",
  "otp": "{{test_otp}}"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Authentication successful",
  "user": {
    "id": "user-123",
    "phone": "+962771234567",
    "role": "customer",
    "name": "Test User"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Post-Request Script**:
```javascript
// Save the JWT token for subsequent requests
if (pm.response.json().token) {
    pm.environment.set("jwt_token", pm.response.json().token);
}

// Test response structure
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains user object", function () {
    pm.expect(pm.response.json()).to.have.property('user');
});

pm.test("Response contains JWT token", function () {
    pm.expect(pm.response.json()).to.have.property('token');
});

pm.test("User has correct role", function () {
    pm.expect(pm.response.json().user.role).to.equal('customer');
});

pm.test("Token is valid JWT format", function () {
    const token = pm.response.json().token;
    pm.expect(token.split('.')).to.have.lengthOf(3);
});
```

#### Step 3: Access Protected Route
**Request**: `GET {{api_url}}/api/auth/me`

**Headers**:
```
Authorization: Bearer {{jwt_token}}
```

**Expected Response**:
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "phone": "+962771234567",
    "role": "customer",
    "name": "Test User"
  }
}
```

### Workflow 2: Provider Authentication

#### Step 1: Send Provider OTP
**Request**: `POST {{api_url}}/api/auth/provider/send-otp`

**Body**:
```json
{
  "phone": "{{provider_phone}}"
}
```

#### Step 2: Verify Provider OTP
**Request**: `POST {{api_url}}/api/auth/provider/verify-otp`

**Body**:
```json
{
  "phone": "{{provider_phone}}",
  "otp": "{{test_otp}}"
}
```

**Post-Request Script**:
```javascript
// Save provider token separately
if (pm.response.json().token) {
    pm.environment.set("provider_token", pm.response.json().token);
}

pm.test("User has provider role", function () {
    pm.expect(pm.response.json().user.role).to.equal('provider');
});
```

### Workflow 3: Token Management

#### Refresh Token
**Request**: `POST {{api_url}}/api/auth/refresh`

**Headers**:
```
Authorization: Bearer {{jwt_token}}
```

**Post-Request Script**:
```javascript
// Update token with new one
if (pm.response.json().token) {
    pm.environment.set("jwt_token", pm.response.json().token);
}

pm.test("New token received", function () {
    pm.expect(pm.response.json()).to.have.property('token');
});
```

#### Sign Out
**Request**: `POST {{api_url}}/api/auth/signout`

**Headers**:
```
Authorization: Bearer {{jwt_token}}
```

---

## Automated Test Scripts

### Collection-Level Pre-Request Script
```javascript
// Set common headers
pm.request.headers.add({
    key: 'Content-Type',
    value: 'application/json'
});

// Add timestamp for unique requests
pm.globals.set("timestamp", new Date().getTime());
```

### Global Test Scripts

#### Phone Number Validation Tests
```javascript
// Test for authentication requests
pm.test("Phone number validation", function () {
    const requestBody = JSON.parse(pm.request.body.raw);
    if (requestBody.phone) {
        // Test Jordan phone format
        const jordanPhoneRegex = /^(\+962|962|07|7)[0-9]{8,9}$/;
        pm.expect(requestBody.phone).to.match(jordanPhoneRegex);
    }
});
```

#### Error Response Validation
```javascript
// Test for error responses
if (pm.response.code >= 400) {
    pm.test("Error response has required fields", function () {
        const response = pm.response.json();
        pm.expect(response).to.have.property('success', false);
        pm.expect(response).to.have.property('error');
        pm.expect(response).to.have.property('message');
        pm.expect(response).to.have.property('messageAr');
    });
    
    pm.test("Arabic message contains Arabic characters", function () {
        const response = pm.response.json();
        if (response.messageAr) {
            const arabicRegex = /[\u0600-\u06FF]/;
            pm.expect(response.messageAr).to.match(arabicRegex);
        }
    });
}
```

### Test Data Generation Scripts

#### Generate Test Phone Numbers
```javascript
// Pre-request script for generating test data
const generateJordanPhone = () => {
    const prefixes = ['77', '78', '79'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `+962${prefix}${number}`;
};

pm.environment.set("random_phone", generateJordanPhone());
```

#### Generate OTP Codes
```javascript
// Generate random OTP for testing
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

pm.environment.set("random_otp", generateOTP());
```

---

## Test Scenarios for Manual Execution

### Scenario 1: Phone Number Edge Cases

#### Valid Phone Formats
Test these phone formats in the "Send OTP" requests:

1. `+962771234567` - International format
2. `962771234567` - Without plus
3. `0771234567` - Local format
4. `771234567` - Short format
5. `+962 77 123 4567` - With spaces
6. `+962-77-123-4567` - With dashes

**Expected**: All should succeed and normalize to `+962xxxxxxxxx`

#### Invalid Phone Formats
Test these invalid formats:

1. `+1234567890` - Wrong country
2. `+962761234567` - Wrong prefix
3. `123456` - Too short
4. `invalid` - Non-numeric
5. `` - Empty string

**Expected**: All should return 400 with appropriate error messages

### Scenario 2: OTP Verification Edge Cases

#### Invalid OTP Codes
After sending a valid OTP, test these invalid codes:

1. `000000` - Wrong code
2. `ABCDEF` - Non-numeric
3. `12345` - Too short
4. `1234567` - Too long
5. `` - Empty

**Expected**: All should return 400 with `INVALID_OTP` error

#### Expired OTP
1. Send OTP
2. Wait for expiration time (usually 5-10 minutes)
3. Try to verify with correct OTP

**Expected**: Should return `OTP_EXPIRED` error

### Scenario 3: Rate Limiting Tests

#### OTP Rate Limiting
1. Send multiple OTP requests rapidly to same phone
2. Record when rate limiting kicks in

**Expected**: After 3 requests, should return 429 with `RATE_LIMITED`

#### Verification Rate Limiting
1. Send OTP
2. Make multiple verification attempts with wrong codes

**Expected**: After max attempts, should return `TOO_MANY_ATTEMPTS`

### Scenario 4: Token Security Tests

#### Invalid Tokens
Test these invalid token scenarios in protected routes:

1. No Authorization header
2. `Authorization: Bearer invalid-token`
3. `Authorization: InvalidFormat token`
4. Expired token
5. Token with wrong signature

**Expected**: All should return 401 with appropriate error codes

---

## Running Collection with Newman

### Install Newman
```bash
npm install -g newman
```

### Run Collection
```bash
# Run with development environment
newman run postman/BeautyCort-API.postman_collection.json \
  -e postman/environments/development.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export auth-test-results.html

# Run with specific folder
newman run postman/BeautyCort-API.postman_collection.json \
  -e postman/environments/development.postman_environment.json \
  --folder "Authentication" \
  --reporters cli,json \
  --reporter-json-export auth-test-results.json
```

### CI/CD Integration
```bash
# Run tests and fail on errors
newman run postman/BeautyCort-API.postman_collection.json \
  -e postman/environments/development.postman_environment.json \
  --bail \
  --color off \
  --disable-unicode
```

---

## Common Issues and Solutions

### Issue 1: SMS Not Received
**Symptoms**: OTP request succeeds but no SMS received

**Solutions**:
1. Check if using development environment (mock OTP in response)
2. Verify SMS service configuration
3. Check phone number format
4. Review rate limiting status

### Issue 2: Token Not Working
**Symptoms**: Protected routes return 401 even with valid token

**Solutions**:
1. Check token expiration
2. Verify JWT_SECRET configuration
3. Ensure Authorization header format: `Bearer <token>`
4. Check token was saved correctly in environment

### Issue 3: Arabic Characters Not Displaying
**Symptoms**: Arabic error messages show as question marks

**Solutions**:
1. Ensure Postman is using UTF-8 encoding
2. Check API response headers for correct charset
3. Verify Arabic text in API responses

### Issue 4: Rate Limiting Too Aggressive
**Symptoms**: Requests blocked too quickly during testing

**Solutions**:
1. Wait for rate limit reset (check `retryAfter` field)
2. Use different phone numbers for testing
3. Clear rate limit data (if using Redis)
4. Adjust rate limiting settings for testing

---

## Best Practices

### Test Organization
1. Use folders to group related requests
2. Name requests descriptively
3. Add documentation to each request
4. Use environment variables for reusable data

### Error Handling
1. Always test both success and error scenarios
2. Verify error message structure
3. Check HTTP status codes
4. Test error message localization

### Security Testing
1. Test with invalid credentials
2. Verify token expiration handling
3. Test authorization on protected routes
4. Check for information disclosure in errors

### Performance Testing
1. Monitor response times
2. Test with concurrent requests
3. Check for memory leaks
4. Verify rate limiting effectiveness