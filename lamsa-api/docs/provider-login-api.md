# Provider Login API Documentation

## Overview
The provider login endpoint implements a secure authentication system with JWT tokens, rate limiting, and multi-factor authentication support.

## Endpoint

### POST `/api/auth/provider/login`

Authenticates a provider using email and password credentials.

### Request

#### Headers
```
Content-Type: application/json
```

#### Body
```json
{
  "email": "provider@example.com",
  "password": "SecurePassword123!"
}
```

#### Field Validation
- **email**: Required, must be valid email format
- **password**: Required, non-empty string

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "data": {
    "provider": {
      "id": "uuid-here",
      "business_name_ar": "اسم العمل",
      "business_name_en": "Business Name",
      "owner_name": "John Doe",
      "phone": "+962791234567",
      "email": "provider@example.com",
      "rating": 4.5,
      "total_reviews": 42
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenExpiresIn": "15m",
    "type": "provider"
  },
  "message": "Login successful"
}
```

#### MFA Required (200 OK)
If the provider has MFA enabled:
```json
{
  "success": true,
  "data": {
    "requiresMFA": true,
    "providerId": "uuid-here",
    "message": "Please enter your 2FA code",
    "message_ar": "يرجى إدخال رمز المصادقة الثنائية"
  }
}
```

#### Error Responses

##### Invalid Credentials (401)
```json
{
  "success": false,
  "error": "Invalid email or password. 4 attempts remaining.",
  "code": 401
}
```

##### Account Locked (429)
```json
{
  "success": false,
  "error": "Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.",
  "code": 429
}
```

##### Unverified Account (403)
```json
{
  "success": false,
  "error": "Provider account not verified. Please contact support.",
  "code": 403
}
```

##### Validation Error (400)
```json
{
  "success": false,
  "error": "Email and password are required",
  "code": 400
}
```

## Security Features

### 1. Input Validation & Sanitization
- Email format validation using regex
- Email normalization (lowercase, trimmed)
- Required field validation

### 2. Rate Limiting
- **Limit**: 10 attempts per 15 minutes per IP
- **Skip**: Successful requests don't count
- **Headers**: Returns `RateLimit-*` headers

### 3. Account Lockout Protection
- Tracks failed login attempts per email
- Temporary lockout after multiple failures
- Gradual backoff strategy

### 4. JWT Token Security
```javascript
{
  "id": "provider-uuid",
  "type": "provider",
  "email": "provider@example.com",
  "iat": 1234567890,  // Issued at
  "exp": 1234568790,  // Expiration
  "iss": "lamsa-api",  // Issuer
  "aud": "lamsa-app",  // Audience
  "jti": "unique-token-id" // JWT ID
}
```

### 5. Refresh Token Rotation
- Secure refresh token generation
- Token family tracking
- Automatic revocation on suspicious activity

### 6. Logging & Monitoring
- Failed login attempts logged with IP and user agent
- Successful logins tracked
- Security events recorded

## Implementation Best Practices

### Password Storage
- Passwords hashed using Supabase Auth (bcrypt)
- Never stored in plain text
- Secure comparison prevents timing attacks

### Error Messages
- Generic error messages for security
- Remaining attempts shown to legitimate users
- No user enumeration vulnerability

### Session Management
- JWT tokens expire in 15 minutes (configurable)
- Refresh tokens for extended sessions
- Token blacklisting on logout

### MFA Support
- Optional 2FA for enhanced security
- Separate endpoint for MFA verification
- Grace period for MFA setup

## Usage Example

```typescript
// Login request
const response = await axios.post('/api/auth/provider/login', {
  email: 'provider@example.com',
  password: 'SecurePassword123!'
});

if (response.data.success) {
  if (response.data.data.requiresMFA) {
    // Redirect to MFA verification
    const mfaProviderId = response.data.data.providerId;
    // Show MFA input screen
  } else {
    // Login successful
    const { token, refreshToken, provider } = response.data.data;
    // Store tokens securely
    // Redirect to provider dashboard
  }
}
```

## Testing Considerations

1. **Valid Credentials**: Test with existing provider account
2. **Invalid Credentials**: Verify error handling
3. **Rate Limiting**: Ensure protection against brute force
4. **MFA Flow**: Test both with and without MFA
5. **Token Validation**: Verify JWT structure and claims
6. **Refresh Token**: Test token rotation flow