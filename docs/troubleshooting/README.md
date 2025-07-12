# BeautyCort Troubleshooting Guide

## Quick Reference

This guide provides comprehensive solutions for common issues encountered in the BeautyCort platform. Use the quick navigation below to find solutions fast.

### 🔥 Most Common Issues
1. [OTP SMS not received](#otp-sms-not-received)
2. [Provider location not appearing in search](#provider-location-issues)
3. [Booking time conflicts](#booking-conflicts)
4. [JWT token expiration errors](#token-expiration)
5. [Database connection timeouts](#database-timeouts)

### 📱 Mobile App Issues
- [React Native build failures](#react-native-builds)
- [iOS/Android specific problems](#platform-specific)
- [Expo development issues](#expo-issues)
- [Location permission problems](#location-permissions)

### 🛠️ API Issues
- [Authentication failures](#api-authentication)
- [Geolocation query performance](#geolocation-performance)
- [Payment integration errors](#payment-errors)
- [Database query optimization](#query-optimization)

### 🗄️ Database Issues
- [Connection pool exhaustion](#connection-pool)
- [PostGIS query errors](#postgis-errors)
- [Row Level Security conflicts](#rls-conflicts)
- [Migration failures](#migration-issues)

---

## Authentication Issues

### OTP SMS Not Received

**Problem**: Customers not receiving OTP verification codes

**Symptoms**:
- User reports "didn't receive code"
- SMS delivery logs show failures
- Twilio dashboard shows rejected messages

**Root Causes & Solutions**:

#### 1. Phone Number Format Issues
```bash
# Check phone number normalization
curl -X POST http://localhost:3000/api/auth/customer/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "0791234567"}'  # Local format should work

# Verify normalization in logs
tail -f /var/log/beautycort-api/app.log | grep "phone_normalized"
```

**Fix**: Ensure phone number validation accepts all Jordan formats:
```javascript
// In phone-validation.ts
const normalizeJordanPhone = (phone) => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (digits.startsWith('962')) return `+${digits}`;
  if (digits.startsWith('0')) return `+962${digits.slice(1)}`;
  if (digits.length === 9) return `+962${digits}`;
  
  throw new Error('Invalid Jordan phone number format');
};
```

#### 2. Twilio Account Issues
```bash
# Check Twilio account status
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN

# Verify phone number verification status
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/OutgoingCallerIds.json" \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
```

**Common Fixes**:
- Verify Twilio account is not suspended
- Check international SMS permissions for Jordan (+962)
- Ensure sufficient account balance
- Verify sender phone number is validated

#### 3. Rate Limiting Issues
```sql
-- Check OTP attempt frequency
SELECT phone, COUNT(*) as attempts, MAX(created_at) as last_attempt
FROM otp_attempts 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY phone
HAVING COUNT(*) > 5;
```

**Fix**: Implement proper rate limiting:
```javascript
// In auth controller
const checkRateLimit = async (phone) => {
  const recentAttempts = await redis.get(`otp_attempts:${phone}`);
  if (recentAttempts && parseInt(recentAttempts) >= 3) {
    throw new Error('Too many OTP requests. Please wait 15 minutes.');
  }
};
```

### JWT Token Expiration Errors

**Problem**: Users getting logged out unexpectedly or API returning 401 errors

**Symptoms**:
- "Token expired" errors in mobile app
- Automatic logout on app resume
- API calls failing with 401 status

**Root Causes & Solutions**:

#### 1. Token Not Being Refreshed
```javascript
// Check token expiry in mobile app
const checkTokenExpiry = () => {
  const token = await AsyncStorage.getItem('jwt_token');
  const decoded = jwt_decode(token);
  const now = Date.now() / 1000;
  
  if (decoded.exp - now < 300) { // Refresh if <5 minutes left
    await refreshToken();
  }
};
```

#### 2. Refresh Token Implementation
```javascript
// Proper refresh token flow
const refreshToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    const response = await api.post('/auth/refresh', { refreshToken });
    
    await AsyncStorage.setItem('jwt_token', response.data.token);
    return response.data.token;
  } catch (error) {
    // Refresh failed, redirect to login
    await logout();
    navigation.navigate('Login');
  }
};
```

---

## Geolocation Issues

### Provider Location Not Appearing in Search

**Problem**: Verified providers not showing up in location-based searches

**Symptoms**:
- Empty search results in areas with known providers
- Distance calculations returning null
- PostGIS queries timing out

**Debugging Steps**:

#### 1. Verify Provider Location Data
```sql
-- Check provider locations are properly stored
SELECT id, business_name, 
       ST_X(location::geometry) as longitude,
       ST_Y(location::geometry) as latitude,
       verified, active
FROM providers 
WHERE verified = true AND active = true;

-- Verify locations are within Jordan boundaries
SELECT COUNT(*) FROM providers 
WHERE ST_Within(
  location::geometry, 
  ST_MakeEnvelope(34.960, 29.185, 39.301, 33.375, 4326)
);
```

#### 2. Test Distance Calculations
```sql
-- Test proximity search from Amman center
SELECT id, business_name,
       ST_Distance(
         location::geography,
         ST_SetSRID(ST_MakePoint(35.9106, 31.9539), 4326)::geography
       ) / 1000 as distance_km
FROM providers 
WHERE verified = true AND active = true
ORDER BY distance_km
LIMIT 10;
```

#### 3. Performance Optimization
```sql
-- Ensure GIST index exists and is being used
EXPLAIN ANALYZE 
SELECT * FROM providers 
WHERE verified = true AND active = true
AND ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(35.9106, 31.9539), 4326)::geography,
  5000  -- 5km radius
);

-- Should show: Index Scan using idx_providers_location_verified_active
```

**Common Fixes**:
- Recreate GIST index if corrupted: `REINDEX INDEX idx_providers_location_verified_active;`
- Update table statistics: `ANALYZE providers;`
- Increase PostGIS memory settings in postgresql.conf

### Mobile Service Radius Issues

**Problem**: Mobile providers not appearing for customers outside their base location

**Root Cause**: Travel radius not being properly considered in queries

**Fix**: Update provider search function:
```sql
-- Enhanced provider search with mobile service support
SELECT p.*, 
       CASE 
         WHEN p.is_mobile THEN p.travel_radius_km * 1000
         ELSE 5000  -- Default 5km for salon-based
       END as effective_radius
FROM providers p
WHERE p.verified = TRUE AND p.active = TRUE
AND ST_DWithin(
  p.location::geography,
  ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
  CASE 
    WHEN p.is_mobile THEN p.travel_radius_km * 1000
    ELSE $3  -- User-specified radius
  END
);
```

---

## Booking System Issues

### Booking Time Conflicts

**Problem**: Double bookings or overlapping appointments

**Symptoms**:
- Provider receives multiple bookings for same time slot
- Database constraint violations
- Customer complaints about confirmed unavailable slots

**Debugging**:
```sql
-- Find conflicting bookings
SELECT provider_id, booking_date, start_time, end_time, 
       COUNT(*) as booking_count
FROM bookings 
WHERE status IN ('confirmed', 'pending', 'in_progress')
GROUP BY provider_id, booking_date, start_time, end_time
HAVING COUNT(*) > 1;

-- Check availability function performance
EXPLAIN ANALYZE 
SELECT check_provider_availability(
  'provider-uuid', 
  '2024-01-15', 
  '14:00', 
  60
);
```

**Root Causes & Fixes**:

#### 1. Race Condition in Booking Creation
```javascript
// Use database transactions to prevent race conditions
const createBooking = async (bookingData) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check availability within transaction
    const isAvailable = await client.query(
      'SELECT check_provider_availability($1, $2, $3, $4)',
      [providerId, date, startTime, duration]
    );
    
    if (!isAvailable.rows[0].check_provider_availability) {
      throw new Error('Time slot no longer available');
    }
    
    // Create booking
    const booking = await client.query(
      'INSERT INTO bookings (...) VALUES (...) RETURNING *',
      bookingData
    );
    
    await client.query('COMMIT');
    return booking.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

#### 2. Provider Availability Settings
```sql
-- Verify provider availability is properly configured
SELECT * FROM provider_availability 
WHERE provider_id = 'provider-uuid'
ORDER BY day_of_week;

-- Check for gaps or overlaps in availability
WITH availability_gaps AS (
  SELECT provider_id, day_of_week, start_time, end_time,
         LAG(end_time) OVER (PARTITION BY provider_id, day_of_week ORDER BY start_time) as prev_end
  FROM provider_availability
  WHERE is_available = true
)
SELECT * FROM availability_gaps 
WHERE start_time < prev_end;  -- Overlapping times
```

---

## Database Performance Issues

### Connection Pool Exhaustion

**Problem**: "too many clients already" errors from PostgreSQL

**Symptoms**:
- API requests timing out
- Database connection errors in logs
- Application becoming unresponsive

**Immediate Fix**:
```bash
# Check current connections
psql -h your-db-host -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
psql -h your-db-host -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < now() - interval '5 minutes';"
```

**Long-term Solutions**:

#### 1. Optimize Connection Pool Settings
```javascript
// In database configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Optimized pool settings
  max: 20,                    // Maximum connections
  min: 2,                     // Minimum connections
  idleTimeoutMillis: 10000,   // Close idle connections after 10s
  connectionTimeoutMillis: 2000, // Timeout connection attempts
  acquireTimeoutMillis: 5000, // Timeout acquiring from pool
});
```

#### 2. Implement Connection Monitoring
```javascript
// Monitor pool health
setInterval(() => {
  console.log('Pool status:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
}, 30000);
```

### Query Performance Issues

**Problem**: Slow database queries affecting API response times

**Common Slow Queries**:

#### 1. Provider Search Without Proper Indexing
```sql
-- Slow query (missing index)
SELECT * FROM providers 
WHERE business_name ILIKE '%salon%' 
AND city = 'Amman';

-- Fast query (with proper index)
CREATE INDEX idx_providers_search ON providers 
USING GIN(to_tsvector('arabic', business_name || ' ' || business_name_ar));

SELECT * FROM providers 
WHERE to_tsvector('arabic', business_name || ' ' || business_name_ar) 
@@ plainto_tsquery('arabic', 'salon');
```

#### 2. Booking History Queries
```sql
-- Optimize booking history with proper index
CREATE INDEX idx_bookings_user_created_desc ON bookings 
(user_id, created_at DESC);

-- Use LIMIT to prevent full table scans
SELECT * FROM bookings 
WHERE user_id = $1 
ORDER BY created_at DESC 
LIMIT 20 OFFSET $2;
```

---

## Mobile App Issues

### React Native Build Failures

**Problem**: App fails to build for iOS or Android

**Common Solutions**:

#### 1. Clear Caches
```bash
# Clear all caches
npm start -- --clear
rm -rf node_modules && npm install
cd ios && rm -rf build && cd ..
cd android && ./gradlew clean && cd ..

# Reset Metro bundler
npx react-native start --reset-cache
```

#### 2. iOS Specific Issues
```bash
# Update CocoaPods
cd ios
pod deintegrate && pod install
cd ..

# Fix Xcode build issues
npx react-native-asset
npx react-native link
```

#### 3. Android Specific Issues
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug
cd ..

# Fix dependency issues
npx jetify
```

### Location Permission Issues

**Problem**: App can't access user location

**Platform-Specific Fixes**:

#### iOS (Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>BeautyCort needs location access to find nearby beauty providers</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>BeautyCort needs location access to find nearby beauty providers</string>
```

#### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

#### Runtime Permission Handling
```javascript
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const requestLocationPermission = async () => {
  const permission = Platform.OS === 'ios' 
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
    
  const result = await request(permission);
  
  if (result === RESULTS.GRANTED) {
    return true;
  } else {
    // Handle permission denied
    Alert.alert(
      'Location Permission Required',
      'Please enable location access in settings to find nearby providers.'
    );
    return false;
  }
};
```

---

## Getting Help

### Escalation Process

1. **Check this documentation** for common solutions
2. **Review application logs** for specific error messages  
3. **Check monitoring dashboards** for system-wide issues
4. **Contact development team** with detailed error information

### Useful Log Locations

```bash
# API server logs
tail -f /var/log/beautycort-api/app.log
tail -f /var/log/beautycort-api/error.log

# Database logs (Supabase)
# Access through Supabase dashboard -> Logs

# Mobile app logs
# iOS: Xcode Console
# Android: adb logcat | grep BeautyCort
```

### Monitoring and Alerts

- **API Performance**: New Relic or similar APM
- **Database Metrics**: Supabase dashboard
- **Error Tracking**: Sentry for runtime errors
- **Uptime Monitoring**: Pingdom or similar service

This troubleshooting guide covers the most common issues encountered in the BeautyCort platform. Keep this document updated as new issues are discovered and resolved.
