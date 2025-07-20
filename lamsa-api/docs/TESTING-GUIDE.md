# Lamsa API Testing Guide

## Overview

This comprehensive testing guide provides developers with practical examples, test scenarios, and sample data for testing the Lamsa booking API. It includes unit tests, integration tests, end-to-end workflows, and performance testing scenarios.

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Sample Test Data](#sample-test-data)
3. [Unit Testing Examples](#unit-testing-examples)
4. [Integration Testing](#integration-testing)
5. [End-to-End Workflows](#end-to-end-workflows)
6. [Error Scenario Testing](#error-scenario-testing)
7. [Performance Testing](#performance-testing)
8. [Mobile App Testing](#mobile-app-testing)
9. [API Testing with Postman](#api-testing-with-postman)
10. [Automated Testing Scripts](#automated-testing-scripts)

---

## Test Environment Setup

### Environment Configuration
```bash
# Test environment variables (.env.test)
NODE_ENV=test
PORT=3001
SUPABASE_URL=https://test.supabase.co
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_KEY=test-service-key
JWT_SECRET=test-jwt-secret-key
DISABLE_RATE_LIMITING=true
MOCK_NOTIFICATIONS=true
MOCK_PAYMENTS=true
```

### Test Database Setup
```javascript
// tests/setup/database.js
import { testDatabase } from '../utils/database';

beforeAll(async () => {
  await testDatabase.setup();
}, 30000);

afterAll(async () => {
  await testDatabase.cleanup();
}, 10000);

beforeEach(async () => {
  await testDatabase.reset();
});
```

### Test Server Configuration
```javascript
// tests/setup/server.js
import { startTestServer, stopTestServer } from '../utils/testServer';

let server;

beforeAll(async () => {
  server = await startTestServer();
}, 30000);

afterAll(async () => {
  if (server) {
    await stopTestServer(server);
  }
}, 10000);
```

---

## Sample Test Data

### Test Users
```javascript
// tests/data/users.js
export const testUsers = {
  customer: {
    id: '11111111-1111-1111-1111-111111111111',
    phone: '+962781234567',
    name: 'أحمد محمد',
    email: 'ahmed@test.com',
    language: 'ar',
    role: 'customer'
  },
  englishCustomer: {
    id: '22222222-2222-2222-2222-222222222222',
    phone: '+962791234567',
    name: 'Sarah Johnson',
    email: 'sarah@test.com',
    language: 'en',
    role: 'customer'
  },
  provider: {
    id: '33333333-3333-3333-3333-333333333333',
    phone: '+962781111111',
    businessNameAr: 'صالون الجمال',
    businessNameEn: 'Beauty Salon',
    ownerName: 'مريم عبدالله',
    email: 'salon@test.com',
    role: 'provider',
    verified: true
  },
  admin: {
    id: '44444444-4444-4444-4444-444444444444',
    phone: '+962771111111',
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'admin'
  }
};
```

### Test Providers and Services
```javascript
// tests/data/providers.js
export const testProviders = {
  verifiedSalon: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    businessNameAr: 'صالون الجمال',
    businessNameEn: 'Beauty Salon',
    ownerName: 'مريم عبدالله',
    phone: '+962781111111',
    email: 'salon@test.com',
    latitude: 31.9500,
    longitude: 35.9333,
    verified: true,
    services: [
      {
        id: 'service1-1111-1111-1111-111111111111',
        nameAr: 'قص الشعر',
        nameEn: 'Hair Cut',
        price: 25.00,
        duration: 60,
        active: true
      },
      {
        id: 'service2-2222-2222-2222-222222222222',
        nameAr: 'مانيكير',
        nameEn: 'Manicure',
        price: 15.00,
        duration: 45,
        active: true
      }
    ]
  },
  unverifiedCenter: {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    businessNameAr: 'مركز التجميل',
    businessNameEn: 'Beauty Center',
    ownerName: 'نور الهدى',
    phone: '+962791111111',
    email: 'center@test.com',
    verified: false,
    services: []
  }
};
```

### Test Booking Scenarios
```javascript
// tests/data/bookings.js
export const testBookingScenarios = {
  validBooking: {
    providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    serviceId: 'service1-1111-1111-1111-111111111111',
    date: '2024-07-25', // Future date
    time: '14:30',
    paymentMethod: 'cash',
    notes: 'Test booking'
  },
  
  highValueBooking: {
    providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    serviceId: 'service3-3333-3333-3333-333333333333', // Premium service
    date: '2024-07-25',
    time: '10:00',
    paymentMethod: 'online', // Required for >100 JOD
    notes: 'Premium service booking'
  },
  
  conflictingBooking: {
    providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    serviceId: 'service1-1111-1111-1111-111111111111',
    date: '2024-07-25',
    time: '14:30', // Same time as validBooking
    paymentMethod: 'cash'
  },
  
  pastDateBooking: {
    providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    serviceId: 'service1-1111-1111-1111-111111111111',
    date: '2024-07-10', // Past date
    time: '14:30',
    paymentMethod: 'cash'
  },
  
  outsideHoursBooking: {
    providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    serviceId: 'service1-1111-1111-1111-111111111111',
    date: '2024-07-25',
    time: '06:00', // Before business hours
    paymentMethod: 'cash'
  }
};
```

---

## Unit Testing Examples

### Booking Service Tests
```javascript
// tests/unit/bookingService.test.js
import { BookingService } from '../../src/services/bookingService';
import { testUsers, testProviders, testBookingScenarios } from '../data';

describe('BookingService', () => {
  let bookingService;

  beforeEach(() => {
    bookingService = new BookingService();
  });

  describe('createBooking', () => {
    it('should create a valid booking', async () => {
      const bookingData = testBookingScenarios.validBooking;
      const userId = testUsers.customer.id;

      const result = await bookingService.createBooking(userId, bookingData);

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe(userId);
      expect(result.providerId).toBe(bookingData.providerId);
      expect(result.status).toBe('pending');
      expect(result.amount).toBeGreaterThan(0);
    });

    it('should calculate correct platform fees', async () => {
      const bookingData = {
        ...testBookingScenarios.validBooking,
        amount: 100.00
      };
      const userId = testUsers.customer.id;

      const result = await bookingService.createBooking(userId, bookingData);

      expect(result.platformFee).toBe(8.00); // 8% of 100
      expect(result.providerFee).toBe(92.00); // 100 - 8
      expect(result.amount).toBe(100.00);
    });

    it('should require online payment for high-value bookings', async () => {
      const bookingData = {
        ...testBookingScenarios.validBooking,
        amount: 150.00,
        paymentMethod: 'cash'
      };
      const userId = testUsers.customer.id;

      await expect(
        bookingService.createBooking(userId, bookingData)
      ).rejects.toThrow('Online payment required for bookings over 100 JOD');
    });

    it('should validate business hours', async () => {
      const bookingData = testBookingScenarios.outsideHoursBooking;
      const userId = testUsers.customer.id;

      await expect(
        bookingService.createBooking(userId, bookingData)
      ).rejects.toThrow('Time must be within business hours');
    });

    it('should validate minimum advance time', async () => {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      const bookingData = {
        ...testBookingScenarios.validBooking,
        date: oneHourLater.toISOString().split('T')[0],
        time: oneHourLater.toTimeString().substring(0, 5)
      };
      const userId = testUsers.customer.id;

      await expect(
        bookingService.createBooking(userId, bookingData)
      ).rejects.toThrow('Booking must be at least 2 hours in advance');
    });
  });

  describe('updateBookingStatus', () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await bookingService.createBooking(
        testUsers.customer.id,
        testBookingScenarios.validBooking
      );
    });

    it('should allow provider to confirm booking', async () => {
      const result = await bookingService.updateStatus(
        testBooking.id,
        'confirmed',
        testUsers.provider.id,
        'provider'
      );

      expect(result.status).toBe('confirmed');
    });

    it('should prevent invalid status transitions', async () => {
      // First complete the booking
      await bookingService.updateStatus(
        testBooking.id,
        'confirmed',
        testUsers.provider.id,
        'provider'
      );
      
      await bookingService.updateStatus(
        testBooking.id,
        'completed',
        testUsers.provider.id,
        'provider'
      );

      // Try to change from completed to pending
      await expect(
        bookingService.updateStatus(
          testBooking.id,
          'pending',
          testUsers.provider.id,
          'provider'
        )
      ).rejects.toThrow('Cannot change status from \'completed\' to \'pending\'');
    });

    it('should enforce role-based permissions', async () => {
      await expect(
        bookingService.updateStatus(
          testBooking.id,
          'confirmed',
          testUsers.customer.id,
          'customer'
        )
      ).rejects.toThrow('Only providers can confirm bookings');
    });
  });
});
```

### Validation Tests
```javascript
// tests/unit/validation.test.js
import { validateJordanianPhone, validateBookingTime, validatePaymentMethod } from '../../src/utils/validation';

describe('Validation Functions', () => {
  describe('validateJordanianPhone', () => {
    it('should accept valid Jordanian phone formats', () => {
      const validPhones = [
        '+962791234567',
        '962791234567',
        '0791234567',
        '791234567',
        '+962781234567',
        '+962771234567'
      ];

      validPhones.forEach(phone => {
        expect(() => validateJordanianPhone(phone)).not.toThrow();
      });
    });

    it('should reject invalid phone formats', () => {
      const invalidPhones = [
        '+962701234567', // Invalid prefix (70)
        '79123456',      // Too short
        '07912345678',   // Too long
        '+96379123456',  // Wrong country code
        'abc123456789'   // Non-numeric
      ];

      invalidPhones.forEach(phone => {
        expect(() => validateJordanianPhone(phone)).toThrow('Invalid phone number format');
      });
    });

    it('should normalize phone numbers to international format', () => {
      const testCases = [
        { input: '0791234567', expected: '+962791234567' },
        { input: '791234567', expected: '+962791234567' },
        { input: '962791234567', expected: '+962791234567' },
        { input: '+962791234567', expected: '+962791234567' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = validateJordanianPhone(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('validateBookingTime', () => {
    it('should accept valid business hours', () => {
      const validTimes = ['08:00', '12:30', '18:45', '21:59'];
      const futureDate = '2024-07-25';

      validTimes.forEach(time => {
        expect(() => validateBookingTime(time, futureDate)).not.toThrow();
      });
    });

    it('should reject times outside business hours', () => {
      const invalidTimes = ['07:59', '22:00', '23:30', '06:00'];
      const futureDate = '2024-07-25';

      invalidTimes.forEach(time => {
        expect(() => validateBookingTime(time, futureDate)).toThrow('Time must be within business hours');
      });
    });

    it('should reject bookings with insufficient advance time', () => {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const date = oneHourLater.toISOString().split('T')[0];
      const time = oneHourLater.toTimeString().substring(0, 5);

      expect(() => validateBookingTime(time, date)).toThrow('Booking must be at least 2 hours in advance');
    });
  });

  describe('validatePaymentMethod', () => {
    it('should require online payment for high amounts', () => {
      expect(() => validatePaymentMethod(150.00, 'cash')).toThrow('Online payment required for bookings over 100 JOD');
      expect(() => validatePaymentMethod(150.00, 'online')).not.toThrow();
    });

    it('should accept any payment method for low amounts', () => {
      const paymentMethods = ['cash', 'card', 'online'];
      
      paymentMethods.forEach(method => {
        expect(() => validatePaymentMethod(50.00, method)).not.toThrow();
      });
    });

    it('should reject invalid payment methods', () => {
      expect(() => validatePaymentMethod(50.00, 'bitcoin')).toThrow('Invalid payment method');
    });
  });
});
```

---

## Integration Testing

### API Endpoint Tests
```javascript
// tests/integration/booking.test.js
import request from 'supertest';
import app from '../../src/app';
import { testUsers, testBookingScenarios } from '../data';
import { generateJWT } from '../utils/auth';

describe('Booking API Integration Tests', () => {
  let customerToken;
  let providerToken;
  let adminToken;

  beforeEach(async () => {
    customerToken = generateJWT(testUsers.customer);
    providerToken = generateJWT(testUsers.provider);
    adminToken = generateJWT(testUsers.admin);
  });

  describe('POST /api/bookings', () => {
    it('should create a booking with valid data', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(testBookingScenarios.validBooking)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.userId).toBe(testUsers.customer.id);
    });

    it('should return 400 for invalid booking data', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(testBookingScenarios.pastDateBooking)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Date must be in the future');
    });

    it('should return 409 for conflicting bookings', async () => {
      // Create first booking
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(testBookingScenarios.validBooking)
        .expect(201);

      // Try to create conflicting booking
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(testBookingScenarios.conflictingBooking)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Time slot is already booked');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/bookings')
        .send(testBookingScenarios.validBooking)
        .expect(401);
    });
  });

  describe('GET /api/bookings/user', () => {
    beforeEach(async () => {
      // Create test bookings
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ...testBookingScenarios.validBooking,
          time: '10:00'
        });

      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ...testBookingScenarios.validBooking,
          time: '11:00'
        });
    });

    it('should return user bookings with pagination', async () => {
      const response = await request(app)
        .get('/api/bookings/user?page=1&limit=10')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
    });

    it('should filter bookings by status', async () => {
      const response = await request(app)
        .get('/api/bookings/user?status=pending')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.data.forEach(booking => {
        expect(booking.status).toBe('pending');
      });
    });

    it('should return only own bookings', async () => {
      const response = await request(app)
        .get('/api/bookings/user')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      response.body.data.data.forEach(booking => {
        expect(booking.userId).toBe(testUsers.customer.id);
      });
    });
  });

  describe('PATCH /api/bookings/:id/status', () => {
    let testBookingId;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(testBookingScenarios.validBooking);
      
      testBookingId = createResponse.body.data.id;
    });

    it('should allow provider to confirm booking', async () => {
      const response = await request(app)
        .patch(`/api/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          status: 'confirmed',
          reason: 'Provider confirmed booking'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');
    });

    it('should prevent customer from confirming booking', async () => {
      await request(app)
        .patch(`/api/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: 'confirmed'
        })
        .expect(403);
    });

    it('should return 404 for non-existent booking', async () => {
      await request(app)
        .patch('/api/bookings/00000000-0000-0000-0000-000000000000/status')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          status: 'confirmed'
        })
        .expect(404);
    });
  });

  describe('POST /api/bookings/:id/cancel', () => {
    let testBookingId;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(testBookingScenarios.validBooking);
      
      testBookingId = createResponse.body.data.id;
    });

    it('should allow customer to cancel own booking', async () => {
      const response = await request(app)
        .post(`/api/bookings/${testBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Schedule conflict'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should allow provider to cancel booking', async () => {
      const response = await request(app)
        .post(`/api/bookings/${testBookingId}/cancel`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          reason: 'Provider unavailable'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });
  });

  describe('POST /api/bookings/check-availability', () => {
    it('should check availability for valid time slot', async () => {
      const response = await request(app)
        .post('/api/bookings/check-availability')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testBookingScenarios.validBooking.providerId,
          serviceId: testBookingScenarios.validBooking.serviceId,
          date: '2024-07-26',
          time: '15:00'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(true);
    });

    it('should detect conflicts with existing bookings', async () => {
      // Create a booking first
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(testBookingScenarios.validBooking);

      // Check availability for same slot
      const response = await request(app)
        .post('/api/bookings/check-availability')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testBookingScenarios.validBooking.providerId,
          serviceId: testBookingScenarios.validBooking.serviceId,
          date: testBookingScenarios.validBooking.date,
          time: testBookingScenarios.validBooking.time
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(false);
      expect(response.body.data.conflictingBookings).toHaveLength(1);
    });
  });
});
```

---

## End-to-End Workflows

### Complete Booking Workflow Test
```javascript
// tests/e2e/bookingWorkflow.test.js
import request from 'supertest';
import app from '../../src/app';
import { testUsers, testBookingScenarios } from '../data';
import { generateJWT } from '../utils/auth';

describe('Complete Booking Workflow E2E', () => {
  let customerToken;
  let providerToken;
  let bookingId;

  beforeAll(async () => {
    customerToken = generateJWT(testUsers.customer);
    providerToken = generateJWT(testUsers.provider);
  });

  it('should complete full booking lifecycle', async () => {
    // Step 1: Check availability
    const availabilityResponse = await request(app)
      .post('/api/bookings/check-availability')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        providerId: testBookingScenarios.validBooking.providerId,
        serviceId: testBookingScenarios.validBooking.serviceId,
        date: testBookingScenarios.validBooking.date,
        time: testBookingScenarios.validBooking.time
      })
      .expect(200);

    expect(availabilityResponse.body.data.available).toBe(true);

    // Step 2: Create booking
    const createResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(testBookingScenarios.validBooking)
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.status).toBe('pending');
    bookingId = createResponse.body.data.id;

    // Step 3: Provider confirms booking
    const confirmResponse = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        status: 'confirmed',
        reason: 'Provider confirmed after verification'
      })
      .expect(200);

    expect(confirmResponse.body.data.status).toBe('confirmed');

    // Step 4: Check booking details
    const detailsResponse = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(detailsResponse.body.data.status).toBe('confirmed');
    expect(detailsResponse.body.data.id).toBe(bookingId);

    // Step 5: Provider completes service
    const completeResponse = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        status: 'completed',
        reason: 'Service completed successfully',
        providerNotes: 'Customer was satisfied with the service'
      })
      .expect(200);

    expect(completeResponse.body.data.status).toBe('completed');

    // Step 6: Verify final state
    const finalResponse = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(finalResponse.body.data.status).toBe('completed');
  });

  it('should handle booking cancellation workflow', async () => {
    // Create booking
    const createResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        ...testBookingScenarios.validBooking,
        time: '16:00' // Different time
      })
      .expect(201);

    const bookingId = createResponse.body.data.id;

    // Customer cancels booking
    const cancelResponse = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        reason: 'Family emergency',
        refundRequested: true
      })
      .expect(200);

    expect(cancelResponse.body.data.status).toBe('cancelled');

    // Verify booking cannot be modified after cancellation
    await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        status: 'confirmed'
      })
      .expect(400);
  });

  it('should handle reschedule workflow', async () => {
    // Create booking
    const createResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        ...testBookingScenarios.validBooking,
        time: '17:00'
      })
      .expect(201);

    const bookingId = createResponse.body.data.id;

    // Reschedule booking
    const rescheduleResponse = await request(app)
      .post(`/api/bookings/${bookingId}/reschedule`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        date: '2024-07-26',
        time: '18:00',
        reason: 'Customer requested time change'
      })
      .expect(200);

    expect(rescheduleResponse.body.data.bookingDate).toBe('2024-07-26');
    expect(rescheduleResponse.body.data.startTime).toBe('18:00');

    // Verify new time slot
    const detailsResponse = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(detailsResponse.body.data.bookingDate).toBe('2024-07-26');
    expect(detailsResponse.body.data.startTime).toBe('18:00');
  });
});
```

### Provider Dashboard Workflow
```javascript
// tests/e2e/providerDashboard.test.js
describe('Provider Dashboard E2E', () => {
  let providerToken;
  let customerToken;

  beforeAll(async () => {
    providerToken = generateJWT(testUsers.provider);
    customerToken = generateJWT(testUsers.customer);

    // Create multiple test bookings
    const bookingData = [
      { ...testBookingScenarios.validBooking, time: '09:00' },
      { ...testBookingScenarios.validBooking, time: '10:00' },
      { ...testBookingScenarios.validBooking, time: '11:00' },
    ];

    for (const booking of bookingData) {
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(booking);
    }
  });

  it('should provide complete dashboard data', async () => {
    const response = await request(app)
      .get('/api/bookings/dashboard?period=today')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('todayBookings');
    expect(response.body.data).toHaveProperty('pendingBookings');
    expect(response.body.data).toHaveProperty('stats');
  });

  it('should handle bulk operations', async () => {
    // Get provider bookings to get IDs
    const bookingsResponse = await request(app)
      .get(`/api/bookings/provider/${testUsers.provider.id}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    const bookingIds = bookingsResponse.body.data.data
      .filter(b => b.status === 'pending')
      .map(b => b.id)
      .slice(0, 2);

    // Bulk confirm
    const bulkResponse = await request(app)
      .post('/api/bookings/bulk')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        bookingIds,
        operation: 'confirm',
        reason: 'Bulk confirmation after schedule review'
      })
      .expect(200);

    expect(bulkResponse.body.data.successful).toHaveLength(2);
    expect(bulkResponse.body.data.failed).toHaveLength(0);
  });

  it('should provide analytics data', async () => {
    const response = await request(app)
      .get('/api/bookings/analytics/stats?period=week&includeRevenue=true')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('summary');
    expect(response.body.data).toHaveProperty('periodData');
    expect(response.body.data.summary).toHaveProperty('totalRevenue');
  });
});
```

---

## Error Scenario Testing

### Validation Error Tests
```javascript
// tests/integration/errorScenarios.test.js
describe('Error Scenario Testing', () => {
  let customerToken;

  beforeAll(async () => {
    customerToken = generateJWT(testUsers.customer);
  });

  describe('Validation Errors', () => {
    it('should handle invalid phone number format', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ...testBookingScenarios.validBooking,
          customerPhone: '123456789' // Invalid format
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid phone number format');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid UUID format', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ...testBookingScenarios.validBooking,
          providerId: 'invalid-uuid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Provider ID must be a valid UUID');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testBookingScenarios.validBooking.providerId,
          // Missing serviceId, date, time
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid date formats', async () => {
      const invalidDates = ['2024/07/25', '25-07-2024', 'invalid-date'];

      for (const date of invalidDates) {
        const response = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            ...testBookingScenarios.validBooking,
            date
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should handle invalid time formats', async () => {
      const invalidTimes = ['25:00', '14:70', '2:30 PM', 'invalid-time'];

      for (const time of invalidTimes) {
        const response = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            ...testBookingScenarios.validBooking,
            time
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Business Logic Errors', () => {
    it('should handle non-existent provider', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ...testBookingScenarios.validBooking,
          providerId: '00000000-0000-0000-0000-000000000000'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Provider not found');
    });

    it('should handle non-existent service', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ...testBookingScenarios.validBooking,
          serviceId: '00000000-0000-0000-0000-000000000000'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service not found');
    });

    it('should handle inactive service', async () => {
      // This would require setting up an inactive service in test data
      // Implementation depends on test data setup
    });

    it('should handle unverified provider', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ...testBookingScenarios.validBooking,
          providerId: testProviders.unverifiedCenter.id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Provider is not verified');
    });
  });

  describe('Authentication and Authorization Errors', () => {
    it('should handle missing authentication token', async () => {
      await request(app)
        .post('/api/bookings')
        .send(testBookingScenarios.validBooking)
        .expect(401);
    });

    it('should handle invalid authentication token', async () => {
      await request(app)
        .post('/api/bookings')
        .set('Authorization', 'Bearer invalid-token')
        .send(testBookingScenarios.validBooking)
        .expect(401);
    });

    it('should handle expired authentication token', async () => {
      const expiredToken = generateJWT(testUsers.customer, { expiresIn: '0s' });
      
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(testBookingScenarios.validBooking)
        .expect(401);
    });

    it('should handle insufficient permissions', async () => {
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(testBookingScenarios.validBooking);

      const bookingId = bookingResponse.body.data.id;

      // Customer trying to confirm booking (only providers can do this)
      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'confirmed' })
        .expect(403);
    });
  });

  describe('Rate Limiting Errors', () => {
    it('should handle booking creation rate limit', async () => {
      // Note: This test requires rate limiting to be enabled
      const promises = [];
      
      // Try to create 10 bookings rapidly (limit is 5 per 15 minutes)
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
              ...testBookingScenarios.validBooking,
              time: `${10 + i}:00`
            })
        );
      }

      const results = await Promise.allSettled(promises);
      
      // Some requests should be rate limited
      const rateLimited = results.filter(result => 
        result.status === 'fulfilled' && result.value.status === 429
      );
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Performance Testing

### Load Testing Scenarios
```javascript
// tests/performance/loadTest.test.js
import request from 'supertest';
import app from '../../src/app';
import { performance } from 'perf_hooks';

describe('Performance Testing', () => {
  const CONCURRENT_USERS = 50;
  const REQUESTS_PER_USER = 10;

  it('should handle concurrent booking creations', async () => {
    const tokens = Array.from({ length: CONCURRENT_USERS }, (_, i) =>
      generateJWT({ id: `user-${i}`, phone: `+96277${String(i).padStart(7, '0')}` })
    );

    const startTime = performance.now();
    const promises = [];

    tokens.forEach((token, i) => {
      for (let j = 0; j < REQUESTS_PER_USER; j++) {
        promises.push(
          request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...testBookingScenarios.validBooking,
              date: '2024-07-25',
              time: `${10 + (i * REQUESTS_PER_USER + j) % 10}:${(j * 15) % 60}`,
              providerId: testProviders.verifiedSalon.id
            })
        );
      }
    });

    const results = await Promise.allSettled(promises);
    const endTime = performance.now();

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
    const failed = results.filter(r => r.status === 'rejected' || r.value.status !== 201);

    console.log(`Performance Test Results:
      Total Requests: ${promises.length}
      Successful: ${successful.length}
      Failed: ${failed.length}
      Duration: ${(endTime - startTime).toFixed(2)}ms
      Avg Response Time: ${((endTime - startTime) / promises.length).toFixed(2)}ms
    `);

    // Performance assertions
    expect(endTime - startTime).toBeLessThan(30000); // Complete within 30 seconds
    expect(successful.length / promises.length).toBeGreaterThan(0.8); // 80% success rate
  });

  it('should handle concurrent booking reads efficiently', async () => {
    const userToken = generateJWT(testUsers.customer);
    
    // Create some test bookings first
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...testBookingScenarios.validBooking,
          time: `${10 + i}:00`
        });
    }

    const startTime = performance.now();
    const readPromises = Array.from({ length: 100 }, () =>
      request(app)
        .get('/api/bookings/user?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`)
    );

    const results = await Promise.allSettled(readPromises);
    const endTime = performance.now();

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
    
    console.log(`Read Performance Test Results:
      Total Requests: ${readPromises.length}
      Successful: ${successful.length}
      Duration: ${(endTime - startTime).toFixed(2)}ms
      Avg Response Time: ${((endTime - startTime) / readPromises.length).toFixed(2)}ms
    `);

    expect(successful.length).toBe(readPromises.length);
    expect(endTime - startTime).toBeLessThan(10000); // Complete within 10 seconds
  });

  it('should maintain response time under load', async () => {
    const responseTimes = [];
    const userToken = generateJWT(testUsers.customer);

    for (let i = 0; i < 50; i++) {
      const startTime = performance.now();
      
      await request(app)
        .get('/api/bookings/user')
        .set('Authorization', `Bearer ${userToken}`);
      
      const endTime = performance.now();
      responseTimes.push(endTime - startTime);
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

    console.log(`Response Time Analysis:
      Average: ${avgResponseTime.toFixed(2)}ms
      Maximum: ${maxResponseTime.toFixed(2)}ms
      95th Percentile: ${p95ResponseTime.toFixed(2)}ms
    `);

    expect(avgResponseTime).toBeLessThan(500); // Average under 500ms
    expect(p95ResponseTime).toBeLessThan(1000); // 95% under 1 second
  });
});
```

---

## Mobile App Testing

### React Native Testing Examples
```javascript
// mobile-app/tests/bookingFlow.test.js
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BookingScreen } from '../src/screens/BookingScreen';
import { bookingService } from '../src/services/bookingService';

// Mock the booking service
jest.mock('../src/services/bookingService');

describe('BookingScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  const mockRoute = {
    params: {
      providerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      serviceId: 'service1-1111-1111-1111-111111111111',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create booking successfully', async () => {
    bookingService.checkAvailability.mockResolvedValue({
      data: { available: true, estimatedAmount: 25.00 }
    });

    bookingService.createBooking.mockResolvedValue({
      success: true,
      data: { id: 'booking-123', status: 'pending' }
    });

    const { getByTestId, getByText } = render(
      <BookingScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select date and time
    fireEvent.press(getByTestId('date-picker'));
    fireEvent.press(getByText('25')); // Select 25th day

    fireEvent.press(getByTestId('time-picker'));
    fireEvent.press(getByText('14:30'));

    // Wait for availability check
    await waitFor(() => {
      expect(bookingService.checkAvailability).toHaveBeenCalled();
    });

    // Create booking
    fireEvent.press(getByTestId('book-button'));

    await waitFor(() => {
      expect(bookingService.createBooking).toHaveBeenCalledWith({
        providerId: mockRoute.params.providerId,
        serviceId: mockRoute.params.serviceId,
        date: expect.any(String),
        time: '14:30',
        paymentMethod: 'cash',
        notes: ''
      });
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('BookingDetails', {
      bookingId: 'booking-123'
    });
  });

  it('should handle booking conflict error', async () => {
    bookingService.checkAvailability.mockResolvedValue({
      data: { 
        available: false, 
        conflictingBookings: [{ customerName: 'John Doe' }],
        suggestedTimes: [{ startTime: '16:00', endTime: '17:00' }]
      }
    });

    const { getByTestId, getByText } = render(
      <BookingScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByTestId('date-picker'));
    fireEvent.press(getByText('25'));

    fireEvent.press(getByTestId('time-picker'));
    fireEvent.press(getByText('14:30'));

    await waitFor(() => {
      expect(getByText('Time slot conflicts')).toBeTruthy();
    });

    // Should show suggested times
    expect(getByText('16:00 - 17:00')).toBeTruthy();
  });

  it('should handle payment method requirement', async () => {
    bookingService.checkAvailability.mockResolvedValue({
      data: { available: true, estimatedAmount: 150.00 }
    });

    const { getByTestId, getByText } = render(
      <BookingScreen navigation={mockNavigation} route={mockRoute} />
    );

    // High value booking should require online payment
    await waitFor(() => {
      expect(getByText('Online payment required')).toBeTruthy();
    });

    // Payment method should be automatically set to online
    expect(getByTestId('payment-method-online')).toBeTruthy();
  });
});
```

### Integration Testing for Mobile
```javascript
// mobile-app/tests/integration/api.test.js
import { bookingService } from '../src/services/bookingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// This would test against a real test API
describe('Mobile API Integration', () => {
  beforeAll(async () => {
    // Set up test authentication
    await AsyncStorage.setItem('auth_token', 'test-token');
  });

  it('should handle network errors gracefully', async () => {
    // Mock network failure
    fetch.mockRejectOnce(new Error('Network error'));

    try {
      await bookingService.createBooking({
        providerId: 'test-provider',
        serviceId: 'test-service',
        date: '2024-07-25',
        time: '14:30'
      });
    } catch (error) {
      expect(error.code).toBe('NETWORK_ERROR');
    }
  });

  it('should retry requests on server errors', async () => {
    // Mock server error then success
    fetch.mockRejectOnce(new Error('Server error'))
         .mockResolvedValueOnce({
           ok: true,
           json: () => Promise.resolve({ success: true, data: {} })
         });

    const result = await bookingService.createBooking({
      providerId: 'test-provider',
      serviceId: 'test-service',
      date: '2024-07-25',
      time: '14:30'
    });

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2); // Original + retry
  });
});
```

---

This comprehensive testing guide provides developers with practical examples and scenarios for thoroughly testing the Lamsa booking API across all levels - from unit tests to end-to-end workflows. Use these examples as a foundation for building robust test suites that ensure the reliability and quality of the booking system.