# Postman Setup Instructions for Provider Login Tests

## Quick Fix for CSRF Token Error

The CSRF token error occurs when the token lengths don't match. Here's how to fix it:

### Option 1: Disable CSRF for Testing (Quickest)

1. In your `.env` file, add:
   ```
   CSRF_ENABLED=false
   ```

2. Restart your API server

### Option 2: Proper CSRF Token Handling in Postman

1. **Create a new request in Postman called "Get CSRF Token":**
   - Method: `GET`
   - URL: `{{base_url}}/api/csrf-token`
   - Save it at the top of your collection

2. **In the Tests tab of "Get CSRF Token", add:**
   ```javascript
   if (pm.response.code === 200) {
       const data = pm.response.json();
       pm.environment.set('csrf_token', data.csrfToken);
       console.log('CSRF Token saved:', data.csrfToken);
   }
   ```

3. **For Provider Login request:**
   
   **Pre-request Script:**
   ```javascript
   // Set test provider credentials
   pm.environment.set('provider_email', 'test.provider1@lamsa.test');
   pm.environment.set('provider_password', 'TestProvider123!');
   ```

   **Headers:**
   - `Content-Type`: `application/json`
   - `X-CSRF-Token`: `{{csrf_token}}`

   **Body (raw JSON):**
   ```json
   {
       "email": "{{provider_email}}",
       "password": "{{provider_password}}"
   }
   ```

   **Tests tab:**
   ```javascript
   if (pm.response.code === 200 || pm.response.code === 201) {
       const data = pm.response.json();
       if (data.success && data.data.token) {
           pm.environment.set('provider_auth_token', data.data.token);
           pm.environment.set('provider_id', data.data.provider.id);
           console.log('✅ Provider logged in successfully');
           console.log('Token saved for future requests');
       }
   } else {
       console.error('❌ Login failed:', pm.response.json());
   }
   ```

## Running the Tests

### Step 1: Setup Test Data
```bash
cd lamsa-api
./postman/setup-test-data.sh
```

### Step 2: In Postman
1. Import the environment: `lamsa-api/postman/environments/test-providers.postman_environment.json`
2. Select the environment from the dropdown
3. Run requests in this order:
   - Get CSRF Token
   - Provider Login
   - Your other provider tests

### Step 3: For Subsequent Requests
Add this to the Pre-request Script of authenticated requests:
```javascript
// Add auth token to header
const token = pm.environment.get('provider_auth_token');
if (token) {
    pm.request.headers.add({
        key: 'Authorization',
        value: 'Bearer ' + token
    });
}

// Add CSRF token for POST/PUT/DELETE
const csrfToken = pm.environment.get('csrf_token');
if (csrfToken && ['POST', 'PUT', 'DELETE'].includes(pm.request.method)) {
    pm.request.headers.add({
        key: 'X-CSRF-Token',
        value: csrfToken
    });
}
```

## Test Provider Credentials

All test providers use the same password: **TestProvider123!**

| Provider | Email | Phone | ID |
|----------|-------|-------|-----|
| Test Beauty Salon | test.provider1@lamsa.test | +962781234567 | a1111111-1111-1111-1111-111111111111 |
| Test Mobile Stylist | test.provider2@lamsa.test | +962787654321 | b2222222-2222-2222-2222-222222222222 |
| Test Nail Studio | test.provider3@lamsa.test | +962799876543 | c3333333-3333-3333-3333-333333333333 |

## Troubleshooting

### CSRF Token Error
- Make sure you're getting a fresh CSRF token before each login
- Check that the `X-CSRF-Token` header matches exactly what was returned
- The token should be in the header, not the body

### Provider Not Found
- Run the setup script: `./postman/setup-test-data.sh`
- Check the database has the test providers
- Verify the email/password match exactly

### Invalid Password
- The password is: `TestProvider123!`
- Make sure there are no extra spaces
- Check that bcrypt is properly hashing (the setup script handles this)