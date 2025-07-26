# Lamsa Security Best Practices

This document outlines the security measures implemented in the Lamsa platform and provides guidelines for maintaining security standards.

## Table of Contents
1. [SQL Injection Prevention](#sql-injection-prevention)
2. [Authentication & Token Management](#authentication--token-management)
3. [Rate Limiting](#rate-limiting)
4. [Input Validation](#input-validation)
5. [Database Security](#database-security)
6. [Mobile App Security](#mobile-app-security)
7. [API Security](#api-security)
8. [Security Checklist](#security-checklist)

## SQL Injection Prevention

### Implementation
We use the `SecureQueryBuilder` utility class to prevent SQL injection attacks:

```typescript
// ❌ VULNERABLE - Never do this
query = query.or(`business_name_ar.ilike."${searchPattern}"`);

// ✅ SECURE - Always use parameterized queries
const escapedTerm = SecureQueryBuilder.escapeLikePattern(
  SecureQueryBuilder.validateParam(searchParams.query, 'searchTerm')
);
query = query.or(`business_name_ar.ilike.%${escapedTerm}%`);
```

### Key Functions
- `validateParam()` - Validates and sanitizes input parameters
- `escapeLikePattern()` - Escapes special characters in LIKE patterns
- `validateUUID()` - Ensures UUID format is valid
- `validateDate()` - Validates date inputs
- `validatePagination()` - Sanitizes pagination parameters

## Authentication & Token Management

### JWT Token Storage

#### Web Application
- **Never store JWT tokens in localStorage or sessionStorage**
- Use HttpOnly, Secure, SameSite cookies
- All API calls must include `credentials: 'include'`

```typescript
// ✅ Correct implementation
const response = await fetch(`${API_URL}/auth/me`, {
  credentials: 'include', // Include cookies
  headers: {
    'Content-Type': 'application/json',
  },
});
```

#### Mobile Application
- Use Expo SecureStore for token storage
- **Never fallback to AsyncStorage for sensitive data**
- Handle unavailable secure storage gracefully

```typescript
// ✅ Secure token storage
await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, tokenString);

// ❌ Never do this
await AsyncStorage.setItem(TOKEN_STORAGE_KEY, tokenString);
```

### Phone Authentication
- Implement OTP verification for Jordanian phone numbers
- Validate phone number format: `/^7[789]\d{6}$/`
- Rate limit OTP requests to prevent abuse

## Rate Limiting

### Implemented Limits
- **OTP Requests**: 3 requests per 15 minutes per phone
- **OTP Verification**: 5 attempts per 15 minutes per phone
- **Authentication**: 10 attempts per 15 minutes per IP

### Implementation
```typescript
// Rate limiter configuration
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: {
    en: 'Too many OTP requests. Please try again later.',
    ar: 'طلبات كثيرة جداً لرمز التحقق. يرجى المحاولة لاحقاً.'
  },
  keyGenerator: (req) => req.body.phone || req.ip
});
```

## Input Validation

### Mobile Services
All mobile services must validate input using the validation utility:

```typescript
import { 
  validateUUID, 
  validateDate, 
  validateTime, 
  validateAmount,
  sanitizeString 
} from '../utils/validation';

// Example usage
const validatedId = validateUUID(providerId, 'providerId');
const validatedDate = validateDate(bookingDate, 'bookingDate');
const validatedNotes = notes ? sanitizeString(notes, 'notes') : undefined;
```

### Validation Functions
- `validateUUID()` - Validates UUID format
- `validateEmail()` - Validates email format
- `validateDate()` - Validates date strings
- `validateTime()` - Validates HH:mm format
- `validateAmount()` - Validates monetary amounts
- `validateCoordinates()` - Validates lat/lng
- `sanitizeString()` - Removes potential XSS vectors
- `validateJordanianPhone()` - Validates local phone format

## Database Security

### Atomic Operations
Use database functions to prevent race conditions:

```sql
-- Atomic booking creation
SELECT create_booking_atomic(
  p_user_id := $1,
  p_provider_id := $2,
  p_service_id := $3,
  p_booking_date := $4,
  p_start_time := $5,
  p_end_time := $6,
  p_total_amount := $7,
  p_payment_method := $8
);
```

### Database Aggregations
Use server-side aggregation functions instead of fetching all data:

```typescript
// ✅ Efficient database aggregation
const { data } = await supabase.rpc('get_booking_stats_by_period', {
  p_provider_id: validatedId,
  p_start_date: startDate,
  p_end_date: endDate
});

// ❌ Inefficient client-side aggregation
const { data } = await supabase.from('bookings').select('*');
const stats = data.reduce((acc, booking) => { /* ... */ });
```

### Row Level Security (RLS)
Ensure all tables have appropriate RLS policies:

```sql
-- Example: Users can only see their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

-- Example: Providers can view their bookings
CREATE POLICY "Providers can view their bookings" ON bookings
  FOR SELECT USING (auth.uid() = provider_id);
```

## Mobile App Security

### Certificate Pinning
Implement certificate pinning to prevent MITM attacks:

```typescript
// Extract certificate hashes for your domains
const CERTIFICATE_HASHES = {
  'api.lamsa.app': ['sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='],
  'supabase.co': ['sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=']
};
```

### Secure Storage
- Always use SecureStore for sensitive data
- Never store sensitive data in AsyncStorage
- Handle secure storage unavailability gracefully

### API Keys
- Never hardcode API keys in source code
- Use environment variables
- Implement key rotation strategy

## API Security

### CORS Configuration
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Request Validation
- Validate all input parameters
- Use express-validator for request validation
- Return appropriate error messages without exposing system details

### Error Handling
```typescript
// ✅ Secure error response
res.status(400).json({
  success: false,
  error: 'Invalid input'
});

// ❌ Avoid exposing internal details
res.status(500).json({
  success: false,
  error: error.stack // Never expose stack traces
});
```

## Security Checklist

### Before Each Release
- [ ] Run dependency vulnerability scan: `npm audit`
- [ ] Update all dependencies to latest secure versions
- [ ] Review all database queries for SQL injection risks
- [ ] Verify all user inputs are validated
- [ ] Check that sensitive data is not logged
- [ ] Ensure error messages don't expose system details
- [ ] Verify rate limiting is working correctly
- [ ] Test authentication flows thoroughly
- [ ] Review CORS configuration
- [ ] Check for hardcoded secrets or API keys

### Monthly Security Review
- [ ] Review and rotate API keys
- [ ] Check for unusual access patterns in logs
- [ ] Update certificate pins if needed
- [ ] Review user permissions and access controls
- [ ] Audit database access logs
- [ ] Update security documentation
- [ ] Train team on new security threats

### Incident Response
1. **Detection**: Monitor logs for suspicious activity
2. **Containment**: Immediately revoke compromised credentials
3. **Investigation**: Analyze logs to understand the breach
4. **Remediation**: Fix vulnerabilities and patch systems
5. **Communication**: Notify affected users if required
6. **Documentation**: Document lessons learned

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [React Native Security](https://reactnative.dev/docs/security)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Contact

For security concerns or to report vulnerabilities, please contact:
- Email: security@lamsa.app
- Use responsible disclosure practices