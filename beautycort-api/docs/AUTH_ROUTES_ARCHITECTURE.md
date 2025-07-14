# BeautyCort Auth Routes Architecture

## Overview

The BeautyCort authentication system is designed with a clear separation between customer and provider authentication flows, implementing industry best practices for security, scalability, and maintainability.

## Route Structure

### 1. Customer Auth Endpoints
```
POST /api/auth/customer/send-otp
POST /api/auth/customer/verify-otp
```

### 2. Provider Auth Endpoints  
```
POST /api/auth/provider/send-otp
POST /api/auth/provider/verify-otp
POST /api/auth/provider/signup
POST /api/auth/provider/login
POST /api/auth/provider/forgot-password
POST /api/auth/provider/reset-password
```

### 3. Shared Protected Endpoints
```
GET  /api/auth/me         (requires authentication)
POST /api/auth/signout     (requires authentication)
POST /api/auth/refresh
```

## Why Separate Customer and Provider Endpoints?

### 1. Security Benefits

#### Different Authentication Methods
- **Customers**: Use phone-based OTP authentication for frictionless access
- **Providers**: Use email/password with additional phone verification for enhanced security

#### Separate Rate Limiting
```javascript
// Customer OTP endpoints
otpRateLimiter: 3 requests per 15 minutes per phone number

// Provider auth endpoints
authRateLimiter: 10 requests per 15 minutes per IP
```

#### Role-Based Security Policies
- Customer endpoints can have simpler validation rules
- Provider endpoints require stricter validation (business info, license, etc.)
- Separate audit trails for different user types

### 2. Business Logic Separation

#### Customer Flow
```
Phone → OTP → Instant Access
```
- Minimal data collection (phone, name)
- Quick onboarding for bookings
- No email/password management

#### Provider Flow
```
Email/Password → Phone Verification → Business Details → Admin Approval
```
- Comprehensive business information
- Multi-step verification process
- License and location validation

### 3. Scalability & Maintenance

#### Independent Evolution
- Customer auth can evolve independently (e.g., add social login)
- Provider auth can add features without affecting customers
- Different teams can work on different flows

#### Clear Boundaries
- Easier to debug issues specific to user type
- Simpler to add user-type-specific features
- Better code organization and testing

### 4. Compliance & Regulations

#### Different Data Requirements
- Customers: GDPR-compliant minimal data collection
- Providers: Business registration compliance, tax information

#### Separate Consent Flows
- Different terms of service acceptance
- Provider-specific legal agreements
- Customer privacy preferences

## Implementation Details

### Request Validation

#### Customer Phone Validation
```javascript
body('phone')
  .matches(/^(\+962|962|07|7)[0-9]{8,9}$/)
  .withMessage('Invalid Jordan phone number format')
```

#### Provider Email Validation
```javascript
body('email')
  .isEmail()
  .normalizeEmail()
  .isLength({ max: 255 })
```

#### Provider Password Requirements
```javascript
body('password')
  .isLength({ min: 8 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain uppercase, lowercase and number')
```

### Middleware Stack

#### Customer Endpoints
```javascript
router.post('/customer/send-otp',
  otpRateLimiter,       // Phone-based rate limiting
  validate([...]),      // Input validation
  authController.customerSendOTP
);
```

#### Provider Endpoints
```javascript
router.post('/provider/signup',
  authRateLimiter,      // IP-based rate limiting
  validate([...]),      // Comprehensive validation
  authController.providerSignup
);
```

#### Protected Endpoints
```javascript
router.get('/me',
  authenticate,         // JWT verification
  authController.getCurrentUser
);
```

## Security Model

### Authentication Flow

#### Customer Authentication
1. Phone number submission
2. OTP generation and SMS delivery
3. OTP verification
4. JWT token issuance
5. Automatic user creation if new

#### Provider Authentication
1. Email/password submission OR
2. Phone OTP verification for new signups
3. Business information validation
4. Admin approval (pending implementation)
5. JWT token issuance

### Token Management

#### JWT Payload Structure
```javascript
{
  id: string,
  type: 'customer' | 'provider',
  phone?: string,    // For customers
  email?: string,    // For providers
  iat: number,
  exp: number
}
```

#### Token Expiration
- Access Token: 7 days
- Refresh Token: 30 days

### Rate Limiting Strategy

#### OTP Protection
- 3 attempts per phone per 15 minutes
- Prevents SMS bombing attacks
- Cost protection for SMS services

#### Auth Protection
- 10 attempts per IP per 15 minutes
- Prevents brute force attacks
- Allows legitimate retry attempts

## Error Handling

### Standardized Error Responses
```javascript
{
  success: false,
  error: "Error message",
  errors: [/* Validation errors */]
}
```

### Security-Conscious Errors
- Don't reveal if email exists (provider forgot password)
- Generic errors for authentication failures
- Detailed validation errors only for input format

## Testing Strategy

### Endpoint Categories
1. **Functional Tests**: Valid input scenarios
2. **Validation Tests**: Invalid input handling
3. **Security Tests**: Rate limiting, authentication
4. **Integration Tests**: Full auth flows

### Test Coverage
- All endpoints have validation tests
- Rate limiting is tested separately
- Mock OTP system for development
- Production SMS integration tests

## Future Enhancements

### Planned Features
1. **Two-Factor Authentication** for providers
2. **Biometric Authentication** for mobile customers
3. **OAuth Integration** (Google, Apple)
4. **Session Management** dashboard
5. **Audit Logging** system

### Scalability Considerations
1. **Redis Integration** for session storage
2. **Microservice Extraction** for auth service
3. **Multi-Region Support** for global expansion
4. **Advanced Fraud Detection** using ML

## Conclusion

The separation of customer and provider auth endpoints provides:
- Enhanced security through specialized flows
- Better user experience for each user type
- Easier maintenance and feature development
- Clear compliance boundaries
- Scalable architecture for growth

This architecture allows BeautyCort to serve both customer and provider needs effectively while maintaining high security standards and development velocity.
