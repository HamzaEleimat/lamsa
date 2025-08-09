/**
 * Provider Workflow End-to-End Tests
 * Tests provider-specific booking management workflows
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

describe('Provider Workflow E2E Tests', () => {
  let server;
  let testProvider;
  let testServices;
  let testCustomers;
  let providerToken;
  let customerTokens;
  let testBookings;

  beforeAll(async () => {
    // Start test server
    server = await startTestServer();
    
    // Setup mock services
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
    // Reset database and mocks
    await testDatabase.reset();
    MockHelpers.resetAllMocks();
    MockHelpers.setupE2ETestMocks();

    // Create test provider and services
    testProvider = ProviderFactory.createVerified({
      businessNameAr: 'صالون النجوم',
      businessNameEn: 'Star Beauty Salon',
      ownerName: 'فاطمة أحمد',
      phone: '+962781111111',
      email: 'star@test.com'
    });

    testServices = [
      ServiceFactory.createByType(testProvider.id, 'haircut'),
      ServiceFactory.createByType(testProvider.id, 'manicure'),
      ServiceFactory.createByType(testProvider.id, 'facial')
    ];

    // Create test customers
    testCustomers = [
      UserFactory.createArabicUser(),
      UserFactory.createEnglishUser(),
      UserFactory.create()
    ];

    // Generate tokens
    providerToken = generateJWT({
      id: testProvider.id,
      type: 'provider',
      phone: testProvider.phone
    });

    customerTokens = testCustomers.map(customer =>
      generateJWT({
        id: customer.id,
        type: 'customer',
        phone: customer.phone
      })
    );
  });

  describe('Daily Operations Workflow', () => {
    it('should handle complete daily workflow', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Create bookings for today and tomorrow
      const todayBookings = [];
      const tomorrowBookings = [];

      // Create today's bookings (already confirmed)
      for (let i = 0; i < 3; i++) {
        const createResponse = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerTokens[i]}`)
          .send({
            providerId: testProvider.id,
            serviceId: testServices[i].id,
            date: today,
            time: `${9 + i * 2}:00`,
            paymentMethod: 'cash'
          });

        const bookingId = createResponse.body.data.id;
        todayBookings.push(bookingId);

        // Provider confirms booking
        await request(app)
          .patch(`/api/bookings/${bookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'confirmed' });
      }

      // Create tomorrow's pending bookings
      for (let i = 0; i < 2; i++) {
        const createResponse = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerTokens[i]}`)
          .send({
            providerId: testProvider.id,
            serviceId: testServices[i].id,
            date: tomorrowStr,
            time: `${14 + i * 2}:00`,
            paymentMethod: 'cash'
          });

        tomorrowBookings.push(createResponse.body.data.id);
      }

      // Provider checks dashboard
      const dashboardResponse = await request(app)
        .get('/api/bookings/dashboard?period=today')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data.todayBookings).toHaveLength(3);
      expect(dashboardResponse.body.data.pendingBookings).toBeGreaterThan(0);

      // Provider marks first appointment as completed
      const completeResponse = await request(app)
        .patch(`/api/bookings/${todayBookings[0]}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          status: 'completed',
          providerNotes: 'Service completed on time'
        })
        .expect(200);

      expect(completeResponse.body.success).toBe(true);

      // Customer no-show for second appointment
      const noShowResponse = await request(app)
        .patch(`/api/bookings/${todayBookings[1]}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          status: 'no_show',
          reason: 'Customer did not arrive'
        })
        .expect(200);

      expect(noShowResponse.body.success).toBe(true);

      // Provider confirms tomorrow's bookings in bulk
      const bulkConfirmResponse = await request(app)
        .post('/api/bookings/bulk')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          bookingIds: tomorrowBookings,
          operation: 'confirm',
          reason: 'Bulk confirmation for tomorrow'
        })
        .expect(200);

      expect(bulkConfirmResponse.body.data.successful).toHaveLength(2);

      // Check updated dashboard stats
      const updatedDashboardResponse = await request(app)
        .get('/api/bookings/dashboard?period=today')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      const stats = updatedDashboardResponse.body.data.stats;
      expect(stats.todayRevenue).toBeGreaterThan(0);
      expect(stats.completionRate).toBeGreaterThan(0);
    });

    it('should manage appointment scheduling conflicts', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 2);
      const bookingDate = date.toISOString().split('T')[0];

      // Create initial booking
      const firstBookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerTokens[0]}`)
        .send({
          providerId: testProvider.id,
          serviceId: testServices[0].id,
          date: bookingDate,
          time: '14:00',
          paymentMethod: 'cash'
        })
        .expect(201);

      const firstBookingId = firstBookingResponse.body.data.id;

      // Second customer tries to book same slot
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerTokens[1]}`)
        .send({
          providerId: testProvider.id,
          serviceId: testServices[1].id,
          date: bookingDate,
          time: '14:00', // Conflict
          paymentMethod: 'cash'
        })
        .expect(409); // Conflict error

      // Provider reschedules first booking to resolve conflict
      const rescheduleResponse = await request(app)
        .post(`/api/bookings/${firstBookingId}/reschedule`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          date: bookingDate,
          time: '15:00',
          reason: 'Provider requested schedule adjustment'
        })
        .expect(200);

      expect(rescheduleResponse.body.data.startTime).toBe('15:00');

      // Now second customer can book the original slot
      const secondBookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerTokens[1]}`)
        .send({
          providerId: testProvider.id,
          serviceId: testServices[1].id,
          date: bookingDate,
          time: '14:00',
          paymentMethod: 'cash'
        })
        .expect(201);

      expect(secondBookingResponse.body.success).toBe(true);
    });
  });

  describe('Analytics and Reporting Workflow', () => {
    it('should generate comprehensive business analytics', async () => {
      // Create historical data
      const dates = [];
      for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Create bookings across multiple days
      const allBookings = [];
      for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
        const bookingsPerDay = 2 + dayIndex; // Increasing bookings over time
        
        for (let i = 0; i < bookingsPerDay; i++) {
          const customerIndex = i % testCustomers.length;
          const serviceIndex = i % testServices.length;
          
          const createResponse = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${customerTokens[customerIndex]}`)
            .send({
              providerId: testProvider.id,
              serviceId: testServices[serviceIndex].id,
              date: dates[dayIndex],
              time: `${9 + i * 2}:00`,
              paymentMethod: i % 2 === 0 ? 'cash' : 'card'
            });

          const bookingId = createResponse.body.data.id;
          allBookings.push(bookingId);

          // Confirm and complete some bookings
          await request(app)
            .patch(`/api/bookings/${bookingId}/status`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ status: 'confirmed' });

          if (dayIndex < 5) { // Complete bookings from past days
            await request(app)
              .patch(`/api/bookings/${bookingId}/status`)
              .set('Authorization', `Bearer ${providerToken}`)
              .send({ status: 'completed' });
          }
        }
      }

      // Get weekly analytics
      const weeklyAnalyticsResponse = await request(app)
        .get('/api/bookings/analytics/stats?period=week&includeRevenue=true&groupBy=day')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      const weeklyData = weeklyAnalyticsResponse.body.data;
      expect(weeklyData.summary.totalBookings).toBeGreaterThan(10);
      expect(weeklyData.summary.completedBookings).toBeGreaterThan(0);
      expect(weeklyData.summary.totalRevenue).toBeGreaterThan(0);
      expect(weeklyData.periodData).toHaveLength(7);

      // Get service-specific analytics
      const serviceAnalyticsResponse = await request(app)
        .get('/api/bookings/analytics/stats?period=week&groupBy=service')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(serviceAnalyticsResponse.body.data.topServices).toBeDefined();
      expect(serviceAnalyticsResponse.body.data.topServices.length).toBeGreaterThan(0);

      // Export data as CSV
      const exportResponse = await request(app)
        .get(`/api/bookings/export/csv?dateFrom=${dates[0]}&dateTo=${dates[dates.length - 1]}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(exportResponse.headers['content-type']).toContain('text/csv');
      expect(exportResponse.text).toContain('Booking ID');
    });

    it('should track business performance metrics', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const bookingDate = date.toISOString().split('T')[0];

      // Create diverse booking scenarios
      const scenarios = [
        { time: '09:00', status: 'completed', amount: 25 },
        { time: '11:00', status: 'completed', amount: 30 },
        { time: '13:00', status: 'no_show', amount: 25 },
        { time: '15:00', status: 'cancelled', amount: 35 },
        { time: '17:00', status: 'completed', amount: 40 }
      ];

      const bookingIds = [];
      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        const customerIndex = i % testCustomers.length;

        const createResponse = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerTokens[customerIndex]}`)
          .send({
            providerId: testProvider.id,
            serviceId: testServices[i % testServices.length].id,
            date: bookingDate,
            time: scenario.time,
            paymentMethod: 'cash'
          });

        const bookingId = createResponse.body.data.id;
        bookingIds.push(bookingId);

        // Set final status
        if (scenario.status !== 'pending') {
          if (scenario.status !== 'cancelled') {
            // Confirm first, then set final status
            await request(app)
              .patch(`/api/bookings/${bookingId}/status`)
              .set('Authorization', `Bearer ${providerToken}`)
              .send({ status: 'confirmed' });
          }

          if (scenario.status === 'cancelled') {
            await request(app)
              .post(`/api/bookings/${bookingId}/cancel`)
              .set('Authorization', `Bearer ${providerToken}`)
              .send({ reason: 'Provider cancelled for testing' });
          } else {
            await request(app)
              .patch(`/api/bookings/${bookingId}/status`)
              .set('Authorization', `Bearer ${providerToken}`)
              .send({ status: scenario.status });
          }
        }
      }

      // Get performance metrics
      const metricsResponse = await request(app)
        .get('/api/bookings/analytics/stats?period=day&includeRevenue=true')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      const metrics = metricsResponse.body.data.summary;
      expect(metrics.totalBookings).toBe(5);
      expect(metrics.completedBookings).toBe(3);
      expect(metrics.cancelledBookings).toBe(1);
      expect(metrics.completionRate).toBeCloseTo(0.6, 1); // 3/5 = 0.6
      expect(metrics.cancellationRate).toBeCloseTo(0.2, 1); // 1/5 = 0.2
    });
  });

  describe('Customer Communication Workflow', () => {
    it('should handle booking notifications and reminders', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];

      // Create booking
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerTokens[0]}`)
        .send({
          providerId: testProvider.id,
          serviceId: testServices[0].id,
          date: bookingDate,
          time: '14:00',
          paymentMethod: 'cash'
        })
        .expect(201);

      const bookingId = createResponse.body.data.id;

      // Wait for initial notifications
      await MockHelpers.waitForMockOperations(500);

      // Verify creation notifications
      let notificationCheck = MockHelpers.verifyBookingNotifications({
        id: bookingId,
        userPhone: testCustomers[0].phone,
        userEmail: testCustomers[0].email
      });

      expect(notificationCheck.smsNotificationSent).toBe(true);
      expect(notificationCheck.emailNotificationSent).toBe(true);

      // Provider confirms booking
      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          status: 'confirmed',
          reason: 'Booking confirmed by provider'
        });

      // Wait for confirmation notifications
      await MockHelpers.waitForMockOperations(500);

      // Provider cancels booking with customer notification
      await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          reason: 'Provider emergency - need to reschedule',
          notifyCustomer: true
        });

      // Wait for cancellation notifications
      await MockHelpers.waitForMockOperations(500);

      // Verify all notifications were sent
      const smsService = MockHelpers.createMockServices.sms();
      const emailService = MockHelpers.createMockServices.email();

      const smsMessages = smsService.getMessagesByRecipient(testCustomers[0].phone);
      const emails = emailService.getEmailsByRecipient(testCustomers[0].email);

      expect(smsMessages.length).toBeGreaterThan(1); // Creation + cancellation
      expect(emails.length).toBeGreaterThan(1); // Creation + cancellation
    });

    it('should send appointment reminders', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];

      // Create confirmed booking for tomorrow
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerTokens[0]}`)
        .send({
          providerId: testProvider.id,
          serviceId: testServices[0].id,
          date: bookingDate,
          time: '14:00',
          paymentMethod: 'cash'
        });

      const bookingId = createResponse.body.data.id;

      // Confirm booking
      await request(app)
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'confirmed' });

      // Check for reminder bookings
      const remindersResponse = await request(app)
        .get('/api/bookings/reminders?days=1&includeConfirmed=true')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(remindersResponse.body.success).toBe(true);
      expect(remindersResponse.body.data).toHaveLength(1);
      expect(remindersResponse.body.data[0].id).toBe(bookingId);
    });
  });

  describe('Business Optimization Workflow', () => {
    it('should optimize schedule and capacity', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 3);
      const bookingDate = date.toISOString().split('T')[0];

      // Create bookings at different times
      const timeSlots = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];
      const bookingIds = [];

      for (let i = 0; i < timeSlots.length; i++) {
        const createResponse = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerTokens[i % testCustomers.length]}`)
          .send({
            providerId: testProvider.id,
            serviceId: testServices[i % testServices.length].id,
            date: bookingDate,
            time: timeSlots[i],
            paymentMethod: 'cash'
          });

        bookingIds.push(createResponse.body.data.id);
      }

      // Provider views daily schedule
      const scheduleResponse = await request(app)
        .get(`/api/bookings/provider/${testProvider.id}?dateFrom=${bookingDate}&dateTo=${bookingDate}&sortBy=time&sortOrder=asc`)
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(scheduleResponse.body.data.data).toHaveLength(6);
      
      // Verify bookings are sorted by time
      const times = scheduleResponse.body.data.data.map(b => b.startTime);
      expect(times).toEqual(['09:00', '10:30', '12:00', '14:00', '15:30', '17:00']);

      // Provider identifies gap and optimizes schedule
      // Move 17:00 appointment to 13:00 to fill gap
      const lastBookingId = bookingIds[bookingIds.length - 1];
      
      await request(app)
        .post(`/api/bookings/${lastBookingId}/reschedule`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          date: bookingDate,
          time: '13:00',
          reason: 'Schedule optimization'
        });

      // Verify optimized schedule
      const optimizedScheduleResponse = await request(app)
        .get(`/api/bookings/provider/${testProvider.id}?dateFrom=${bookingDate}&dateTo=${bookingDate}&sortBy=time&sortOrder=asc`)
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      const optimizedTimes = optimizedScheduleResponse.body.data.data.map(b => b.startTime);
      expect(optimizedTimes).toContain('13:00');
      expect(optimizedTimes).not.toContain('17:00');
    });

    it('should handle peak time management', async () => {
      const peakDate = new Date();
      peakDate.setDate(peakDate.getDate() + 2);
      const peakDateStr = peakDate.toISOString().split('T')[0];

      // Simulate peak hours (14:00-18:00)
      const peakHours = ['14:00', '15:00', '16:00', '17:00'];
      const attemptedBookings = [];

      // Multiple customers try to book peak hours
      for (const hour of peakHours) {
        for (let i = 0; i < testCustomers.length; i++) {
          attemptedBookings.push(
            request(app)
              .post('/api/bookings')
              .set('Authorization', `Bearer ${customerTokens[i]}`)
              .send({
                providerId: testProvider.id,
                serviceId: testServices[i % testServices.length].id,
                date: peakDateStr,
                time: hour,
                paymentMethod: 'cash'
              })
          );
        }
      }

      const results = await Promise.allSettled(attemptedBookings);
      
      // Only 4 bookings should succeed (one per hour)
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      const conflicts = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 409
      );

      expect(successful).toHaveLength(4);
      expect(conflicts).toHaveLength(8); // 3 customers × 4 hours - 4 successful

      // Check availability suggestions for failed bookings
      const availabilityResponse = await request(app)
        .post('/api/bookings/check-availability')
        .set('Authorization', `Bearer ${customerTokens[0]}`)
        .send({
          providerId: testProvider.id,
          serviceId: testServices[0].id,
          date: peakDateStr,
          time: '14:00' // Already booked
        })
        .expect(200);

      expect(availabilityResponse.body.data.available).toBe(false);
      expect(availabilityResponse.body.data.suggestedTimes).toBeDefined();
      expect(availabilityResponse.body.data.suggestedTimes.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Helper function to generate JWT tokens for testing
 */
function generateJWT(payload) {
  return `test-jwt-${payload.id}-${payload.type}`;
}