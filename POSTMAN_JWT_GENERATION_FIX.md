# Fix for Postman JWT Token Generation

## The Problem
The Postman collection's "Generate JWT Token" requests are trying to hit `/api/bookings/health` which doesn't exist. They should use `/api/health` instead.

## Quick Fix

### Option 1: Update the URL in Postman
In each "Generate JWT Token" request in the "Auth & Setup" folder:
1. Change the URL from: `{{base_url}}/api/bookings/health`
2. To: `{{base_url}}/health`

### Option 2: Use These Corrected Requests

#### Generate Customer Token
**URL**: `{{base_url}}/health`
**Method**: GET
**Tests Script**:
```javascript
// This is a utility request that just generates a mock token locally
// The API call is just to trigger the script execution

// Generate customer JWT token for testing
const generateJWT = (payload) => {
    const header = btoa(JSON.stringify({"alg": "HS256", "typ": "JWT"}));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = "mock_signature_" + Date.now();
    return `${header}.${encodedPayload}.${signature}`;
};

// Generate customer token
const customerToken = generateJWT({
    id: "customer-test-" + pm.variables.replaceIn("{{$randomUUID}}"),
    type: "customer",
    phone: "+962791234567",
    email: "customer@test.com",
    language: "ar",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
});

pm.environment.set("customer_token", customerToken);
pm.environment.set("customer_user_id", "customer-test-" + pm.variables.replaceIn("{{$randomUUID}}"));

console.log("Customer token generated:", customerToken);

pm.test("Customer token generated successfully", function () {
    pm.expect(customerToken).to.be.a('string');
    pm.expect(customerToken.split('.')).to.have.lengthOf(3);
});

// Don't fail if the response is not what we expect - we're just using this to trigger the script
pm.test.skip("Response status check", function () {
    pm.response.to.have.status(200);
});
```

#### Generate Provider Token
**URL**: `{{base_url}}/health`
**Method**: GET
**Tests Script**:
```javascript
// Generate provider JWT token for testing
const generateJWT = (payload) => {
    const header = btoa(JSON.stringify({"alg": "HS256", "typ": "JWT"}));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = "mock_signature_" + Date.now();
    return `${header}.${encodedPayload}.${signature}`;
};

// Generate provider token
const providerToken = generateJWT({
    id: "provider-test-" + pm.variables.replaceIn("{{$randomUUID}}"),
    type: "provider",
    phone: "+962781111111",
    email: "provider@test.com",
    businessName: "صالون الجمال",
    verified: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
});

pm.environment.set("provider_token", providerToken);
pm.environment.set("provider_user_id", "provider-test-" + pm.variables.replaceIn("{{$randomUUID}}"));
pm.environment.set("test_provider_id", "provider-test-" + pm.variables.replaceIn("{{$randomUUID}}"));

console.log("Provider token generated:", providerToken);

pm.test("Provider token generated successfully", function () {
    pm.expect(providerToken).to.be.a('string');
    pm.expect(providerToken.split('.')).to.have.lengthOf(3);
});

pm.test.skip("Response status check", function () {
    pm.response.to.have.status(200);
});
```

## Important Note
These "Generate JWT Token" requests create **mock tokens** for testing only. They will NOT work with your real API because:
1. They're not signed with your server's JWT_SECRET
2. They're just for testing the request/response flow in Postman

## For Real Authentication Testing

### Test Customer Authentication:
```
1. POST {{base_url}}/auth/customer/send-otp
   Body: { "phone": "0791234567" }
   
2. Check console for: "Mock OTP for +962791234567: 123456"

3. POST {{base_url}}/auth/verify-otp
   Body: { "phone": "+962791234567", "otp": "123456" }
   
4. Save the real token from response:
   pm.environment.set("customer_token", pm.response.json().data.token);
```

### Test Provider Authentication:
```
1. GET {{base_url}}/csrf-token
   Save: pm.environment.set("csrf_token", pm.response.headers.get("X-CSRF-Token"));

2. POST {{base_url}}/auth/provider/signup
   Headers: X-CSRF-Token: {{csrf_token}}
   Body: {
     "email": "test@salon.com",
     "password": "Test123456!",
     "phone": "0798765432",
     "business_name_ar": "صالون تجريبي",
     "business_name_en": "Test Salon",
     "owner_name": "Test Owner",
     "address": {
       "street": "Test Street",
       "city": "Amman",
       "district": "Test District",
       "country": "Jordan"
     }
   }

3. POST {{base_url}}/auth/provider/login
   Headers: X-CSRF-Token: {{csrf_token}}
   Body: {
     "email": "test@salon.com",
     "password": "Test123456!"
   }
   
4. Save token: pm.environment.set("provider_token", pm.response.json().data.token);
```

## Alternative: Skip Mock Token Generation
Instead of using the mock token generators, go directly to the real authentication endpoints as shown above. This will give you real, valid tokens that work with your API.