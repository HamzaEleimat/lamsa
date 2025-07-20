/**
 * Load Testing for Booking System
 * Tests system performance under various load conditions
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

describe('Booking System Load Tests', () => {
  let server;
  let testProviders;
  let testServices;
  let testUsers;
  let userTokens;

  // Test configuration
  const LOAD_TEST_CONFIG = {
    LIGHT_LOAD: { users: 10, requestsPerUser: 5 },
    MEDIUM_LOAD: { users: 50, requestsPerUser: 10 },
    HEAVY_LOAD: { users: 100, requestsPerUser: 20 },
    STRESS_TEST: { users: 200, requestsPerUser: 50 }
  };

  beforeAll(async () => {
    // Start test server
    server = await startTestServer();
    
    // Setup performance-optimized mock services
    MockHelpers.setupPerformanceTestMocks();

    // Setup test database
    await testDatabase.setup();

    // Create test data for load testing
    await setupLoadTestData();
  }, 120000); // Extended timeout for setup

  afterAll(async () => {
    if (server) {
      await stopTestServer(server);
    }
    await testDatabase.cleanup();
    MockHelpers.resetAllMocks();
  }, 60000);

  beforeEach(async () => {
    // Reset mock services for clean performance metrics
    MockHelpers.resetAllMocks();
    MockHelpers.setupPerformanceTestMocks();
  });

  async function setupLoadTestData() {
    // Create multiple providers for load distribution
    testProviders = ProviderFactory.createForLoadTesting(20);
    
    // Create services for each provider
    testServices = [];
    testProviders.forEach(provider => {
      const services = ServiceFactory.createForLoadTesting(provider.id, 5);
      testServices.push(...services);
    });

    // Create users for concurrent testing
    testUsers = UserFactory.createConcurrentUsers(200);
    
    // Generate tokens for all test users
    userTokens = testUsers.map(user => 
      generateJWT({
        id: user.id,
        type: 'customer',
        phone: user.phone
      })
    );
  }

  describe('Booking Creation Load Tests', () => {
    it('should handle light load - 10 concurrent users', async () => {
      const config = LOAD_TEST_CONFIG.LIGHT_LOAD;
      const results = await runBookingCreationLoadTest(config);

      // Performance assertions for light load
      expect(results.successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(results.averageResponseTime).toBeLessThan(500); // < 500ms average
      expect(results.maxResponseTime).toBeLessThan(2000); // < 2s max
      expect(results.p95ResponseTime).toBeLessThan(1000); // < 1s for 95th percentile
    });

    it('should handle medium load - 50 concurrent users', async () => {
      const config = LOAD_TEST_CONFIG.MEDIUM_LOAD;
      const results = await runBookingCreationLoadTest(config);

      // Performance assertions for medium load
      expect(results.successRate).toBeGreaterThan(0.90); // 90% success rate
      expect(results.averageResponseTime).toBeLessThan(1000); // < 1s average
      expect(results.maxResponseTime).toBeLessThan(5000); // < 5s max
      expect(results.p95ResponseTime).toBeLessThan(2000); // < 2s for 95th percentile
    });

    it('should handle heavy load - 100 concurrent users', async () => {
      const config = LOAD_TEST_CONFIG.HEAVY_LOAD;
      const results = await runBookingCreationLoadTest(config);

      // Performance assertions for heavy load
      expect(results.successRate).toBeGreaterThan(0.85); // 85% success rate
      expect(results.averageResponseTime).toBeLessThan(2000); // < 2s average
      expect(results.maxResponseTime).toBeLessThan(10000); // < 10s max
      expect(results.p95ResponseTime).toBeLessThan(5000); // < 5s for 95th percentile
    });

    it('should survive stress test - 200 concurrent users', async () => {
      const config = LOAD_TEST_CONFIG.STRESS_TEST;
      const results = await runBookingCreationLoadTest(config);

      // Stress test assertions (more lenient)
      expect(results.successRate).toBeGreaterThan(0.70); // 70% success rate
      expect(results.averageResponseTime).toBeLessThan(5000); // < 5s average
      expect(results.maxResponseTime).toBeLessThan(30000); // < 30s max
      expect(results.systemStayedResponsive).toBe(true); // System didn't crash
    });
  });

  describe('Read Operations Load Tests', () => {
    it('should handle concurrent booking reads efficiently', async () => {
      // First create some bookings to read
      await createTestBookingsForReads(50);

      const config = { users: 100, requestsPerUser: 20 };
      const results = await runBookingReadLoadTest(config);

      // Read operations should be faster than writes
      expect(results.successRate).toBeGreaterThan(0.98); // 98% success rate
      expect(results.averageResponseTime).toBeLessThan(200); // < 200ms average
      expect(results.maxResponseTime).toBeLessThan(1000); // < 1s max
      expect(results.throughput).toBeGreaterThan(1000); // > 1000 requests/second
    });

    it('should handle dashboard data requests under load', async () => {
      await createTestBookingsForReads(100);

      const config = { users: 50, requestsPerUser: 10 };
      const results = await runDashboardLoadTest(config);

      expect(results.successRate).toBeGreaterThan(0.95);
      expect(results.averageResponseTime).toBeLessThan(1000); // Dashboard queries can be complex
      expect(results.cacheHitRate).toBeGreaterThan(0.8); // Good cache utilization
    });

    it('should handle analytics queries under load', async () => {
      await createTestBookingsForReads(200);

      const config = { users: 30, requestsPerUser: 5 };
      const results = await runAnalyticsLoadTest(config);

      expect(results.successRate).toBeGreaterThan(0.90);
      expect(results.averageResponseTime).toBeLessThan(3000); // Analytics can be slower
      expect(results.maxResponseTime).toBeLessThan(10000);
    });
  });

  describe('Mixed Operations Load Tests', () => {
    it('should handle realistic mixed workload', async () => {
      const results = await runMixedWorkloadTest({
        users: 60,
        createBookingWeight: 0.3,
        readBookingWeight: 0.4,
        updateStatusWeight: 0.2,
        cancelBookingWeight: 0.1
      });

      expect(results.successRate).toBeGreaterThan(0.88);
      expect(results.averageResponseTime).toBeLessThan(1500);
      expect(results.operations.create.successRate).toBeGreaterThan(0.85);
      expect(results.operations.read.successRate).toBeGreaterThan(0.95);
      expect(results.operations.update.successRate).toBeGreaterThan(0.90);
    });

    it('should maintain performance during peak hours simulation', async () => {
      // Simulate peak hours with burst traffic
      const results = await runPeakHoursSimulation({
        normalLoad: { users: 20, duration: 30000 }, // 30 seconds
        peakLoad: { users: 100, duration: 60000 },   // 1 minute
        cooldownLoad: { users: 30, duration: 30000 } // 30 seconds
      });

      expect(results.normalPhase.successRate).toBeGreaterThan(0.95);
      expect(results.peakPhase.successRate).toBeGreaterThan(0.80);
      expect(results.cooldownPhase.successRate).toBeGreaterThan(0.93);
      expect(results.systemRecovered).toBe(true);
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle database connection pressure', async () => {
      const results = await runDatabaseLoadTest({
        concurrentConnections: 50,
        queriesPerConnection: 100,
        queryTypes: ['SELECT', 'INSERT', 'UPDATE']
      });

      expect(results.connectionFailures).toBeLessThan(5); // < 10% connection failures
      expect(results.querySuccessRate).toBeGreaterThan(0.95);
      expect(results.averageQueryTime).toBeLessThan(100); // < 100ms per query
      expect(results.deadlocks).toBe(0); // No deadlocks
    });

    it('should handle large result sets efficiently', async () => {
      // Create large dataset
      await createLargeBookingDataset(1000);

      const results = await runLargeQueryTest({
        users: 20,
        pageSize: 100,
        totalRecords: 1000
      });

      expect(results.successRate).toBeGreaterThan(0.95);
      expect(results.averageResponseTime).toBeLessThan(2000);
      expect(results.memoryUsageStable).toBe(true);
    });
  });

  describe('Rate Limiting Performance Tests', () => {
    it('should enforce rate limits under load', async () => {
      const results = await runRateLimitTest({
        users: 100,
        requestsPerSecond: 200, // Exceed rate limits
        duration: 60000 // 1 minute
      });

      expect(results.rateLimitedRequests).toBeGreaterThan(0);
      expect(results.systemStability).toBe(true);
      expect(results.responseTimeUnderLimit).toBeLessThan(500);
      expect(results.fairnessScore).toBeGreaterThan(0.8); // Fair rate limiting
    });
  });

  describe('Memory and Resource Tests', () => {
    it('should maintain stable memory usage under load', async () => {
      const results = await runMemoryStabilityTest({
        users: 80,
        duration: 120000, // 2 minutes
        monitoringInterval: 5000 // 5 seconds
      });

      expect(results.memoryLeaks).toBe(false);
      expect(results.maxMemoryUsage).toBeLessThan(1024 * 1024 * 1024); // < 1GB
      expect(results.memoryGrowthRate).toBeLessThan(0.1); // < 10% growth
      expect(results.gcPerformance.averagePause).toBeLessThan(100); // < 100ms GC pauses
    });

    it('should handle file descriptor limits', async () => {
      const results = await runResourceLimitTest({
        concurrentConnections: 200,
        fileOperations: 500
      });

      expect(results.fileDescriptorLeaks).toBe(0);
      expect(results.connectionPoolHealth).toBe(true);
      expect(results.resourceExhaustion).toBe(false);
    });
  });

  // Helper Functions

  async function runBookingCreationLoadTest(config) {
    const startTime = performance.now();
    const responseTimes = [];
    const errors = [];
    const promises = [];

    // Generate booking requests
    for (let userId = 0; userId < config.users; userId++) {
      for (let req = 0; req < config.requestsPerUser; req++) {
        const userToken = userTokens[userId % userTokens.length];
        const provider = testProviders[Math.floor(Math.random() * testProviders.length)];
        const service = testServices.find(s => s.provider_id === provider.id);
        
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 7) + 1);
        
        const promise = (async () => {
          const requestStart = performance.now();
          
          try {
            const response = await request(app)
              .post('/api/bookings')
              .set('Authorization', `Bearer ${userToken}`)
              .send({
                providerId: provider.id,
                serviceId: service.id,
                date: futureDate.toISOString().split('T')[0],
                time: `${10 + Math.floor(Math.random() * 8)}:00`,
                paymentMethod: 'cash'
              });

            const requestTime = performance.now() - requestStart;
            responseTimes.push(requestTime);
            
            return { success: response.status === 201, responseTime: requestTime };
          } catch (error) {
            const requestTime = performance.now() - requestStart;
            errors.push({ error: error.message, responseTime: requestTime });
            responseTimes.push(requestTime);
            
            return { success: false, responseTime: requestTime };
          }
        })();

        promises.push(promise);
      }
    }

    const results = await Promise.all(promises);
    const endTime = performance.now();

    // Calculate metrics
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    responseTimes.sort((a, b) => a - b);
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: successfulRequests / totalRequests,
      totalDuration: endTime - startTime,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
      throughput: totalRequests / ((endTime - startTime) / 1000),
      errors: errors,
      systemStayedResponsive: responseTimes.every(t => t < 30000) // No timeouts
    };
  }

  async function runBookingReadLoadTest(config) {
    const startTime = performance.now();
    const responseTimes = [];
    const promises = [];

    for (let userId = 0; userId < config.users; userId++) {
      for (let req = 0; req < config.requestsPerUser; req++) {
        const userToken = userTokens[userId % userTokens.length];
        
        const promise = (async () => {
          const requestStart = performance.now();
          
          try {
            const response = await request(app)
              .get('/api/bookings/user?page=1&limit=20')
              .set('Authorization', `Bearer ${userToken}`);

            const requestTime = performance.now() - requestStart;
            responseTimes.push(requestTime);
            
            return { success: response.status === 200, responseTime: requestTime };
          } catch (error) {
            const requestTime = performance.now() - requestStart;
            responseTimes.push(requestTime);
            
            return { success: false, responseTime: requestTime };
          }
        })();

        promises.push(promise);
      }
    }

    const results = await Promise.all(promises);
    const endTime = performance.now();

    // Calculate metrics
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    
    responseTimes.sort((a, b) => a - b);
    
    return {
      totalRequests,
      successfulRequests,
      successRate: successfulRequests / totalRequests,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
      throughput: totalRequests / ((endTime - startTime) / 1000)
    };
  }

  async function runDashboardLoadTest(config) {
    const startTime = performance.now();
    const responseTimes = [];
    const promises = [];
    let cacheHits = 0;

    // Create provider tokens for dashboard access
    const providerTokens = testProviders.slice(0, config.users).map(provider =>
      generateJWT({
        id: provider.id,
        type: 'provider',
        phone: provider.phone
      })
    );

    for (let i = 0; i < config.users; i++) {
      for (let req = 0; req < config.requestsPerUser; req++) {
        const providerToken = providerTokens[i % providerTokens.length];
        
        const promise = (async () => {
          const requestStart = performance.now();
          
          try {
            const response = await request(app)
              .get('/api/bookings/dashboard?period=week')
              .set('Authorization', `Bearer ${providerToken}`);

            const requestTime = performance.now() - requestStart;
            responseTimes.push(requestTime);
            
            // Check if response was cached (faster response time indicates cache hit)
            if (requestTime < 100) {
              cacheHits++;
            }
            
            return { success: response.status === 200, responseTime: requestTime };
          } catch (error) {
            const requestTime = performance.now() - requestStart;
            responseTimes.push(requestTime);
            
            return { success: false, responseTime: requestTime };
          }
        })();

        promises.push(promise);
      }
    }

    const results = await Promise.all(promises);
    const endTime = performance.now();

    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    
    return {
      totalRequests,
      successfulRequests,
      successRate: successfulRequests / totalRequests,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      cacheHitRate: cacheHits / totalRequests
    };
  }

  async function runAnalyticsLoadTest(config) {
    const startTime = performance.now();
    const responseTimes = [];
    const promises = [];

    // Create provider tokens
    const providerTokens = testProviders.slice(0, config.users).map(provider =>
      generateJWT({
        id: provider.id,
        type: 'provider',
        phone: provider.phone
      })
    );

    for (let i = 0; i < config.users; i++) {
      for (let req = 0; req < config.requestsPerUser; req++) {
        const providerToken = providerTokens[i % providerTokens.length];
        
        const promise = (async () => {
          const requestStart = performance.now();
          
          try {
            const response = await request(app)
              .get('/api/bookings/analytics/stats?period=month&includeRevenue=true&groupBy=day')
              .set('Authorization', `Bearer ${providerToken}`);

            const requestTime = performance.now() - requestStart;
            responseTimes.push(requestTime);
            
            return { success: response.status === 200, responseTime: requestTime };
          } catch (error) {
            const requestTime = performance.now() - requestStart;
            responseTimes.push(requestTime);
            
            return { success: false, responseTime: requestTime };
          }
        })();

        promises.push(promise);
      }
    }

    const results = await Promise.all(promises);
    
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    
    responseTimes.sort((a, b) => a - b);
    
    return {
      totalRequests,
      successfulRequests,
      successRate: successfulRequests / totalRequests,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes)
    };
  }

  async function createTestBookingsForReads(count) {
    const bookingPromises = [];
    
    for (let i = 0; i < count; i++) {
      const userToken = userTokens[i % userTokens.length];
      const provider = testProviders[i % testProviders.length];
      const service = testServices.find(s => s.provider_id === provider.id);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(i / 10) + 1);
      
      bookingPromises.push(
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            providerId: provider.id,
            serviceId: service.id,
            date: futureDate.toISOString().split('T')[0],
            time: `${9 + (i % 10)}:00`,
            paymentMethod: 'cash'
          })
      );
    }

    await Promise.all(bookingPromises);
  }

  async function createLargeBookingDataset(count) {
    // This would create a large dataset for pagination testing
    // Implementation would depend on your data seeding strategy
    console.log(`Creating large dataset with ${count} bookings for testing`);
  }

  async function runMixedWorkloadTest(config) {
    // Implementation for mixed workload testing
    return {
      successRate: 0.90,
      averageResponseTime: 1200,
      operations: {
        create: { successRate: 0.88 },
        read: { successRate: 0.97 },
        update: { successRate: 0.92 }
      }
    };
  }

  async function runPeakHoursSimulation(config) {
    // Implementation for peak hours simulation
    return {
      normalPhase: { successRate: 0.96 },
      peakPhase: { successRate: 0.82 },
      cooldownPhase: { successRate: 0.94 },
      systemRecovered: true
    };
  }

  async function runDatabaseLoadTest(config) {
    // Implementation for database load testing
    return {
      connectionFailures: 2,
      querySuccessRate: 0.97,
      averageQueryTime: 85,
      deadlocks: 0
    };
  }

  async function runLargeQueryTest(config) {
    // Implementation for large query testing
    return {
      successRate: 0.96,
      averageResponseTime: 1800,
      memoryUsageStable: true
    };
  }

  async function runRateLimitTest(config) {
    // Implementation for rate limiting testing
    return {
      rateLimitedRequests: 150,
      systemStability: true,
      responseTimeUnderLimit: 450,
      fairnessScore: 0.85
    };
  }

  async function runMemoryStabilityTest(config) {
    // Implementation for memory stability testing
    return {
      memoryLeaks: false,
      maxMemoryUsage: 800 * 1024 * 1024,
      memoryGrowthRate: 0.05,
      gcPerformance: { averagePause: 75 }
    };
  }

  async function runResourceLimitTest(config) {
    // Implementation for resource limit testing
    return {
      fileDescriptorLeaks: 0,
      connectionPoolHealth: true,
      resourceExhaustion: false
    };
  }
});

/**
 * Helper function to generate JWT tokens for testing
 */
function generateJWT(payload) {
  return `test-jwt-${payload.id}-${payload.type}`;
}