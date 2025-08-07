# Complete Postman Testing Guide for Lamsa API

## 🚀 Quick Start Guide

### Step 1: Install Postman
1. Download Postman from [https://www.postman.com/downloads/](https://www.postman.com/downloads/)
2. Install and create a free account

### Step 2: Import Collection and Environment
1. In Postman, click the **Import** button (top left)
2. Import these files from your project:
   - `/lamsa-api/postman/Lamsa-API.postman_collection.json`
   - `/lamsa-api/postman/environments/development.postman_environment.json`

### Step 3: Set Up Environment
1. Click the environment dropdown (top right) and select **"Lamsa API - Development"**
2. Click the eye icon next to the dropdown to view/edit variables
3. Update `base_url` if your API runs on a different port (default: `http://localhost:3000/api`)

### Step 4: Start Your API Server
```bash
cd lamsa-api
npm run dev
```

## 📱 Testing Authentication Flows

### Customer Authentication (Phone/OTP)

#### 1. Send OTP to Customer Phone
**Endpoint**: `POST {{base_url}}/auth/customer/send-otp`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "phone": "0791234567"  // Jordanian phone format
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "OTP sent successfully to +962791234567",
  "data": {
    "phone": "+962791234567"
  }
}
```

**In Development Mode**: The OTP will be logged in your console: `Mock OTP for +962791234567: 123456`

#### 2. Verify OTP
**Endpoint**: `POST {{base_url}}/auth/verify-otp`

**Body**:
```json
{
  "phone": "+962791234567",
  "otp": "123456"  // Use the OTP from console in dev mode
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "phone": "+962791234567",
      "name": "User"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Save the token**: In Postman, add this to your test script to auto-save the token:
```javascript
if (pm.response.json().data && pm.response.json().data.token) {
    pm.environment.set("customer_token", pm.response.json().data.token);
}
```

### Provider Authentication

#### 1. Provider Signup
**Endpoint**: `POST {{base_url}}/auth/provider/signup`

**Important**: With CSRF protection enabled, you need to get a CSRF token first:

**Step 1a: Get CSRF Token**
```
GET {{base_url}}/csrf-token
```
Save the token from the response header `X-CSRF-Token`

**Step 1b: Provider Signup Request**
**Headers**:
```
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}  // Add the token from step 1a
```

**Body**:
```json
{
  "email": "salon@example.com",
  "password": "SecurePass123!",
  "phone": "0798765432",
  "business_name_ar": "صالون الجمال",
  "business_name_en": "Beauty Salon",
  "owner_name": "Sarah Ahmad",
  "address": {
    "street": "Rainbow Street",
    "city": "Amman",
    "district": "Jabal Amman",
    "country": "Jordan"
  },
  "license_number": "LIC-2024-001"
}
```

#### 2. Provider Login
**Endpoint**: `POST {{base_url}}/auth/provider/login`

**Headers**:
```
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
```

**Body**:
```json
{
  "email": "salon@example.com",
  "password": "SecurePass123!"
}
```

**Auto-save token in Tests tab**:
```javascript
const response = pm.response.json();
if (response.data && response.data.token) {
    pm.environment.set("provider_token", response.data.token);
    pm.environment.set("provider_id", response.data.provider.id);
}
```

## 🔐 CSRF Token Handling

Since CSRF protection is now enabled, you need to handle CSRF tokens for state-changing requests (POST, PUT, DELETE):

### Automated CSRF Token Handling
Add this to your collection's **Pre-request Script**:
```javascript
// Auto-fetch CSRF token for state-changing requests
if (["POST", "PUT", "DELETE", "PATCH"].includes(pm.request.method)) {
    pm.sendRequest({
        url: pm.environment.get("base_url").replace("/api", "") + "/api/csrf-token",
        method: "GET"
    }, function (err, res) {
        if (!err && res.headers.has("X-CSRF-Token")) {
            pm.environment.set("csrf_token", res.headers.get("X-CSRF-Token"));
        }
    });
}
```

## 📋 Testing Core Features

### 1. Search Providers by Location
**Endpoint**: `GET {{base_url}}/providers/search`

**Headers**:
```
Authorization: Bearer {{customer_token}}
```

**Query Parameters**:
```
latitude: 31.9539
longitude: 35.9106
radius: 5
service_type: hair_styling
```

### 2. Get Provider Details
**Endpoint**: `GET {{base_url}}/providers/{{provider_id}}`

**Headers**:
```
Authorization: Bearer {{customer_token}}
```

### 3. Check Provider Availability
**Endpoint**: `GET {{base_url}}/providers/{{provider_id}}/availability`

**Query Parameters**:
```
date: 2024-12-28
service_id: {{service_id}}
```

### 4. Create a Booking
**Endpoint**: `POST {{base_url}}/bookings`

**Headers**:
```
Authorization: Bearer {{customer_token}}
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
```

**Body**:
```json
{
  "provider_id": "{{provider_id}}",
  "service_id": "{{service_id}}",
  "booking_date": "2024-12-28",
  "booking_time": "14:00",
  "notes": "First time customer",
  "payment_method": "cash"
}
```

### 5. View My Bookings (Customer)
**Endpoint**: `GET {{base_url}}/bookings/my-bookings`

**Headers**:
```
Authorization: Bearer {{customer_token}}
```

### 6. Provider: View Incoming Bookings
**Endpoint**: `GET {{base_url}}/bookings/provider/{{provider_id}}`

**Headers**:
```
Authorization: Bearer {{provider_token}}
```

### 7. Update Booking Status (Provider)
**Endpoint**: `PUT {{base_url}}/bookings/{{booking_id}}/status`

**Headers**:
```
Authorization: Bearer {{provider_token}}
Content-Type: application/json
X-CSRF-Token: {{csrf_token}}
```

**Body**:
```json
{
  "status": "confirmed",
  "notes": "Confirmed for 2:00 PM"
}
```

## 🧪 Testing Error Scenarios

### 1. Invalid Phone Number
```json
{
  "phone": "123"  // Too short
}
```
Expected: 400 Bad Request with validation error

### 2. Wrong OTP
```json
{
  "phone": "+962791234567",
  "otp": "999999"  // Wrong OTP
}
```
Expected: 400 Bad Request "Invalid or expired OTP"

### 3. Missing Authorization
Remove the `Authorization` header and try accessing protected endpoints.
Expected: 401 Unauthorized

### 4. Invalid CSRF Token
Use an incorrect CSRF token:
```
X-CSRF-Token: invalid-token
```
Expected: 403 Forbidden

### 5. Rate Limiting
Send multiple requests rapidly to test rate limiting.
Expected: 429 Too Many Requests (after exceeding limit)

## 📊 Performance Testing

### Add Response Time Tests
In the **Tests** tab of each request:
```javascript
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

### Monitor Database Query Performance
Check your API logs for slow queries - the production monitoring middleware tracks these.

## 🔄 Automated Testing with Newman

### Install Newman
```bash
npm install -g newman
npm install -g newman-reporter-html
```

### Run All Tests
```bash
cd lamsa-api/postman
node newman-runner.js --environment development --verbose
```

### Run Specific Folder
```bash
newman run Lamsa-API.postman_collection.json \
  -e environments/development.postman_environment.json \
  --folder "Auth & Setup"
```

## 🛠️ Troubleshooting Common Issues

### 1. "No token provided" Error
- Make sure you've run the authentication requests first
- Check that tokens are saved in environment variables
- Verify the Authorization header format: `Bearer {{token}}`

### 2. CSRF Token Errors
- Ensure you're fetching a fresh CSRF token before state-changing requests
- Check that the X-CSRF-Token header is included
- Verify CSRF protection is enabled in your API

### 3. "Invalid phone number" Error
- Use Jordanian format: 077/078/079 followed by 7 digits
- API accepts: `0791234567`, `+962791234567`, or `962791234567`

### 4. Connection Refused
- Ensure your API server is running (`npm run dev`)
- Check the base_url in your environment matches your API port
- Verify no firewall is blocking the connection

### 5. Mock OTP Not Working
- Check your console for the OTP (dev mode only)
- Ensure NODE_ENV is set to 'development'
- Verify mock-otp.ts is properly configured

## 📝 Best Practices

1. **Use Environment Variables**
   - Never hardcode tokens or IDs
   - Keep different environments for dev/staging/prod

2. **Add Tests to Every Request**
   - Validate status codes
   - Check response structure
   - Verify business logic

3. **Document Your Requests**
   - Add descriptions to explain what each request does
   - Include example responses
   - Document required parameters

4. **Organize Requests in Folders**
   - Group by feature (Auth, Bookings, Providers)
   - Create flows for complete user journeys
   - Separate admin operations

5. **Version Control**
   - Commit your Postman collections to git
   - Track changes to API contracts
   - Share with team members

## 🎯 Complete Testing Checklist

- [ ] **Authentication**
  - [ ] Customer OTP flow
  - [ ] Provider signup
  - [ ] Provider login
  - [ ] Token refresh
  - [ ] Logout

- [ ] **Provider Operations**
  - [ ] Search providers
  - [ ] View provider details
  - [ ] Check availability
  - [ ] Update profile
  - [ ] Manage services

- [ ] **Booking Flow**
  - [ ] Create booking
  - [ ] View bookings
  - [ ] Update booking status
  - [ ] Cancel booking
  - [ ] Complete booking

- [ ] **Error Handling**
  - [ ] Invalid inputs
  - [ ] Authentication errors
  - [ ] Rate limiting
  - [ ] CSRF protection
  - [ ] Business rule violations

- [ ] **Performance**
  - [ ] Response times < 500ms
  - [ ] Pagination works correctly
  - [ ] Search is optimized

## 🚨 Security Testing Notes

With CSRF protection now enabled:
1. All state-changing requests require a valid CSRF token
2. Tokens are tied to sessions and expire
3. This prevents cross-site request forgery attacks
4. Always fetch a fresh token before POST/PUT/DELETE requests

Remember to test both positive and negative scenarios to ensure your API handles all cases gracefully!