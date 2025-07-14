# BeautyCort API Security Improvements

## Overview
This document outlines the critical security enhancements implemented to protect the BeautyCort API, with a focus on mobile app compatibility and preventing common attack vectors.

## 1. Rate Limiting Implementation

### Why It's Critical
- **OTP Abuse Prevention**: Without rate limiting, attackers could spam phone numbers with OTP requests (SMS bombing)
- **Resource Protection**: Prevents API overload from malicious or misbehaving clients
- **Cost Control**: Limits SMS costs from OTP abuse

### What Was Implemented

#### OTP Rate Limiter
```typescript
// 3 OTP requests per phone number per 15 minutes
- Applied to: /api/auth/customer/send-otp
- Applied to: /api/auth/customer/login
- Key: Phone number (not IP) to prevent bypass via proxy
```

#### Auth Rate Limiter
```typescript
// 10 auth attempts per IP per 15 minutes
- Applied to: /api/auth/provider/signup
- Applied to: /api/auth/provider/login
- Skips successful requests to not penalize legitimate users
```

#### Search Rate Limiter
```typescript
// 30 searches per minute per IP
- Applied to: /api/providers/search
- Prevents expensive geo-location query abuse
```

#### General API Rate Limiter
```typescript
// 100 requests per 15 minutes per IP
- Applied to: All API endpoints
- Provides baseline protection
```

## 2. CORS Configuration for Mobile Apps

### Mobile-Specific Requirements
- React Native apps don't send Origin headers
- Expo development uses various ports
- Published Expo apps use special domains

### Enhanced CORS Setup
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    // Allow no-origin requests (mobile apps)
    if (!origin) return callback(null, true);
    
    // Allowed origins include:
    // - Expo development ports (8081, 19000-19002)
    // - Expo published apps (*.exp.direct, *.expo.dev)
    // - Production domains
  },
  credentials: true, // JWT authentication
  exposedHeaders: ['RateLimit-*'], // Rate limit info
  maxAge: 86400 // 24-hour preflight cache
};
```

## 3. Security Headers (Helmet)

### Production Security
- **HSTS**: Forces HTTPS for 1 year with preload
- **CSP**: Restricts resource loading to trusted sources
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing

### Development Flexibility
- CSP disabled in development for easier testing
- HSTS only in production to avoid local SSL issues

## 4. Request Handling Enhancements

### Body Size Limits
```javascript
express.json({ limit: '10mb' }) // For image uploads
```
- Prevents memory exhaustion attacks
- Accommodates base64 image uploads

### Request Timeout
```javascript
req.setTimeout(30000) // 30 seconds
```
- Prevents slow loris attacks
- Handles poor mobile network conditions
- Returns 408 status on timeout

## 5. Middleware Order Explanation

The middleware order is critical for security and functionality:

```javascript
1. helmet()           // Security headers first
2. cors()            // Handle preflight before anything else
3. compression()     // Compress all responses
4. morgan()          // Log all requests
5. body parsing      // Parse request bodies
6. timeout           // Set request timeout
7. rate limiting     // Limit requests
8. routes            // Business logic
9. 404 handler       // Catch undefined routes
10. error handler    // MUST be last - catches all errors
```

### Why This Order?
- **Security First**: Helmet adds headers before any processing
- **CORS Early**: Must handle OPTIONS preflight immediately
- **Logging Everything**: Morgan logs all requests, even failed ones
- **Rate Limit Before Routes**: Prevents expensive operations
- **Error Handler Last**: Express requirement to catch thrown errors

## 6. Attack Vectors Prevented

### 1. SMS Bombing
- Rate limiting by phone number prevents OTP spam
- 3 attempts per 15 minutes per phone

### 2. Brute Force
- Auth rate limiting prevents password guessing
- Successful logins don't count against limit

### 3. DoS/DDoS
- General rate limiting prevents request flooding
- Search rate limiting prevents expensive query abuse

### 4. CORS Attacks
- Strict origin checking prevents unauthorized access
- Credentials only sent to allowed origins

### 5. Header Injection
- Helmet prevents various header-based attacks
- CSP prevents XSS via content injection

### 6. Timeout Attacks
- 30-second timeout prevents slow loris
- Prevents connection pool exhaustion

## 7. Mobile App Considerations

### Network Conditions
- 30-second timeout accommodates slow mobile networks
- Compression reduces data usage

### Development Support
- Multiple Expo ports allowed
- No-origin requests permitted for native apps

### Production Ready
- Expo published app patterns supported
- Rate limits consider mobile usage patterns

## 8. Testing the Security

### Test Rate Limiting
```bash
# Test OTP rate limiting (should fail after 3 attempts)
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/auth/customer/send-otp \
    -H "Content-Type: application/json" \
    -d '{"phone": "+962791234567"}'
done
```

### Test CORS
```bash
# Test from unauthorized origin (should fail)
curl -X POST http://localhost:3001/api/auth/customer/send-otp \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.com" \
  -d '{"phone": "+962791234567"}'
```

### Check Security Headers
```bash
curl -I http://localhost:3001/api/health
```

## 9. Environment Variables

Add to `.env` for development testing:
```env
# Skip rate limiting in development (optional)
SKIP_RATE_LIMIT=true

# Set Node environment
NODE_ENV=development
```

## 10. Monitoring Recommendations

### Rate Limit Headers
Monitor these response headers:
- `RateLimit-Limit`: Request limit
- `RateLimit-Remaining`: Requests left
- `RateLimit-Reset`: Reset timestamp

### Error Patterns
Watch for:
- 429 responses (rate limit exceeded)
- 408 responses (timeout)
- CORS errors in logs

## Conclusion

These security improvements provide:
- **Protection** against common attack vectors
- **Compatibility** with mobile app requirements
- **Performance** optimization for mobile networks
- **Flexibility** for development and testing

The API is now production-ready with enterprise-grade security while maintaining developer-friendly features.
