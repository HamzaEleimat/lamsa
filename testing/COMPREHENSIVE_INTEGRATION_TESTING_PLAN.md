# Lamsa Comprehensive Integration Testing Plan

## Overview

This document outlines a comprehensive integration testing strategy for the Lamsa platform, covering all user types, critical paths, and system integrations across the mobile app, API backend, and database layers.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [User Type Coverage](#user-type-coverage)
3. [Critical Path Testing](#critical-path-testing)
4. [Automated Test Scenarios](#automated-test-scenarios)
5. [Manual Testing Checklists](#manual-testing-checklists)
6. [Performance Testing](#performance-testing)
7. [User Acceptance Testing](#user-acceptance-testing)
8. [Test Data Management](#test-data-management)
9. [Environment Setup](#environment-setup)
10. [Test Execution Timeline](#test-execution-timeline)

---

## Testing Strategy

### Scope
- **API Integration**: Full CRUD operations across all controllers
- **Mobile App Integration**: Complete user journeys from auth to service completion
- **Database Integration**: Data consistency, constraints, and business rule validation
- **External Service Integration**: Supabase Auth, SMS/OTP, geolocation services
- **Cross-platform Testing**: iOS, Android, and web dashboard compatibility

### Testing Pyramid
```
                    E2E Tests (20%)
                 ┌─────────────────┐
                 │  User Journeys  │
                 │  Cross-platform │
                 └─────────────────┘
              Integration Tests (30%)
           ┌─────────────────────────┐
           │   API ↔ Database       │
           │   Service Integrations  │
           └─────────────────────────┘
         Unit Tests (50%)
    ┌─────────────────────────────────┐
    │    Controllers, Services,       │
    │    Utilities, Components        │
    └─────────────────────────────────┘
```

---

## User Type Coverage

### 1. Customer User Personas

#### 1.1 New Customer (First-time User)
- **Profile**: First-time app user, no previous bookings
- **Test Scenarios**: Registration flow, service discovery, first booking
- **Expected Behavior**: Smooth onboarding, loyalty program enrollment

#### 1.2 Returning Customer
- **Profile**: Existing user with booking history
- **Test Scenarios**: Login, rebooking favorite services, loyalty points usage
- **Expected Behavior**: Personalized experience, booking history accessible

#### 1.3 Loyalty Program Members
- **Profile**: Users across different tiers (Bronze/Silver/Gold/Platinum)
- **Test Scenarios**: Points earning, tier upgrades, exclusive promotions
- **Expected Behavior**: Tier-appropriate benefits and discounts

#### 1.4 Location-Based Users
- **Profile**: Users in different areas of Jordan
- **Test Scenarios**: Provider search by proximity, mobile service requests
- **Expected Behavior**: Accurate distance calculations, relevant provider suggestions

#### 1.5 Multi-language Users
- **Profile**: Arabic vs English preference users
- **Test Scenarios**: Language switching, RTL support, content localization
- **Expected Behavior**: Consistent experience across languages

### 2. Provider User Personas

#### 2.1 New Provider (Pending Verification)
- **Profile**: Recently registered, awaiting admin approval
- **Test Scenarios**: Registration, profile completion, verification workflow
- **Expected Behavior**: Limited access until verified

#### 2.2 Verified Active Provider
- **Profile**: Established provider with active services
- **Test Scenarios**: Booking management, service updates, availability settings
- **Expected Behavior**: Full platform functionality

#### 2.3 Mobile Service Provider
- **Profile**: Provider offering services at customer locations
- **Test Scenarios**: Travel radius settings, location-based bookings
- **Expected Behavior**: Extended service area coverage

#### 2.4 Salon-Based Provider
- **Profile**: Fixed location beauty salon/spa
- **Test Scenarios**: Location-specific bookings, facility showcase
- **Expected Behavior**: Clear location information and directions

#### 2.5 High-Rated vs New Provider
- **Profile**: Established (4.5+ rating) vs new providers (no reviews)
- **Test Scenarios**: Search ranking, booking preferences, trust indicators
- **Expected Behavior**: Fair visibility with quality differentiation

---

## Critical Path Testing

### 1. Authentication Flows

#### 1.1 Customer Phone-Based Authentication
```
Test Flow: Phone Entry → OTP Request → OTP Verification → Account Creation/Login
```

**Test Scenarios:**
- Valid Jordan phone numbers (+962xxxxxxxx)
- Invalid phone number formats
- OTP delivery and verification
- Rate limiting protection
- Token management and refresh

**Expected Outcomes:**
- Successful authentication with valid credentials
- Appropriate error messages for invalid inputs
- Secure token storage and automatic refresh

#### 1.2 Provider Email/Password Authentication
```
Test Flow: Email Entry → Password Entry → Account Verification → Dashboard Access
```

**Test Scenarios:**
- Valid email/password combinations
- Password strength validation
- Account verification status checks
- Forgot password flow
- Session management

**Expected Outcomes:**
- Secure provider authentication
- Proper role-based access control
- Password reset functionality

### 2. Service Discovery and Booking Flow

#### 2.1 Complete Customer Journey
```
Service Search → Provider Selection → Service Selection → Booking Creation → Payment → Confirmation
```

**Detailed Test Steps:**

1. **Service Search**
   - Location-based provider discovery
   - Service category filtering
   - Price range filtering
   - Rating-based sorting

2. **Provider Selection**
   - Provider profile viewing
   - Service catalog browsing
   - Availability checking
   - Reviews and ratings display

3. **Booking Creation**
   - Date/time selection
   - Service customization
   - Location preference (salon vs mobile)
   - Special requests/notes

4. **Payment Processing**
   - Price calculation with fees
   - Promotion code application
   - Payment method selection
   - Transaction processing

5. **Booking Confirmation**
   - Booking details verification
   - Notification sending
   - Calendar integration
   - Provider notification

**Expected Outcomes:**
- Seamless end-to-end booking experience
- Accurate pricing and availability
- Reliable notification delivery
- Proper data persistence

### 3. Booking Management Lifecycle

#### 3.1 Customer Booking Management
```
View Bookings → Modify Booking → Cancel/Reschedule → Review Service
```

**Test Scenarios:**
- Booking history display
- Upcoming booking modifications
- Cancellation policies enforcement
- Review submission after completion

#### 3.2 Provider Booking Management
```
Receive Booking → Accept/Reject → Update Status → Complete Service → Respond to Reviews
```

**Test Scenarios:**
- Real-time booking notifications
- Booking status updates
- Service completion workflow
- Customer communication

### 4. Geolocation and Proximity Services

#### 4.1 Location-Based Provider Search
```
User Location → Proximity Calculation → Provider Filtering → Distance Sorting
```

**Test Data:**
- Amman city center: 31.9539° N, 35.9106° E
- Abdoun area: 31.9565° N, 35.8945° E
- Swefieh: 31.9973° N, 35.8625° E

**Test Scenarios:**
- Providers within 5km radius
- Mobile providers with extended range
- Cross-district service availability
- Jordan boundary validation

**Expected Outcomes:**
- Accurate distance calculations
- Proper provider filtering by location
- Respect for provider travel radius settings

---

## Automated Test Scenarios

### 1. API Integration Tests

#### 1.1 Authentication API Tests

```javascript
// Example test structure
describe('Authentication Integration Tests', () => {
  describe('Customer OTP Flow', () => {
    test('should send OTP to valid Jordan phone number', async () => {
      const response = await request(app)
        .post('/api/auth/customer/send-otp')
        .send({ phone: '+962791234567' })
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('OTP sent successfully')
      });
    });

    test('should verify OTP and create user session', async () => {
      // Test OTP verification with mock data
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: '+962791234567',
          otp: '123456', // Mock OTP in test environment
          name: 'Test User'
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toMatchObject({
        phone: '+962791234567',
        name: 'Test User'
      });
    });
  });

  describe('Provider Authentication', () => {
    test('should authenticate verified provider', async () => {
      const response = await request(app)
        .post('/api/auth/provider/login')
        .send({
          email: 'provider@test.com',
          password: 'validPassword123'
        })
        .expect(200);

      expect(response.body.data.provider).toHaveProperty('verified', true);
    });
  });
});
```

#### 1.2 Booking Flow Integration Tests

```javascript
describe('Booking Integration Tests', () => {
  let customerToken, providerToken, serviceId;

  beforeEach(async () => {
    // Setup test users and data
    customerToken = await createTestCustomer();
    providerToken = await createTestProvider();
    serviceId = await createTestService();
  });

  test('complete booking flow', async () => {
    // 1. Search for providers
    const searchResponse = await request(app)
      .get('/api/providers')
      .query({
        lat: 31.9539,
        lng: 35.9106,
        radius: 5000
      })
      .expect(200);

    expect(searchResponse.body.data.data).toHaveLength(greaterThan(0));

    // 2. Check availability
    const providerId = searchResponse.body.data.data[0].id;
    const availabilityResponse = await request(app)
      .get(`/api/providers/${providerId}/availability`)
      .query({ date: '2024-01-15' })
      .expect(200);

    // 3. Create booking
    const bookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        providerId,
        serviceId,
        date: '2024-01-15',
        time: '14:00',
        notes: 'Test booking'
      })
      .expect(201);

    expect(bookingResponse.body.data).toMatchObject({
      status: 'pending',
      userId: expect.any(String),
      providerId
    });
  });
});
```

#### 1.3 Geolocation Integration Tests

```javascript
describe('Geolocation Integration Tests', () => {
  test('should find providers within radius', async () => {
    // Amman city center coordinates
    const response = await request(app)
      .post('/api/providers/search')
      .send({
        location: {
          lat: 31.9539,
          lng: 35.9106,
          radius: 5000 // 5km
        }
      })
      .expect(200);

    response.body.data.data.forEach(provider => {
      // Verify all providers are within the specified radius
      expect(provider.distance_km).toBeLessThanOrEqual(5);
    });
  });

  test('should respect provider travel radius for mobile services', async () => {
    const response = await request(app)
      .get('/api/providers')
      .query({
        lat: 32.0000, // Outside normal radius
        lng: 36.0000,
        radius: 50000 // Large radius
      })
      .expect(200);

    // Verify mobile providers extend their service area
    const mobileProviders = response.body.data.data.filter(p => p.is_mobile);
    mobileProviders.forEach(provider => {
      expect(provider.distance_km).toBeLessThanOrEqual(provider.travel_radius_km);
    });
  });
});
```

### 2. Database Integration Tests

#### 2.1 Data Consistency Tests

```sql
-- Test data consistency across related tables
BEGIN;

-- Test booking creation with loyalty points
INSERT INTO bookings (user_id, provider_id, service_id, booking_date, start_time, end_time, total_price, original_price)
VALUES ('test-user-id', 'test-provider-id', 'test-service-id', '2024-01-15', '14:00', '15:00', 75.00, 75.00);

-- Verify loyalty transaction was created
SELECT COUNT(*) FROM loyalty_transactions 
WHERE user_id = 'test-user-id' AND transaction_type = 'earned';

-- Verify user loyalty status was updated
SELECT total_points, total_bookings FROM user_loyalty_status 
WHERE user_id = 'test-user-id';

ROLLBACK;
```

#### 2.2 Business Rule Validation Tests

```sql
-- Test booking time conflict prevention
BEGIN;

-- Create first booking
INSERT INTO bookings (user_id, provider_id, service_id, booking_date, start_time, end_time, total_price, original_price, status)
VALUES ('user1', 'provider1', 'service1', '2024-01-15', '14:00', '15:00', 50.00, 50.00, 'confirmed');

-- Attempt overlapping booking (should fail with availability check)
SELECT check_provider_availability('provider1', '2024-01-15', '14:30', 60) AS can_book;

ROLLBACK;
```

### 3. Mobile App Integration Tests

#### 3.1 Authentication Flow Tests

```typescript
// React Native testing with Jest and React Native Testing Library
describe('Authentication Integration', () => {
  test('customer login flow', async () => {
    const { getByTestId, getByText } = render(<App />);
    
    // Navigate to login
    fireEvent.press(getByText('Get Started'));
    fireEvent.press(getByText('Customer'));
    
    // Enter phone number
    const phoneInput = getByTestId('phone-input');
    fireEvent.changeText(phoneInput, '+962791234567');
    fireEvent.press(getByText('Send Code'));
    
    // Wait for OTP screen
    await waitFor(() => {
      expect(getByText('Enter Verification Code')).toBeTruthy();
    });
    
    // Enter OTP
    const otpInputs = getByTestId('otp-input');
    fireEvent.changeText(otpInputs, '123456');
    
    // Verify successful login
    await waitFor(() => {
      expect(getByText('Welcome')).toBeTruthy();
    });
  });
});
```

#### 3.2 Service Discovery Tests

```typescript
describe('Service Discovery', () => {
  test('location-based provider search', async () => {
    // Mock location permissions
    jest.spyOn(Location, 'requestForegroundPermissionsAsync')
      .mockResolvedValue({ status: 'granted' });
    
    jest.spyOn(Location, 'getCurrentPositionAsync')
      .mockResolvedValue({
        coords: {
          latitude: 31.9539,
          longitude: 35.9106,
        }
      });
    
    const { getByTestId } = render(<SearchScreen />);
    
    // Trigger location-based search
    fireEvent.press(getByTestId('search-nearby-button'));
    
    // Verify providers are loaded
    await waitFor(() => {
      expect(getByTestId('provider-list')).toBeTruthy();
    });
  });
});
```

---

## Manual Testing Checklists

### 1. Cross-Platform Compatibility Checklist

#### iOS Testing
- [ ] Authentication flow works on iOS Safari
- [ ] OTP SMS integration functions properly
- [ ] Location services permission handling
- [ ] Push notification registration
- [ ] Arabic RTL text rendering
- [ ] Date/time picker localization
- [ ] App Store compliance (if applicable)

#### Android Testing
- [ ] Authentication flow works on Chrome Mobile
- [ ] SMS OTP auto-fill functionality
- [ ] Location services integration
- [ ] Push notification handling
- [ ] Arabic text display and input
- [ ] Material Design consistency
- [ ] Play Store compliance (if applicable)

#### Web Dashboard Testing
- [ ] Provider authentication via web
- [ ] Responsive design across screen sizes
- [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Keyboard navigation accessibility
- [ ] Arabic RTL layout support

### 2. User Experience Testing Checklist

#### Customer Journey Testing
- [ ] **Onboarding**: Clear intro, easy registration
- [ ] **Service Discovery**: Intuitive search and filtering
- [ ] **Booking Process**: Simple and error-free
- [ ] **Payment Flow**: Secure and user-friendly
- [ ] **Booking Management**: Easy modification and cancellation
- [ ] **Review System**: Straightforward review submission
- [ ] **Loyalty Program**: Clear benefits display and usage

#### Provider Journey Testing
- [ ] **Registration**: Complete profile setup workflow
- [ ] **Service Management**: Easy service creation and editing
- [ ] **Booking Management**: Clear notification and response system
- [ ] **Availability Settings**: Intuitive calendar management
- [ ] **Performance Analytics**: Meaningful statistics display
- [ ] **Settlement Reports**: Clear financial information

### 3. Accessibility Testing Checklist

#### Screen Reader Compatibility
- [ ] All interactive elements have proper labels
- [ ] Navigation hierarchy is logical
- [ ] Error messages are clearly announced
- [ ] Form validation feedback is accessible

#### Visual Accessibility
- [ ] Sufficient color contrast ratios
- [ ] Text scaling support (up to 200%)
- [ ] Clear focus indicators
- [ ] No reliance on color alone for information

#### Motor Accessibility
- [ ] Touch targets are at least 44px
- [ ] Alternative input methods supported
- [ ] Adequate time limits for interactions

### 4. Security Testing Checklist

#### Authentication Security
- [ ] OTP codes expire appropriately (5-10 minutes)
- [ ] Rate limiting prevents abuse
- [ ] JWT tokens have proper expiration
- [ ] Session management is secure
- [ ] Password policies are enforced (providers)

#### Data Protection
- [ ] Personal data is encrypted in transit
- [ ] Sensitive data is not logged
- [ ] API endpoints require proper authorization
- [ ] User data isolation is maintained
- [ ] GDPR compliance for data handling

#### Input Validation
- [ ] All user inputs are sanitized
- [ ] SQL injection prevention
- [ ] XSS protection measures
- [ ] File upload security (if applicable)
- [ ] Phone number format validation

---

## Performance Testing

### 1. API Endpoint Performance Tests

#### 1.1 Load Testing Scenarios

**Provider Search Endpoint**
```bash
# Artillery.js configuration for load testing
config:
  target: 'https://api.lamsa.com'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: "Provider Search Load Test"
    requests:
      - get:
          url: "/api/providers"
          qs:
            lat: 31.9539
            lng: 35.9106
            radius: 5000
            limit: 20
```

**Expected Performance Metrics:**
- Response time: < 500ms (95th percentile)
- Throughput: > 100 requests/second
- Error rate: < 1%
- Database connection utilization: < 80%

#### 1.2 Stress Testing

**Booking Creation Stress Test**
```yaml
# K6 stress test configuration
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '10m', target: 0 },
  ],
};

export default function() {
  let response = http.post('https://api.lamsa.com/api/bookings', {
    providerId: 'test-provider-id',
    serviceId: 'test-service-id',
    date: '2024-01-15',
    time: '14:00'
  }, {
    headers: { 'Authorization': 'Bearer ${AUTH_TOKEN}' }
  });
  
  check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}
```

#### 1.3 Database Performance Tests

**Geolocation Query Performance**
```sql
-- Test geospatial query performance
EXPLAIN ANALYZE 
SELECT p.*, 
       ST_Distance(p.location::geography, ST_SetSRID(ST_MakePoint(35.9106, 31.9539), 4326)::geography) / 1000 as distance_km
FROM providers p
WHERE p.verified = TRUE 
  AND p.active = TRUE
  AND ST_DWithin(p.location::geography, ST_SetSRID(ST_MakePoint(35.9106, 31.9539), 4326)::geography, 5000)
ORDER BY distance_km
LIMIT 20;
```

**Expected Query Performance:**
- Execution time: < 50ms
- Index usage: GIST index on location column
- Rows examined: < 1000 (with proper indexing)

#### 1.4 Mobile App Performance Tests

**App Launch Performance**
- Cold start time: < 3 seconds
- Warm start time: < 1 second
- Memory usage: < 150MB baseline
- Battery usage: Minimal background consumption

**Network Performance**
- API response caching effectiveness
- Offline queue functionality
- Image loading optimization
- Progressive data loading

### 2. Performance Monitoring Setup

#### 2.1 Real-time Monitoring

```javascript
// Application Performance Monitoring setup
const apm = require('elastic-apm-node').start({
  serviceName: 'lamsa-api',
  serverUrl: 'https://apm.lamsa.com',
  environment: process.env.NODE_ENV
});

// Custom performance metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    apm.setCustomContext({
      responseTime: duration,
      endpoint: req.path,
      statusCode: res.statusCode
    });
  });
  
  next();
});
```

#### 2.2 Performance Alerts

**Critical Alerts:**
- API response time > 1 second (95th percentile)
- Error rate > 5%
- Database connection pool > 90% utilization
- Memory usage > 80%

**Warning Alerts:**
- API response time > 500ms (95th percentile)
- Error rate > 2%
- Database query time > 100ms
- Mobile app crash rate > 1%

---

## User Acceptance Testing

### 1. Business Stakeholder Testing Scenarios

#### 1.1 Customer Experience Validation

**Scenario: First-time Customer Booking**
```
Given: New user downloads the app for the first time
When: They want to book a haircut service in Amman
Then: They should be able to complete the entire flow within 5 minutes

Acceptance Criteria:
✓ Registration takes < 2 minutes
✓ Provider search shows relevant results
✓ Booking process is intuitive
✓ Confirmation details are clear
✓ Customer receives SMS confirmation
```

**Scenario: Loyalty Program Usage**
```
Given: Existing customer with 1000 loyalty points
When: They book a service worth 50 JOD
Then: They should be able to apply points for discount

Acceptance Criteria:
✓ Available points are clearly displayed
✓ Point conversion rate is transparent
✓ Discount is applied correctly to booking
✓ Remaining points are updated accurately
```

#### 1.2 Provider Business Validation

**Scenario: New Provider Onboarding**
```
Given: Beauty salon owner wants to join the platform
When: They complete the registration process
Then: They should understand next steps and start receiving bookings

Acceptance Criteria:
✓ Registration form captures all necessary information
✓ Verification process is clearly explained
✓ Provider dashboard is intuitive
✓ Service setup is straightforward
✓ Booking notifications work properly
```

**Scenario: Mobile Provider Service Delivery**
```
Given: Mobile makeup artist offering home services
When: Customer books service at their location
Then: Provider should have all necessary information for service delivery

Acceptance Criteria:
✓ Customer location is clearly provided
✓ Service details and preferences are communicated
✓ Navigation integration works
✓ Payment processing is smooth
✓ Service completion workflow is clear
```

### 2. Regional and Cultural Testing

#### 2.1 Jordan Market Validation

**Phone Number Validation**
- Test with all Jordan mobile prefixes: 077, 078, 079
- Validate international format support: +962
- Test with local format handling: 07xxxxxxxx

**Location Testing**
- Amman districts: Abdali, Abdoun, Sweifieh, Jabal Hussein
- Other cities: Irbid, Zarqa, Aqaba
- Rural area coverage limitations

**Cultural Considerations**
- Gender-appropriate service filtering
- Religious holiday awareness in booking system
- Conservative beauty service categories
- Family booking options

#### 2.2 Arabic Language Testing

**Text Rendering**
- Arabic script display in all components
- RTL layout consistency
- Mixed Arabic/English content handling
- Number and date formatting in Arabic

**Content Localization**
- Service names and descriptions in Arabic
- Error messages in proper Arabic
- Push notifications in user's preferred language
- Customer support content availability

---

## Test Data Management

### 1. Test Data Categories

#### 1.1 User Test Data

**Customer Profiles**
```json
{
  "newCustomer": {
    "phone": "+962791234567",
    "name": "Ahmed Al-Zahra",
    "email": "ahmed.test@example.com",
    "language": "ar",
    "location": {
      "lat": 31.9539,
      "lng": 35.9106,
      "address": "Abdali, Amman"
    }
  },
  "loyaltyCustomer": {
    "phone": "+962787654321",
    "name": "Sara Mohammad",
    "email": "sara.test@example.com",
    "language": "en",
    "loyaltyPoints": 2500,
    "tier": "gold",
    "totalBookings": 15
  },
  "vipCustomer": {
    "phone": "+962795555555",
    "name": "Layla Hassan",
    "email": "layla.test@example.com",
    "language": "ar",
    "loyaltyPoints": 7000,
    "tier": "platinum",
    "totalBookings": 50
  }
}
```

**Provider Profiles**
```json
{
  "newProvider": {
    "email": "newsalon@test.com",
    "password": "TestPass123!",
    "businessName": "New Beauty Salon",
    "businessNameAr": "صالون جمال جديد",
    "phone": "+962776666666",
    "verified": false,
    "location": {
      "lat": 31.9565,
      "lng": 35.8945
    }
  },
  "establishedProvider": {
    "email": "established@test.com",
    "password": "TestPass123!",
    "businessName": "Premium Spa Center",
    "businessNameAr": "مركز سبا متميز",
    "phone": "+962777777777",
    "verified": true,
    "rating": 4.8,
    "totalReviews": 125,
    "location": {
      "lat": 31.9973,
      "lng": 35.8625
    }
  },
  "mobileProvider": {
    "email": "mobile@test.com",
    "password": "TestPass123!",
    "businessName": "Mobile Beauty Services",
    "businessNameAr": "خدمات تجميل متنقلة",
    "phone": "+962788888888",
    "verified": true,
    "isMobile": true,
    "travelRadius": 15,
    "location": {
      "lat": 31.9539,
      "lng": 35.9106
    }
  }
}
```

#### 1.2 Service Test Data

```json
{
  "hairServices": [
    {
      "nameEn": "Women's Haircut & Styling",
      "nameAr": "قص وتصفيف شعر للسيدات",
      "price": 25.00,
      "duration": 60,
      "category": "hair_styling"
    },
    {
      "nameEn": "Hair Coloring",
      "nameAr": "صبغ الشعر",
      "price": 45.00,
      "duration": 120,
      "category": "hair_styling"
    }
  ],
  "makeupServices": [
    {
      "nameEn": "Bridal Makeup",
      "nameAr": "مكياج عروس",
      "price": 80.00,
      "duration": 90,
      "category": "makeup"
    },
    {
      "nameEn": "Party Makeup",
      "nameAr": "مكياج حفلات",
      "price": 35.00,
      "duration": 45,
      "category": "makeup"
    }
  ]
}
```

#### 1.3 Booking Test Scenarios

```json
{
  "upcomingBooking": {
    "date": "2024-01-15",
    "time": "14:00",
    "status": "confirmed",
    "totalPrice": 75.00,
    "notes": "Please use organic products"
  },
  "cancelledBooking": {
    "date": "2024-01-10",
    "time": "16:00",
    "status": "cancelled",
    "cancellationReason": "Schedule conflict",
    "refundAmount": 50.00
  },
  "completedBooking": {
    "date": "2024-01-05",
    "time": "11:00",
    "status": "completed",
    "totalPrice": 60.00,
    "rating": 5,
    "review": "Excellent service, very professional"
  }
}
```

### 2. Test Data Lifecycle

#### 2.1 Data Setup
```sql
-- Create test data setup script
CREATE OR REPLACE FUNCTION setup_test_data()
RETURNS void AS $$
BEGIN
    -- Insert test service categories
    INSERT INTO service_categories (name_en, name_ar, icon) VALUES
    ('Hair Styling', 'تصفيف الشعر', 'scissors'),
    ('Makeup', 'مكياج', 'palette'),
    ('Nails', 'أظافر', 'brush');
    
    -- Insert test providers
    INSERT INTO providers (id, business_name, business_name_ar, email, phone, location, verified) VALUES
    ('test-provider-1', 'Test Salon', 'صالون تجريبي', 'test1@example.com', '+962771111111', 
     ST_SetSRID(ST_MakePoint(35.9106, 31.9539), 4326), true),
    ('test-provider-2', 'Mobile Beauty', 'تجميل متنقل', 'test2@example.com', '+962772222222',
     ST_SetSRID(ST_MakePoint(35.8945, 31.9565), 4326), true);
    
    -- Insert test users
    INSERT INTO users (id, phone, name, language_preference) VALUES
    ('test-user-1', '+962791111111', 'Test Customer 1', 'ar'),
    ('test-user-2', '+962792222222', 'Test Customer 2', 'en');
    
    RAISE NOTICE 'Test data setup completed successfully';
END;
$$ LANGUAGE plpgsql;
```

#### 2.2 Data Cleanup
```sql
-- Clean up test data after test execution
CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS void AS $$
BEGIN
    -- Remove test bookings
    DELETE FROM bookings WHERE user_id LIKE 'test-%' OR provider_id LIKE 'test-%';
    
    -- Remove test reviews
    DELETE FROM reviews WHERE user_id LIKE 'test-%' OR provider_id LIKE 'test-%';
    
    -- Remove test users and providers
    DELETE FROM users WHERE id LIKE 'test-%';
    DELETE FROM providers WHERE id LIKE 'test-%';
    
    -- Remove test services
    DELETE FROM services WHERE provider_id LIKE 'test-%';
    
    RAISE NOTICE 'Test data cleanup completed successfully';
END;
$$ LANGUAGE plpgsql;
```

---

## Environment Setup

### 1. Test Environment Configuration

#### 1.1 API Test Environment
```env
# .env.test
NODE_ENV=test
PORT=3001
JWT_SECRET=test-jwt-secret-key-2024

# Database
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/lamsa_test
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_ANON_KEY=test_anon_key
SUPABASE_SERVICE_KEY=test_service_key

# SMS/OTP (Mock in test)
TWILIO_ACCOUNT_SID=test_account_sid
TWILIO_AUTH_TOKEN=test_auth_token
TWILIO_PHONE_NUMBER=+1234567890
OTP_MOCK_MODE=true

# External Services
GOOGLE_MAPS_API_KEY=test_maps_key
```

#### 1.2 Mobile App Test Configuration
```json
{
  "expo": {
    "name": "Lamsa Test",
    "slug": "lamsa-test",
    "version": "1.0.0",
    "extra": {
      "apiUrl": "http://localhost:3001/api",
      "supabaseUrl": "https://test-project.supabase.co",
      "supabaseAnonKey": "test_anon_key",
      "environment": "test"
    }
  }
}
```

### 2. CI/CD Pipeline Integration

#### 2.1 GitHub Actions Workflow
```yaml
name: Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgis/postgis:13-3.1
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: lamsa_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: lamsa-api/package-lock.json
    
    - name: Install dependencies
      run: |
        cd lamsa-api
        npm ci
    
    - name: Setup test database
      run: |
        cd lamsa-api
        npm run db:test:setup
    
    - name: Run integration tests
      run: |
        cd lamsa-api
        npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:testpass@localhost:5432/lamsa_test
        NODE_ENV: test
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: lamsa-api/test-results/

  mobile-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: lamsa-mobile/package-lock.json
    
    - name: Install dependencies
      run: |
        cd lamsa-mobile
        npm ci
    
    - name: Run mobile integration tests
      run: |
        cd lamsa-mobile
        npm run test:integration
```

---

## Test Execution Timeline

### 1. Pre-Release Testing Schedule

#### Phase 1: Foundation Testing (Week 1-2)
- **Day 1-3**: Environment setup and test data preparation
- **Day 4-7**: API integration tests development
- **Day 8-10**: Database integration and performance testing
- **Day 11-14**: Mobile app integration tests

#### Phase 2: End-to-End Testing (Week 3-4)
- **Day 15-17**: Complete user journey testing
- **Day 18-21**: Cross-platform compatibility testing
- **Day 22-24**: Security and accessibility testing
- **Day 25-28**: Performance and load testing

#### Phase 3: User Acceptance Testing (Week 5-6)
- **Day 29-31**: Business stakeholder testing
- **Day 32-35**: Regional and cultural validation
- **Day 36-38**: Bug fixes and retesting
- **Day 39-42**: Final validation and sign-off

### 2. Continuous Testing Schedule

#### Daily Automated Tests
- **06:00 AM**: Full regression test suite
- **12:00 PM**: Smoke tests after deployments
- **06:00 PM**: Performance monitoring reports

#### Weekly Manual Testing
- **Monday**: Critical path validation
- **Wednesday**: New feature testing
- **Friday**: Cross-platform compatibility check

#### Monthly Comprehensive Testing
- **Week 1**: Full integration test suite
- **Week 2**: Performance benchmarking
- **Week 3**: Security audit
- **Week 4**: User acceptance testing

---

## Success Criteria and Reporting

### 1. Test Coverage Metrics

#### Functional Coverage
- **API Endpoints**: 100% of endpoints tested
- **User Journeys**: 95% of critical paths covered
- **Database Operations**: 100% of CRUD operations tested
- **Mobile App Features**: 90% of features tested

#### Technical Coverage
- **Code Coverage**: Minimum 80% for integration tests
- **Browser Coverage**: Chrome, Firefox, Safari, Edge
- **Device Coverage**: iOS (12+), Android (8+)
- **Network Conditions**: 3G, 4G, WiFi, offline

### 2. Quality Gates

#### Pre-Deployment Requirements
- [ ] All critical path tests pass
- [ ] Performance benchmarks met
- [ ] Security scans pass
- [ ] Accessibility compliance verified
- [ ] Cross-platform compatibility confirmed

#### Production Readiness Checklist
- [ ] Load testing completed successfully
- [ ] Disaster recovery procedures tested
- [ ] Monitoring and alerting configured
- [ ] Documentation updated
- [ ] Team training completed

### 3. Test Reporting Dashboard

#### Real-time Metrics
- Test execution status and results
- Performance benchmarks trending
- Bug discovery and resolution rates
- Test environment health status

#### Weekly Reports
- Test coverage analysis
- Quality metrics summary
- Performance regression analysis
- Risk assessment and mitigation plans

This comprehensive integration testing plan ensures thorough validation of the Lamsa platform across all user types, technical components, and business scenarios. The combination of automated testing, manual validation, and continuous monitoring provides confidence in the platform's reliability and user experience.
