# Authentication System Documentation

The BeautyCort API uses a dual authentication system to handle both customers (who book services) and providers (who offer services).

## Overview

- **Customers**: Phone-based authentication with OTP (SMS verification)
- **Providers**: Email/password authentication with JWT tokens
- **Phone Validation**: Jordan mobile numbers (+962) only

## Authentication Endpoints

### Customer Authentication

#### 1. Customer Signup
```http
POST /api/auth/customer/signup
Content-Type: application/json

{
  "phone": "0791234567",      // Jordan format
  "name": "أحمد محمد",
  "email": "ahmad@example.com", // optional
  "language": "ar"              // ar or en, defaults to ar
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+962791234567",
      "name": "أحمد محمد",
      "email": "ahmad@example.com",
      "language": "ar"
    },
    "token": "jwt-token",
    "type": "customer"
  },
  "message": "Customer account created successfully"
}
```

#### 2. Customer Login
```http
POST /api/auth/customer/login
Content-Type: application/json

{
  "phone": "0791234567"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt-token",
    "type": "customer"
  },
  "message": "Login successful"
}
```

**Note**: In production, this would trigger an OTP to be sent via SMS.

#### 3. Verify OTP (Production Only)
```http
POST /api/auth/customer/verify-otp
Content-Type: application/json

{
  "phone": "0791234567",
  "otp": "123456"
}
```

### Provider Authentication

#### 1. Provider Signup
```http
POST /api/auth/provider/signup
Content-Type: application/json

{
  "email": "salon@example.com",
  "password": "securePassword123",
  "phone": "0791234567",
  "business_name_ar": "صالون الجمال",
  "business_name_en": "Beauty Salon",
  "owner_name": "فاطمة أحمد",
  "latitude": 31.9539,
  "longitude": 35.9106,
  "address": {
    "street": "شارع الملك حسين",
    "city": "عمان",
    "district": "الدوار السابع",
    "country": "الأردن"
  },
  "license_number": "12345" // optional
}

Response:
{
  "success": true,
  "data": {
    "provider": {
      "id": "uuid",
      "business_name_ar": "صالون الجمال",
      "business_name_en": "Beauty Salon",
      "owner_name": "فاطمة أحمد",
      "phone": "+962791234567",
      "email": "salon@example.com",
      "verified": false
    },
    "token": "jwt-token",
    "type": "provider"
  },
  "message": "Provider account created successfully. Pending verification."
}
```

#### 2. Provider Login
```http
POST /api/auth/provider/login
Content-Type: application/json

{
  "email": "salon@example.com",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "data": {
    "provider": { ... },
    "token": "jwt-token",
    "type": "provider"
  },
  "message": "Login successful"
}
```

### Common Endpoints

#### 1. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json
Authorization: Bearer <current-token>

{
  "refreshToken": "refresh-token"
}

Response:
{
  "success": true,
  "data": {
    "token": "new-jwt-token"
  }
}
```

#### 2. Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Logout successful"
}
```

### Provider-Only Endpoints

#### 1. Forgot Password
```http
POST /api/auth/provider/forgot-password
Content-Type: application/json

{
  "email": "salon@example.com"
}

Response:
{
  "success": true,
  "message": "Password reset instructions sent to your email"
}
```

#### 2. Reset Password
```http
POST /api/auth/provider/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}

Response:
{
  "success": true,
  "message": "Password reset successful. Please login with your new password."
}
```

## Phone Number Validation

The system accepts Jordan phone numbers in these formats:
- `+962791234567` (International format)
- `962791234567` (Country code without +)
- `0791234567` (Local format with 0)
- `791234567` (Local format without 0)

All formats are normalized to `+962XXXXXXXXX` before storage.

Valid mobile prefixes for Jordan: `77`, `78`, `79`

## JWT Token Structure

```json
{
  "id": "user-or-provider-uuid",
  "type": "customer" | "provider",
  "phone": "+962791234567",  // for customers
  "email": "email@example.com", // for providers
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

Common error codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (unverified provider)
- `404` - Not Found (user/provider not found)
- `409` - Conflict (phone/email already exists)
- `500` - Internal Server Error

## Security Considerations

1. **Passwords**: Minimum 6 characters, hashed using bcrypt
2. **JWT Tokens**: 
   - Default expiration: 7 days
   - Secret key from environment variable
3. **Phone Verification**: OTP required for customers in production
4. **Provider Verification**: Manual admin verification required
5. **Rate Limiting**: Should be implemented for auth endpoints
6. **HTTPS**: Required in production

## Using Authentication in Requests

Include the JWT token in the Authorization header:
```http
Authorization: Bearer <jwt-token>
```

The middleware will decode the token and attach user information to `req.user`:
```typescript
req.user = {
  id: "uuid",
  type: "customer" | "provider",
  phone?: string,
  email?: string
}
```

## Development vs Production

### Development Mode
- Customer login returns JWT immediately (no OTP)
- OTP verification accepts any 6-digit number
- Provider verification is bypassed

### Production Mode
- Customer login sends real OTP via SMS
- OTP verification checks against stored OTP
- Provider accounts require admin verification
- Password reset sends real emails
- Token blacklisting should be implemented