/**
 * Concurrent Operations Performance Tests
 * Tests system behavior under concurrent booking operations
 */

import request from 'supertest';
import app from '../../src/app';
import { testDatabase } from '../utils/database';
import { startTestServer, stopTestServer } from '../utils/testServer';
import MockHelpers from '../utils/mockHelpers';
import UserFactory from '../factories/userFactory';
import ProviderFactory from '../factories/providerFactory';
import ServiceFactory from '../factories/serviceFactory';
import { performance } from 'perf_hooks';

describe('Concurrent Operations Performance Tests', () => {
  let server;
  let testProvider;
  let testServices;
  let testUsers;
  let userTokens;
  let providerToken;

  beforeAll(async () => {
    server = await startTestServer();
    MockHelpers.setupPerformanceTestMocks();
    await testDatabase.setup();
    await setupConcurrencyTestData();
  }, 120000);

  afterAll(async () => {
    if (server) {
      await stopTestServer(server);
    }
    await testDatabase.cleanup();
    MockHelpers.resetAllMocks();
  }, 60000);

  beforeEach(async () => {
    await testDatabase.reset();
    MockHelpers.resetAllMocks();
    MockHelpers.setupPerformanceTestMocks();
  });

  async function setupConcurrencyTestData() {
    // Create provider and services for concurrency testing
    testProvider = ProviderFactory.createVerified({
      businessNameAr: 'صالون الاختبار المتزامن',
      businessNameEn: 'Concurrent Test Salon'
    });

    testServices = ServiceFactory.createComprehensiveServices(testProvider.id);

    // Create many users for concurrent operations
    testUsers = UserFactory.createConcurrentUsers(100);
    
    userTokens = testUsers.map(user => 
      generateJWT({
        id: user.id,
        type: 'customer',
        phone: user.phone
      })
    );

    providerToken = generateJWT({
      id: testProvider.id,
      type: 'provider',
      phone: testProvider.phone
    });
  }

  describe('Concurrent Booking Creation', () => {
    it('should handle race conditions for same time slot', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const bookingDate = futureDate.toISOString().split('T')[0];
      const timeSlot = '14:30';

      // 50 users try to book the same time slot simultaneously
      const concurrentBookingPromises = userTokens.slice(0, 50).map(token =>
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            providerId: testProvider.id,
            serviceId: testServices[0].id,
            date: bookingDate,
            time: timeSlot,
            paymentMethod: 'cash'
          })
      );

      const startTime = performance.now();
      const results = await Promise.allSettled(concurrentBookingPromises);
      const endTime = performance.now();

      // Analyze results
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      const conflicts = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 409
      );
      const errors = results.filter(r => r.status === 'rejected');

      // Assertions
      expect(successful).toHaveLength(1); // Only one booking should succeed
      expect(conflicts).toHaveLength(49); // Rest should get conflict errors
      expect(errors).toHaveLength(0); // No system errors
      expect(endTime - startTime).toBeLessThan(10000); // Complete within 10 seconds

      console.log(`Concurrent booking test: ${successful.length} successful, ${conflicts.length} conflicts, ${errors.length} errors in ${endTime - startTime}ms`);
    });

    it('should handle concurrent bookings for different time slots', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // Generate different time slots
      const timeSlots = Array.from({ length: 20 }, (_, i) => `${9 + Math.floor(i / 2)}:${(i % 2) * 30 || '00'}`);
      
      // Each user books a different time slot
      const concurrentBookingPromises = userTokens.slice(0, 20).map((token, index) =>
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            providerId: testProvider.id,
            serviceId: testServices[index % testServices.length].id,
            date: bookingDate,
            time: timeSlots[index],
            paymentMethod: 'cash'
          })
      );

      const startTime = performance.now();
      const results = await Promise.allSettled(concurrentBookingPromises);
      const endTime = performance.now();

      // All bookings should succeed since they're for different time slots
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      const failed = results.filter(r => 
        r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status !== 201)
      );

      expect(successful).toHaveLength(20);
      expect(failed).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(15000); // Complete within 15 seconds

      console.log(`Concurrent different slots test: ${successful.length} successful, ${failed.length} failed in ${endTime - startTime}ms`);
    });

    it('should handle concurrent bookings across multiple providers', async () => {
      // Create additional providers
      const additionalProviders = ProviderFactory.createForLoadTesting(10);
      const allProviders = [testProvider, ...additionalProviders];
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const bookingDate = futureDate.toISOString().split('T')[0];

      // 50 concurrent bookings across different providers
      const concurrentBookingPromises = userTokens.slice(0, 50).map((token, index) => {
        const provider = allProviders[index % allProviders.length];
        const service = testServices[index % testServices.length];
        
        return request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            providerId: provider.id,
            serviceId: service.id,
            date: bookingDate,
            time: `${10 + Math.floor(index / 5)}:00`,
            paymentMethod: 'cash'
          });
      });

      const startTime = performance.now();
      const results = await Promise.allSettled(concurrentBookingPromises);
      const endTime = performance.now();

      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );

      // Most bookings should succeed with multiple providers
      expect(successful.length).toBeGreaterThan(40); // At least 80% success
      expect(endTime - startTime).toBeLessThan(20000); // Complete within 20 seconds

      console.log(`Multi-provider concurrent test: ${successful.length}/50 successful in ${endTime - startTime}ms`);
    });
  });

  describe('Concurrent Status Updates', () => {
    it('should handle concurrent status updates safely', async () => {
      // First create a booking
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userTokens[0]}`)
        .send({
          providerId: testProvider.id,
          serviceId: testServices[0].id,
          date: getNextWeekDate(),
          time: '14:00',
          paymentMethod: 'cash'
        });

      const bookingId = createResponse.body.data.id;

      // Multiple concurrent status updates
      const statusUpdatePromises = [
        // Provider tries to confirm
        request(app)
          .patch(`/api/bookings/${bookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'confirmed', reason: 'Provider confirmation' }),
        
        // Customer tries to cancel (should conflict)
        request(app)
          .post(`/api/bookings/${bookingId}/cancel`)
          .set('Authorization', `Bearer ${userTokens[0]}`)
          .send({ reason: 'Customer cancellation' }),
        
        // Another provider status update attempt
        request(app)
          .patch(`/api/bookings/${bookingId}/status`)
          .set('Authorization', `Bearer ${providerToken}`)
          .send({ status: 'completed', reason: 'Service completed' })
      ];

      const results = await Promise.allSettled(statusUpdatePromises);
      
      // At least one operation should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && [200, 201].includes(r.value.status)
      );
      
      expect(successful.length).toBeGreaterThan(0);
      expect(successful.length).toBeLessThanOrEqual(2); // Not all should succeed due to conflicts

      // Verify final booking state is consistent
      const finalStateResponse = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userTokens[0]}`);

      expect(['confirmed', 'cancelled', 'completed']).toContain(finalStateResponse.body.data.status);
    });

    it('should handle bulk operations concurrency', async () => {
      // Create multiple bookings
      const bookingIds = [];
      for (let i = 0; i < 10; i++) {
        const createResponse = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${userTokens[i]}`)
          .send({
            providerId: testProvider.id,
            serviceId: testServices[i % testServices.length].id,
            date: getNextWeekDate(),
            time: `${10 + i}:00`,
            paymentMethod: 'cash'
          });
        
        bookingIds.push(createResponse.body.data.id);
      }

      // Concurrent bulk operations
      const bulkOperationPromises = [
        request(app)
          .post('/api/bookings/bulk')
          .set('Authorization', `Bearer ${providerToken}`)
          .send({
            bookingIds: bookingIds.slice(0, 5),
            operation: 'confirm',
            reason: 'Bulk confirmation 1'
          }),
        
        request(app)
          .post('/api/bookings/bulk')
          .set('Authorization', `Bearer ${providerToken}`)
          .send({
            bookingIds: bookingIds.slice(5),
            operation: 'confirm',
            reason: 'Bulk confirmation 2'
          })
      ];

      const results = await Promise.allSettled(bulkOperationPromises);
      
      // Both bulk operations should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      
      expect(successful).toHaveLength(2);

      // Verify all bookings are confirmed
      for (const bookingId of bookingIds) {
        const response = await request(app)
          .get(`/api/bookings/${bookingId}`)
          .set('Authorization', `Bearer ${userTokens[0]}`);
        
        expect(response.body.data.status).toBe('confirmed');
      }
    });
  });

  describe('Concurrent Read Operations', () => {
    it('should handle concurrent dashboard requests', async () => {
      // Create test data first
      await createTestBookingData(20);

      // Multiple providers accessing dashboard simultaneously
      const dashboardPromises = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/bookings/dashboard?period=week')
          .set('Authorization', `Bearer ${providerToken}`)
      );

      const startTime = performance.now();
      const results = await Promise.allSettled(dashboardPromises);
      const endTime = performance.now();

      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete quickly due to caching

      console.log(`Concurrent dashboard test: ${successful.length}/20 successful in ${endTime - startTime}ms`);
    });

    it('should handle concurrent search operations', async () => {
      await createTestBookingData(50);

      const searchPromises = Array.from({ length: 30 }, (_, index) => {
        const searchQueries = [
          '/api/bookings/search?status=pending',
          '/api/bookings/search?paymentMethod=cash',
          '/api/bookings/search?dateFrom=2024-07-20&dateTo=2024-07-25',
          '/api/bookings/search?q=test',
          '/api/bookings/search?sortBy=date&sortOrder=desc'
        ];
        
        return request(app)
          .get(searchQueries[index % searchQueries.length])
          .set('Authorization', `Bearer ${userTokens[index % userTokens.length]}`);
      });

      const startTime = performance.now();
      const results = await Promise.allSettled(searchPromises);
      const endTime = performance.now();

      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful.length).toBeGreaterThan(25); // At least 80% success
      expect(endTime - startTime).toBeLessThan(10000);

      console.log(`Concurrent search test: ${successful.length}/30 successful in ${endTime - startTime}ms`);
    });
  });

  describe('Mixed Concurrent Operations', () => {
    it('should handle realistic concurrent workload', async () => {
      const operations = [];
      const futureDate = getNextWeekDate();

      // Mix of operations that would happen in real usage
      for (let i = 0; i < 50; i++) {
        const operationType = Math.random();
        
        if (operationType < 0.4) {
          // 40% booking creation
          operations.push(
            request(app)
              .post('/api/bookings')
              .set('Authorization', `Bearer ${userTokens[i % userTokens.length]}`)
              .send({
                providerId: testProvider.id,
                serviceId: testServices[i % testServices.length].id,
                date: futureDate,
                time: `${9 + Math.floor(i / 5)}:${(i % 5) * 10}`,
                paymentMethod: 'cash'
              })
          );
        } else if (operationType < 0.7) {
          // 30% read operations
          operations.push(
            request(app)
              .get('/api/bookings/user?page=1&limit=10')
              .set('Authorization', `Bearer ${userTokens[i % userTokens.length]}`)
          );
        } else if (operationType < 0.85) {
          // 15% availability checks
          operations.push(
            request(app)
              .post('/api/bookings/check-availability')
              .set('Authorization', `Bearer ${userTokens[i % userTokens.length]}`)
              .send({
                providerId: testProvider.id,
                serviceId: testServices[0].id,
                date: futureDate,
                time: `${14 + (i % 4)}:00`
              })
          );
        } else {
          // 15% dashboard/analytics
          operations.push(
            request(app)
              .get('/api/bookings/dashboard?period=today')
              .set('Authorization', `Bearer ${providerToken}`)
          );
        }
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(operations);
      const endTime = performance.now();

      const successful = results.filter(r => 
        r.status === 'fulfilled' && [200, 201].includes(r.value.status)
      );
      const failed = results.filter(r => 
        r.status === 'rejected' || ![200, 201, 409].includes(r.value?.status)
      );

      // System should handle mixed load well
      expect(successful.length).toBeGreaterThan(35); // At least 70% success
      expect(failed.length).toBeLessThan(5); // Less than 10% system failures
      expect(endTime - startTime).toBeLessThan(30000); // Complete within 30 seconds

      console.log(`Mixed workload test: ${successful.length} successful, ${failed.length} failed in ${endTime - startTime}ms`);
    });

    it('should maintain data consistency under load', async () => {
      const futureDate = getNextWeekDate();
      
      // Create bookings and immediately try to modify them
      const consistencyOperations = [];
      
      for (let i = 0; i < 20; i++) {
        // Create booking
        const createPromise = request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${userTokens[i]}`)
          .send({
            providerId: testProvider.id,
            serviceId: testServices[0].id,
            date: futureDate,
            time: `${10 + i}:00`,
            paymentMethod: 'cash'
          });

        consistencyOperations.push(createPromise);
      }

      // Wait for all bookings to be created
      const createResults = await Promise.all(consistencyOperations);
      const bookingIds = createResults
        .filter(r => r.status === 201)
        .map(r => r.body.data.id);

      // Now perform concurrent modifications
      const modificationOperations = [];
      
      bookingIds.forEach((bookingId, index) => {
        // Concurrent status updates and cancellations
        if (index % 2 === 0) {
          modificationOperations.push(
            request(app)
              .patch(`/api/bookings/${bookingId}/status`)
              .set('Authorization', `Bearer ${providerToken}`)
              .send({ status: 'confirmed' })
          );
        } else {
          modificationOperations.push(
            request(app)
              .post(`/api/bookings/${bookingId}/cancel`)
              .set('Authorization', `Bearer ${userTokens[index]}`)
              .send({ reason: 'Test cancellation' })
          );
        }
      });

      await Promise.allSettled(modificationOperations);

      // Verify data consistency
      for (const bookingId of bookingIds) {
        const response = await request(app)
          .get(`/api/bookings/${bookingId}`)
          .set('Authorization', `Bearer ${userTokens[0]}`);
        
        expect(response.status).toBe(200);
        expect(['pending', 'confirmed', 'cancelled']).toContain(response.body.data.status);
        
        // Verify booking integrity
        expect(response.body.data.id).toBe(bookingId);
        expect(response.body.data.providerId).toBe(testProvider.id);
        expect(response.body.data.amount).toBeGreaterThan(0);
      }
    });
  });

  describe('Stress Testing', () => {
    it('should survive extreme concurrent load', async () => {
      const extremeOperations = [];
      const futureDate = getNextWeekDate();

      // Generate 200 concurrent operations
      for (let i = 0; i < 200; i++) {
        const operation = Math.random();
        
        if (operation < 0.6) {
          // Booking creation
          extremeOperations.push(
            request(app)
              .post('/api/bookings')
              .set('Authorization', `Bearer ${userTokens[i % userTokens.length]}`)
              .send({
                providerId: testProvider.id,
                serviceId: testServices[i % testServices.length].id,
                date: futureDate,
                time: `${9 + Math.floor(i / 20)}:${(i % 4) * 15}`,
                paymentMethod: 'cash'
              })
          );
        } else {
          // Read operations
          extremeOperations.push(
            request(app)
              .get('/api/bookings/user')
              .set('Authorization', `Bearer ${userTokens[i % userTokens.length]}`)
          );
        }
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(extremeOperations);
      const endTime = performance.now();

      const successful = results.filter(r => 
        r.status === 'fulfilled' && [200, 201, 409].includes(r.value.status)
      );
      const systemErrors = results.filter(r => 
        r.status === 'rejected' || r.value?.status >= 500
      );

      // System should survive extreme load
      expect(systemErrors.length).toBeLessThan(20); // Less than 10% system errors
      expect(successful.length).toBeGreaterThan(160); // At least 80% handled
      expect(endTime - startTime).toBeLessThan(60000); // Complete within 1 minute

      console.log(`Extreme load test: ${successful.length} successful, ${systemErrors.length} system errors in ${endTime - startTime}ms`);
    });
  });

  // Helper functions
  async function createTestBookingData(count) {
    const bookingPromises = [];
    const futureDate = getNextWeekDate();
    
    for (let i = 0; i < count; i++) {
      bookingPromises.push(
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${userTokens[i % userTokens.length]}`)
          .send({
            providerId: testProvider.id,
            serviceId: testServices[i % testServices.length].id,
            date: futureDate,
            time: `${9 + Math.floor(i / 5)}:${(i % 5) * 10 || '00'}`,
            paymentMethod: 'cash'
          })
      );
    }

    await Promise.all(bookingPromises);
  }

  function getNextWeekDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }
});

function generateJWT(payload) {
  return `test-jwt-${payload.id}-${payload.type}`;
}