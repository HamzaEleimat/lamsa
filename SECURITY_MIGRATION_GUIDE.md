# Security Migration Guide

This guide helps you implement the security updates in your Lamsa deployment.

## Overview

This migration implements critical security fixes including:
- SQL injection prevention
- Secure token storage
- Rate limiting
- Input validation
- Atomic database operations

## Migration Steps

### 1. Database Migrations

Run these migrations in order:

```bash
# Navigate to your project directory
cd /path/to/lamsa

# Run the aggregation views migration
supabase db push supabase/migrations/20240121_booking_aggregation_views.sql

# Run the atomic functions migration
supabase db push supabase/migrations/20240122_atomic_booking_functions.sql

# Verify migrations
supabase migration list
```

### 2. API Updates

#### Update Dependencies
```bash
cd lamsa-api
npm install express-rate-limit@latest
npm audit fix
```

#### Environment Variables
Add to your `.env` file:
```env
# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_OTP_MAX=3
RATE_LIMIT_AUTH_MAX=10

# Security
JWT_SECRET=your-secure-jwt-secret-here
SESSION_SECRET=your-secure-session-secret-here
```

#### Deploy API Changes
1. Ensure all TypeScript compiles without errors:
   ```bash
   npm run build
   ```

2. Test locally:
   ```bash
   npm run dev
   ```

3. Deploy to production

### 3. Mobile App Updates

#### Update Mobile Dependencies
```bash
cd lamsa-mobile
npm update expo-secure-store
```

#### Certificate Pinning Setup

1. Extract your API certificate hashes:
   ```bash
   # For your API domain
   openssl s_client -servername api.lamsa.app -connect api.lamsa.app:443 </dev/null 2>/dev/null | \
   openssl x509 -pubkey -noout | \
   openssl pkey -pubin -outform der | \
   openssl dgst -sha256 -binary | \
   openssl enc -base64
   ```

2. Update the certificate hashes in your mobile app configuration

3. Build and deploy the mobile app update

### 4. Web Dashboard Updates

#### Cookie Configuration
Update your web server to set secure cookie attributes:

```typescript
// If using Express for the web dashboard
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

### 5. Testing Checklist

#### Security Testing
- [ ] Test SQL injection prevention
  - Try injecting SQL in search fields
  - Verify special characters are properly escaped
  
- [ ] Test rate limiting
  - Send multiple OTP requests rapidly
  - Verify rate limit messages appear
  
- [ ] Test input validation
  - Try invalid UUIDs, dates, phone numbers
  - Verify appropriate error messages
  
- [ ] Test atomic bookings
  - Try double-booking the same time slot
  - Verify only one booking succeeds

#### Functional Testing
- [ ] Customer booking flow works correctly
- [ ] Provider can manage bookings
- [ ] Authentication works on all platforms
- [ ] Search functionality returns correct results

### 6. Monitoring Setup

#### Log Monitoring
Monitor for security events:
```typescript
// Example log queries to monitor
// Failed authentication attempts
SELECT COUNT(*) FROM logs 
WHERE level = 'error' 
AND message LIKE '%authentication failed%'
AND timestamp > NOW() - INTERVAL '1 hour';

// Rate limit violations
SELECT COUNT(*) FROM logs 
WHERE message LIKE '%rate limit%'
GROUP BY ip_address
ORDER BY COUNT(*) DESC;
```

#### Set Up Alerts
Configure alerts for:
- Multiple failed login attempts
- Rate limit violations
- SQL injection attempts
- Unusual API usage patterns

### 7. Rollback Plan

If issues occur, rollback in this order:

1. **Mobile App**: Use app store rollback features
2. **API**: Deploy previous version
3. **Database**: 
   ```sql
   -- Remove atomic functions
   DROP FUNCTION IF EXISTS create_booking_atomic CASCADE;
   DROP FUNCTION IF EXISTS check_slot_availability_atomic CASCADE;
   DROP FUNCTION IF EXISTS update_booking_status_atomic CASCADE;
   DROP FUNCTION IF EXISTS create_recurring_bookings_atomic CASCADE;
   
   -- Remove aggregation views
   DROP VIEW IF EXISTS booking_stats_by_provider CASCADE;
   DROP MATERIALIZED VIEW IF EXISTS provider_performance_summary CASCADE;
   ```

### 8. Post-Migration Verification

Run these checks after migration:

```bash
# Check API health
curl https://api.lamsa.app/health

# Verify rate limiting
for i in {1..5}; do
  curl -X POST https://api.lamsa.app/api/auth/customer/send-otp \
    -H "Content-Type: application/json" \
    -d '{"phone": "771234567"}'
done

# Test booking creation
curl -X POST https://api.lamsa.app/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": "uuid-here",
    "service_id": "uuid-here",
    "booking_date": "2024-01-25",
    "start_time": "10:00",
    "end_time": "11:00"
  }'
```

## Timeline

Recommended migration timeline:

1. **Day 1**: Deploy database migrations
2. **Day 2**: Deploy API updates
3. **Day 3**: Deploy web dashboard updates
4. **Day 4-5**: Gradual mobile app rollout
5. **Day 6-7**: Monitor and address any issues

## Support

For migration support:
- Review logs for errors
- Check the SECURITY_BEST_PRACTICES.md for implementation details
- Contact the development team for assistance

## Notes

- Always backup your database before running migrations
- Test in a staging environment first
- Have a rollback plan ready
- Monitor system performance after migration
- Document any custom modifications needed for your deployment