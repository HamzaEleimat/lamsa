# Two-Phase Authentication Architecture for BeautyCort

## Executive Summary

This document outlines the complete redesign of BeautyCort's authentication system to implement secure two-phase authentication that prevents account creation before proper identity verification. The new architecture addresses critical security gaps in the current system and provides a consistent phone-based verification flow for both customers and providers.

## Architecture Principles

### Core Design Goals
1. **True Two-Phase Flow**: Identity verification must be completely separate from account creation
2. **Phone-Only Verification**: Consistent experience using Jordan phone numbers for all users
3. **Auto-Approval**: Providers are auto-approved after phone verification for fast onboarding
4. **Security First**: Prevent spam accounts, SMS bombing, and unauthorized access
5. **Clean Implementation**: No backwards compatibility constraints

### Security Requirements
- No account creation without verified phone ownership
- Comprehensive rate limiting to prevent abuse
- Proper session state management between phases
- Audit logging for security events
- Protection against common attack vectors

## Authentication Flow Architecture

### Phase 1: Identity Verification
**Goal**: Verify phone number ownership without creating any accounts

#### Customer Identity Verification
```
POST /auth/customer/request-verification
Input: { phone }
Output: { verificationId, expiresAt }

POST /auth/customer/verify-identity
Input: { verificationId, otp }
Output: { tempToken, isNewUser, expiresAt }
```

#### Provider Identity Verification
```
POST /auth/provider/request-verification
Input: { phone }
Output: { verificationId, expiresAt }

POST /auth/provider/verify-identity
Input: { verificationId, otp }
Output: { tempToken, isNewUser, expiresAt }
```

### Phase 2: Account Access/Creation
**Goal**: Create new accounts or access existing ones using verified identity

#### Customer Account Flow
```
POST /auth/customer/complete-signup (if isNewUser = true)
Input: { tempToken, name, language?, preferences? }
Output: { user, token, refreshToken }

POST /auth/customer/complete-login (if isNewUser = false)
Input: { tempToken }
Output: { user, token, refreshToken }
```

#### Provider Account Flow
```
POST /auth/provider/complete-signup (if isNewUser = true)
Input: { tempToken, businessProfile }
Output: { provider, token, refreshToken, status: "active" }

POST /auth/provider/complete-login (if isNewUser = false)
Input: { tempToken }
Output: { provider, token, refreshToken, status }
```

## Session State Management

### Authentication States
```typescript
enum AuthState {
  IDENTITY_VERIFICATION = 'identity_verification',    // Phase 1
  ACCOUNT_COMPLETION = 'account_completion',          // Phase 2 for new users
  ACTIVE_SESSION = 'active_session'                   // Fully authenticated
}
```

### Token Types
1. **Verification Token**: Short-lived (15 min) for identity verification
2. **Temporary Token**: Medium-lived (30 min) for account creation/access
3. **Access Token**: Long-lived (7 days) for authenticated sessions
4. **Refresh Token**: Extended-lived (30 days) for token renewal

### Session Security Features
- CSRF token generation and validation
- Session fingerprinting (IP + User-Agent hash)
- Geographic anomaly detection (Jordan-focused)
- Suspicious activity monitoring
- Automatic token rotation

## Error Handling Strategy

### Standardized Error Responses
```typescript
interface AuthError {
  success: false;
  error: {
    code: string;
    message: string;
    messageAr?: string;
    details?: any;
    retryAfter?: number;
    supportedActions?: string[];
  };
}
```

### Error Categories
1. **Validation Errors**: Invalid input format, missing fields
2. **Rate Limit Errors**: Too many requests, progressive backoff
3. **Verification Errors**: Invalid/expired OTP, phone format issues
4. **Security Errors**: Suspicious activity, blocked accounts
5. **System Errors**: SMS delivery failures, database issues

### Rate Limiting Strategy

#### OTP Request Limits
- **Per Phone**: 3 requests per 15 minutes
- **Per IP**: 10 requests per 15 minutes
- **Per Session**: 5 failed verifications = 1 hour block

#### Account Creation Limits
- **Per IP**: 2 account creations per hour
- **Per Device**: 1 account creation per day (using fingerprinting)

#### Progressive Penalties
- First violation: Standard cooldown
- Second violation: Double cooldown
- Third+ violation: CAPTCHA required + extended cooldown

## Security Features

### Anti-Spam Protection
1. **Phone Number Validation**: Strict Jordan format validation
2. **Carrier Verification**: Optional integration with Jordan telecom providers
3. **Duplicate Prevention**: Phone number uniqueness across all user types
4. **Bot Detection**: CAPTCHA integration for suspicious patterns

### Session Security
1. **Device Fingerprinting**: Browser + device characteristics
2. **IP Monitoring**: Geographic consistency checks
3. **Session Rotation**: Automatic token refresh on sensitive operations
4. **Concurrent Session Control**: Limit active sessions per user

### Audit Logging
```typescript
interface AuthAuditLog {
  timestamp: string;
  userId?: string;
  phone?: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  ipAddress: string;
  userAgent: string;
  riskScore: number;
  details: Record<string, any>;
}
```

## Data Protection

### Temporary Data Storage
- Verification codes: 15-minute TTL in Redis
- Temporary tokens: 30-minute TTL with automatic cleanup
- Failed attempt counters: 24-hour TTL with progressive increase

### Encryption Standards
- All temporary tokens encrypted with AES-256
- Phone numbers hashed for lookup indexes
- Sensitive logs encrypted at rest

### Data Retention
- Verification attempts: 30 days
- Audit logs: 1 year
- Failed attempt patterns: 90 days
- Temporary sessions: Auto-expire

## Implementation Components

### New Files to Create
1. `src/controllers/auth-v2.controller.ts` - New authentication controller
2. `src/services/verification.service.ts` - Identity verification logic
3. `src/services/session.service.ts` - Session state management
4. `src/middleware/csrf.middleware.ts` - CSRF protection
5. `src/middleware/fingerprint.middleware.ts` - Device fingerprinting
6. `src/types/auth-v2.types.ts` - New type definitions
7. `src/utils/security.utils.ts` - Security helper functions

### Enhanced Existing Files
1. `src/middleware/rate-limit.middleware.ts` - Enhanced rate limiting
2. `src/middleware/auth.middleware.ts` - Support for new token types
3. `src/routes/auth.routes.ts` - New endpoint definitions

## Database Schema Changes

### New Tables Required
```sql
-- Temporary verification sessions
CREATE TABLE verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  verification_code VARCHAR(10) NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);

-- Temporary authenticated sessions
CREATE TABLE temp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  is_new_user BOOLEAN NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- 'customer' or 'provider'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  ip_address INET,
  fingerprint_hash VARCHAR(255)
);

-- Authentication audit logs
CREATE TABLE auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  phone VARCHAR(20),
  action VARCHAR(100) NOT NULL,
  result VARCHAR(20) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  risk_score INTEGER DEFAULT 0,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rate limiting counters
CREATE TABLE rate_limit_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type VARCHAR(50) NOT NULL, -- 'phone', 'ip', 'fingerprint'
  key_value VARCHAR(255) NOT NULL,
  counter INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(key_type, key_value)
);
```

## Testing Strategy

### Unit Tests
- Phone validation functions
- OTP generation and verification
- Token creation and validation
- Rate limiting logic
- Error handling scenarios

### Integration Tests
- Complete authentication flows
- Cross-user-type scenarios
- Rate limiting enforcement
- Security feature validation
- Database transaction integrity

### Security Tests
- SMS bombing protection
- Brute force resistance
- Session hijacking prevention
- CSRF attack prevention
- SQL injection resistance

### Performance Tests
- High-volume OTP requests
- Concurrent verification attempts
- Database query optimization
- Memory usage monitoring
- Response time benchmarks

## Migration Plan

### Phase 1: Foundation (Week 1)
1. Create new database tables
2. Implement verification service
3. Build session management
4. Set up enhanced rate limiting

### Phase 2: Core Authentication (Week 2)
1. Implement new auth controller
2. Create CSRF middleware
3. Add device fingerprinting
4. Build audit logging system

### Phase 3: Security Features (Week 3)
1. Add suspicious activity detection
2. Implement progressive penalties
3. Create security monitoring
4. Add geographic validation

### Phase 4: Testing & Deployment (Week 4)
1. Comprehensive testing suite
2. Performance optimization
3. Documentation completion
4. Production deployment

## Monitoring & Alerting

### Key Metrics
- OTP delivery success rate
- Verification completion rate
- Account creation rate
- Failed attempt patterns
- Geographic distribution

### Alert Conditions
- SMS delivery failure > 10%
- Failed verification rate > 20%
- Unusual geographic activity
- Rate limit violations > threshold
- Security violations detected

## Compliance Considerations

### Jordan Telecom Regulations
- Phone number format compliance
- SMS delivery requirements
- Data retention policies
- Cross-border data restrictions

### Privacy Requirements
- User consent for data collection
- Right to data deletion
- Audit trail maintenance
- Secure data transmission

## Success Criteria

### Security Metrics
- Zero successful spam account creation
- < 0.1% false positive rate for legitimate users
- 100% phone ownership verification
- < 1 second average response time

### User Experience Metrics
- > 95% OTP delivery success rate
- < 30 seconds average verification time
- < 2% user abandonment rate
- > 99% uptime availability

This architecture provides enterprise-grade security while maintaining a smooth user experience optimized for the Jordan market and BeautyCort's business requirements.
