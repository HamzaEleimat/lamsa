/**
 * End-to-End Booking Flow Tests
 * Tests complete booking workflows from creation to completion
 */

const request = require('supertest');
const app = require('../../src/app');
const { testDatabase } = require('../utils/database');
const { startTestServer, stopTestServer } = require('../utils/testServer');
const MockHelpers = require('../utils/mockHelpers');
const UserFactory = require('../factories/userFactory').default || require('../factories/userFactory');
const ProviderFactory = require('../factories/providerFactory').default || require('../factories/providerFactory');
const ServiceFactory = require('../factories/serviceFactory').default || require('../factories/serviceFactory');
const BookingFactory = require('../factories/bookingFactory').default || require('../factories/bookingFactory');

describe('Booking Flow E2E Tests', () => {
  let server;
  let testUser;
  let testProvider;
  let testService;
  let customerToken;
  let providerToken;
  let adminToken;

  beforeAll(async () => {
    // Start test server
    server = await startTestServer();
    
    // Setup mock services for E2E tests
    MockHelpers.setupE2ETestMocks();

    // Setup test database
    await testDatabase.setup();
  }, 60000);

  afterAll(async () => {
    if (server) {
      await stopTestServer(server);
    }
    await testDatabase.cleanup();
    MockHelpers.resetAllMocks();
  }, 30000);

  beforeEach(async () => {
    // Reset database for each test
    await testDatabase.reset();
    
    // Reset mock services
    MockHelpers.resetAllMocks();
    MockHelpers.setupE2ETestMocks();

    // Create test data
    testUser = UserFactory.createCustomer();
    testProvider = ProviderFactory.createVerified();
    testService = ServiceFactory.create(testProvider.id);

    // Generate JWT tokens
    customerToken = generateJWT({
      id: testUser.id,
      type: 'customer',
      phone: testUser.phone
    });

    providerToken = generateJWT({
      id: testProvider.id,
      type: 'provider',
      phone: testProvider.phone
    });

    adminToken = generateJWT({
      id: 'admin-123',
      type: 'admin',
      phone: '+962771111111'
    });
  });

  describe('Complete Booking Lifecycle', () => {
    it('should complete full booking workflow from creation to completion', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Step 1: Check availability
      const availabilityResponse = await request(app)
        .post('/api/bookings/check-availability')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: bookingDate,
          time: '14:30'
        })
        .expect(200);

      expect(availabilityResponse.body.success).toBe(true);
      expect(availabilityResponse.body.data.available).toBe(true);

      // Step 2: Create booking
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: bookingDate,
          time: '14:30',
          paymentMethod: 'cash',
          notes: 'E2E test booking'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.status).toBe('pending');
      
      const bookingId = createResponse.body.data.id;

      // Wait for notifications to be sent
      await MockHelpers.waitForMockOperations(500);

      // Verify notifications were sent
      const notificationCheck = MockHelpers.verifyBookingNotifications({
        id: bookingId,
        userPhone: testUser.phone,
        userEmail: testUser.email
      });

      expect(notificationCheck.smsNotificationSent).toBe(true);
      expect(notificationCheck.emailNotificationSent).toBe(true);

      // Step 3: Provider confirms booking
      const confirmResponse = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          status: 'confirmed',
          reason: 'Provider confirmed booking via E2E test'
        })
        .expect(200);

      expect(confirmResponse.body.success).toBe(true);
      expect(confirmResponse.body.data.status).toBe('confirmed');

      // Step 4: Verify booking appears in provider dashboard
      const dashboardResponse = await request(app)
        .get('/api/bookings/dashboard?period=week')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data.todayBookings).toBeDefined();

      // Step 5: Verify booking appears in customer's bookings
      const userBookingsResponse = await request(app)
        .get('/api/bookings/user?status=confirmed')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(userBookingsResponse.body.success).toBe(true);
      expect(userBookingsResponse.body.data.data).toHaveLength(1);
      expect(userBookingsResponse.body.data.data[0].id).toBe(bookingId);

      // Step 6: Provider completes service
      const completeResponse = await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          status: 'completed',
          reason: 'Service completed successfully',
          providerNotes: 'Customer was satisfied'
        })
        .expect(200);

      expect(completeResponse.body.success).toBe(true);
      expect(completeResponse.body.data.status).toBe('completed');

      // Step 7: Verify final booking state
      const finalResponse = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(finalResponse.body.data.status).toBe('completed');
      expect(finalResponse.body.data.id).toBe(bookingId);

      // Step 8: Verify analytics are updated
      const analyticsResponse = await request(app)
        .get('/api/bookings/analytics/stats?period=week')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data.summary.completedBookings).toBeGreaterThan(0);
    });

    it('should handle booking cancellation workflow', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Create booking
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: bookingDate,
          time: '16:00',
          paymentMethod: 'cash',
          notes: 'Test cancellation workflow'
        })
        .expect(201);

      const bookingId = createResponse.body.data.id;

      // Customer cancels booking
      const cancelResponse = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Family emergency - E2E test',
          refundRequested: false
        })
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.data.status).toBe('cancelled');

      // Verify booking cannot be modified after cancellation
      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          status: 'confirmed'
        })
        .expect(400);

      // Verify cancelled booking appears in history
      const historyResponse = await request(app)
        .get('/api/bookings/user?status=cancelled')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(historyResponse.body.data.data).toHaveLength(1);
      expect(historyResponse.body.data.data[0].status).toBe('cancelled');
    });

    it('should handle reschedule workflow', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const bookingDate = futureDate.toISOString().split('T')[0];
      
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 5);
      const rescheduleDate = newDate.toISOString().split('T')[0];

      // Create booking
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: bookingDate,
          time: '17:00',
          paymentMethod: 'cash'
        })
        .expect(201);

      const bookingId = createResponse.body.data.id;

      // Reschedule booking
      const rescheduleResponse = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          date: rescheduleDate,
          time: '18:00',
          reason: 'Schedule conflict - E2E test'
        })
        .expect(200);

      expect(rescheduleResponse.body.success).toBe(true);
      expect(rescheduleResponse.body.data.bookingDate).toBe(rescheduleDate);
      expect(rescheduleResponse.body.data.startTime).toBe('18:00');

      // Verify new time slot is reflected
      const detailsResponse = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(detailsResponse.body.data.bookingDate).toBe(rescheduleDate);
      expect(detailsResponse.body.data.startTime).toBe('18:00');
    });
  });

  describe('Payment Flow Integration', () => {
    it('should handle online payment booking workflow', async () => {
      // Create high-value service that requires online payment
      const premiumService = ServiceFactory.create(testProvider.id, {
        name_ar: 'باقة مميزة',
        name_en: 'Premium Package',
        price: 150.00,
        duration_minutes: 120
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Attempt to create booking with cash payment (should fail)
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: premiumService.id,
          date: bookingDate,
          time: '10:00',
          paymentMethod: 'cash'
        })
        .expect(400);

      // Create booking with online payment
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: premiumService.id,
          date: bookingDate,
          time: '10:00',
          paymentMethod: 'online'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.amount).toBe(150.00);
      expect(createResponse.body.data.paymentMethod).toBe('online');

      const bookingId = createResponse.body.data.id;

      // Wait for payment processing
      await MockHelpers.waitForMockOperations(500);

      // Verify payment was processed
      const paymentCheck = MockHelpers.verifyPaymentProcessing({
        id: bookingId
      });

      expect(paymentCheck.paymentProcessed).toBe(true);
      expect(paymentCheck.paymentAmount).toBe(150.00);
      expect(paymentCheck.paymentMethod).toBe('online');
    });

    it('should handle payment failure scenario', async () => {
      // Simulate payment failures
      MockHelpers.simulateServiceOutages();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Attempt to create high-value booking
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: bookingDate,
          time: '11:00',
          paymentMethod: 'online',
          estimatedAmount: 120.00
        })
        .expect(402); // Payment required error

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Payment processing failed');
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle booking conflicts and suggest alternatives', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Create first booking
      const firstBookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: bookingDate,
          time: '14:30',
          paymentMethod: 'cash'
        })
        .expect(201);

      expect(firstBookingResponse.body.success).toBe(true);

      // Create second user
      const secondUser = UserFactory.createEnglishUser();
      const secondUserToken = generateJWT({
        id: secondUser.id,
        type: 'customer',
        phone: secondUser.phone
      });

      // Attempt to create conflicting booking
      const conflictResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: bookingDate,
          time: '14:30', // Same time slot
          paymentMethod: 'cash'
        })
        .expect(409);

      expect(conflictResponse.body.success).toBe(false);
      expect(conflictResponse.body.error).toContain('Time slot is already booked');

      // Check availability for conflicting slot
      const availabilityResponse = await request(app)
        .post('/api/bookings/check-availability')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: bookingDate,
          time: '14:30'
        })
        .expect(200);

      expect(availabilityResponse.body.data.available).toBe(false);
      expect(availabilityResponse.body.data.conflictingBookings).toHaveLength(1);
      expect(availabilityResponse.body.data.suggestedTimes).toBeDefined();
    });

    it('should handle concurrent booking attempts', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Create multiple users
      const users = Array.from({ length: 5 }, () => UserFactory.create());
      const tokens = users.map(user => 
        generateJWT({
          id: user.id,
          type: 'customer',
          phone: user.phone
        })
      );

      // Attempt concurrent bookings for same time slot
      const bookingPromises = tokens.map(token =>
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            providerId: testProvider.id,
            serviceId: testService.id,
            date: bookingDate,
            time: '15:00',
            paymentMethod: 'cash'
          })
      );

      const results = await Promise.allSettled(bookingPromises);

      // Only one booking should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      const failed = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 409
      );

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(4);
    });
  });

  describe('Provider Operations', () => {
    it('should handle bulk booking operations', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Create multiple bookings
      const bookingPromises = [];
      for (let i = 0; i < 3; i++) {
        bookingPromises.push(
          request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
              providerId: testProvider.id,
              serviceId: testService.id,
              date: bookingDate,
              time: `${10 + i}:00`,
              paymentMethod: 'cash'
            })
        );
      }

      const bookingResponses = await Promise.all(bookingPromises);
      const bookingIds = bookingResponses.map(r => r.body.data.id);

      // Bulk confirm all bookings
      const bulkResponse = await request(app)
        .post('/api/bookings/bulk')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          bookingIds: bookingIds,
          operation: 'confirm',
          reason: 'Bulk confirmation - E2E test'
        })
        .expect(200);

      expect(bulkResponse.body.success).toBe(true);
      expect(bulkResponse.body.data.successful).toHaveLength(3);
      expect(bulkResponse.body.data.failed).toHaveLength(0);

      // Verify all bookings are confirmed
      for (const bookingId of bookingIds) {
        const detailsResponse = await request(app)
          .get(`/api/bookings/${bookingId}`)
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200);

        expect(detailsResponse.body.data.status).toBe('confirmed');
      }
    });

    it('should generate provider analytics', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Create and complete multiple bookings
      for (let i = 0; i < 3; i++) {
        const createResponse = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId: testProvider.id,
            serviceId: testService.id,
            date: bookingDate,
            time: `${14 + i}:00`,
            paymentMethod: 'cash'
          });

        const bookingId = createResponse.body.data.id;

        // Confirm and complete booking
        await request(app)
          .patch(`/api/bookings/${bookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'confirmed' });

        await request(app)
          .patch(`/api/bookings/${bookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'completed' });
      }

      // Get analytics
      const analyticsResponse = await request(app)
        .get('/api/bookings/analytics/stats?period=week&includeRevenue=true')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data.summary.completedBookings).toBe(3);
      expect(analyticsResponse.body.data.summary.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service outages gracefully', async () => {
      // Simulate service outages
      MockHelpers.simulateServiceOutages();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Create booking (should succeed despite service issues)
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerId: testProvider.id,
          serviceId: testService.id,
          date: bookingDate,
          time: '16:30',
          paymentMethod: 'cash'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);

      // Wait for notification attempts
      await MockHelpers.waitForMockOperations(1000);

      // Check that notification failures were handled gracefully
      const testReport = MockHelpers.generateTestReport();
      expect(testReport.services.sms.stats.failureRate).toBeGreaterThan(0);
      expect(testReport.services.email.stats.deliveryRate).toBeLessThan(0.5);
    });

    it('should recover from intermittent failures', async () => {
      // Set up intermittent failures
      MockHelpers.simulateIntermittentFailures();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const bookingDate = futureDate.toISOString().split('T')[0];

      const bookingPromises = [];

      // Create multiple bookings to test retry logic
      for (let i = 0; i < 5; i++) {
        bookingPromises.push(
          request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
              providerId: testProvider.id,
              serviceId: testService.id,
              date: bookingDate,
              time: `${12 + i}:00`,
              paymentMethod: 'cash'
            })
        );
      }

      const results = await Promise.allSettled(bookingPromises);
      
      // Most bookings should succeed despite intermittent failures
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      
      expect(successful.length).toBeGreaterThan(3); // At least 60% success rate
    });
  });

  describe('Search and Filtering', () => {
    it('should support comprehensive booking search', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Create bookings with different characteristics
      const bookings = [
        { time: '09:00', paymentMethod: 'cash', notes: 'Morning appointment' },
        { time: '14:00', paymentMethod: 'card', notes: 'Afternoon session' },
        { time: '18:00', paymentMethod: 'online', notes: 'Evening booking' }
      ];

      const bookingIds = [];
      for (const booking of bookings) {
        const response = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            providerId: testProvider.id,
            serviceId: testService.id,
            date: bookingDate,
            ...booking
          });
        bookingIds.push(response.body.data.id);
      }

      // Search by payment method
      const cardSearchResponse = await request(app)
        .get('/api/bookings/search?paymentMethod=card')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(cardSearchResponse.body.data.data).toHaveLength(1);
      expect(cardSearchResponse.body.data.data[0].paymentMethod).toBe('card');

      // Search by text
      const textSearchResponse = await request(app)
        .get('/api/bookings/search?q=morning')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(textSearchResponse.body.data.data).toHaveLength(1);
      expect(textSearchResponse.body.data.data[0].notes).toContain('Morning');

      // Search with date range
      const dateSearchResponse = await request(app)
        .get(`/api/bookings/search?dateFrom=${bookingDate}&dateTo=${bookingDate}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(dateSearchResponse.body.data.data).toHaveLength(3);
    });
  });
});

/**
 * Helper function to generate JWT tokens for testing
 */
function generateJWT(payload) {
  // This would use the actual JWT signing logic from your auth service
  // For now, returning a mock token
  return `test-jwt-${payload.id}-${payload.type}`;
}