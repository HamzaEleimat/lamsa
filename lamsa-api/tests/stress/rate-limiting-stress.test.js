/**
 * Rate Limiting Stress Tests
 * Tests API rate limiting effectiveness under various load patterns
 */

const request = require('supertest');
const { createTestServer } = require('../utils/testServer');
const { clearTestDatabase } = require('../utils/database');
const { 
  StressTestUtils, 
  LoadPatternGenerator,
  TestResultAnalyzer, 
  StressConfig 
} = require('./utils/stress-test-helpers');
const { 
  CustomerFactory, 
  ProviderFactory,
  ServiceFactory 
} = require('./utils/booking-factories');
const { sleep } = require('./utils/performance-monitor');

describe('Rate Limiting Stress Tests', () => {
  let app;
  let server;
  let testEnv;

  beforeAll(async () => {
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-rate-limiting';
    
    // Configure rate limits for testing
    process.env.RATE_LIMIT_BOOKING = '10'; // 10 requests per minute
    process.env.RATE_LIMIT_AVAILABILITY = '20'; // 20 requests per minute
    process.env.RATE_LIMIT_GENERAL = '50'; // 50 requests per minute
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    await clearTestDatabase();
    testEnv = StressTestUtils.createTestEnvironment(app);
    testEnv.monitor.startMonitoring(250); // Monitor every 250ms for rate limiting
  });

  afterEach(async () => {
    StressTestUtils.cleanupTestEnvironment(testEnv);
  });

  describe('Booking API Rate Limiting', () => {
    test('should enforce booking rate limits (10 req/min per user)', async () => {
      const requestsPerMinute = 10;
      const burstSize = 15; // Exceed limit
      const testDuration = 30000; // 30 seconds
      
      console.log(`🚦 Testing booking rate limits: ${burstSize} requests (limit: ${requestsPerMinute}/min)`);
      
      // Create test data
      const customer = CustomerFactory.create();
      const provider = ProviderFactory.create();
      const service = ServiceFactory.create(provider.id);
      
      // Authenticate customer
      const { userId, token } = await testEnv.client.authenticate('customer', customer);
      
      // Prepare booking requests that exceed rate limit
      const bookingRequests = [];
      for (let i = 0; i < burstSize; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1 + Math.floor(i / 5)); // Spread across days
        
        bookingRequests.push({
          method: 'POST',
          path: '/api/bookings',
          data: {
            providerId: provider.id,
            serviceId: service.id,
            customerId: customer.id,
            date: futureDate.toISOString().split('T')[0],
            time: `${9 + (i % 8)}:00`, // Different times
            duration: service.duration,
            totalAmount: service.basePrice,
            paymentMethod: 'cash',
            notes: `Rate limit test booking #${i + 1}`
          },
          userId: userId,
          options: { timeout: 5000 }
        });
      }
      
      console.log(`📊 Sending ${burstSize} booking requests rapidly...`);
      
      // Send all requests at once (burst pattern)
      const startTime = Date.now();
      const results = await testEnv.executor.executeConcurrent(bookingRequests, {
        maxConcurrency: burstSize,
        rampUpMs: 100, // Very fast ramp up
        delayBetweenRequests: 50 // 50ms between requests
      });
      
      const executionTime = Date.now() - startTime;
      await StressTestUtils.waitForCompletion(testEnv.executor, 10000);
      
      // Analyze rate limiting results
      const successful = results.filter(r => r.success && r.response.status < 400);
      const rateLimited = results.filter(r => r.response && r.response.status === 429);
      const serverErrors = results.filter(r => r.response && r.response.status >= 500);
      
      console.log(`📈 Rate Limiting Results:
        Total Requests: ${results.length}
        Successful: ${successful.length}
        Rate Limited (429): ${rateLimited.length}
        Server Errors: ${serverErrors.length}
        Execution Time: ${executionTime}ms
        Rate Limit Effectiveness: ${(rateLimited.length / results.length * 100).toFixed(2)}%
      `);
      
      // Validate rate limiting behavior
      expect(results.length).toBe(burstSize);
      expect(rateLimited.length).toBeGreaterThan(0); // Some requests should be rate limited
      expect(successful.length).toBeLessThanOrEqual(requestsPerMinute); // Should not exceed limit
      expect(serverErrors.length).toBe(0); // No server crashes
      
      // Rate limited responses should have proper headers
      rateLimited.forEach(result => {
        expect(result.response.headers['retry-after']).toBeDefined();
        expect(result.response.body.error).toBe('RATE_LIMIT_EXCEEDED');
        expect(result.response.body.messageAr).toBeDefined(); // Arabic error message
      });
      
      console.log(`⏰ Waiting for rate limit window to reset...`);
      
      // Wait for rate limit window to reset (typically 1 minute)
      await sleep(65000); // 65 seconds to be safe
      
      // Try again after rate limit reset
      const resetRequest = {
        method: 'POST',
        path: '/api/bookings',
        data: {
          providerId: provider.id,
          serviceId: service.id,
          customerId: customer.id,
          date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          time: '10:00',
          duration: service.duration,
          totalAmount: service.basePrice,
          paymentMethod: 'cash',
          notes: 'Post rate limit reset test'
        },
        userId: userId
      };
      
      const resetResult = await testEnv.executor.executeRequest(resetRequest);
      
      console.log(`🔄 Post-reset request status: ${resetResult.response?.status || 'Error'}`);
      
      // Should succeed after reset
      expect(resetResult.success).toBe(true);
      expect(resetResult.response.status).toBeLessThan(400);
      
    }, 120000); // 2 minute timeout to allow for rate limit reset

    test('should handle distributed rate limiting across multiple users', async () => {
      const numberOfUsers = 20;
      const requestsPerUser = 8; // Just under the 10/min limit
      
      console.log(`👥 Testing distributed rate limiting: ${numberOfUsers} users, ${requestsPerUser} requests each`);
      
      // Create multiple users
      const customers = CustomerFactory.createMany(numberOfUsers);
      const provider = ProviderFactory.create();
      const service = ServiceFactory.create(provider.id);
      
      // Authenticate all users
      const authenticatedUsers = [];
      for (let i = 0; i < numberOfUsers; i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedUsers.push(auth);
        } catch (error) {
          console.log(`Failed to authenticate user ${i}: ${error.message}`);
        }
      }
      
      console.log(`✅ Authenticated ${authenticatedUsers.length} users`);
      
      // Prepare requests from all users
      const allRequests = [];
      authenticatedUsers.forEach((user, userIndex) => {
        for (let reqIndex = 0; reqIndex < requestsPerUser; reqIndex++) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 1 + Math.floor(reqIndex / 3));
          
          allRequests.push({
            method: 'POST',
            path: '/api/bookings',
            data: {
              providerId: provider.id,
              serviceId: service.id,
              customerId: user.user.id,
              date: futureDate.toISOString().split('T')[0],
              time: `${10 + (reqIndex % 6)}:00`,
              duration: service.duration,
              totalAmount: service.basePrice,
              paymentMethod: 'cash',
              notes: `User ${userIndex} request ${reqIndex + 1}`
            },
            userId: user.userId,
            metadata: {
              userIndex,
              requestIndex: reqIndex
            }
          });
        }
      });
      
      console.log(`📊 Executing ${allRequests.length} requests from ${numberOfUsers} users...`);
      
      // Execute all requests concurrently
      const results = await testEnv.executor.executeConcurrent(allRequests, {
        maxConcurrency: 50,
        rampUpMs: 2000,
        delayBetweenRequests: 25
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 20000);
      
      // Analyze per-user rate limiting
      const userResults = new Map();
      results.forEach(result => {
        const userIndex = result.metadata?.userIndex;
        if (userIndex !== undefined) {
          if (!userResults.has(userIndex)) {
            userResults.set(userIndex, {
              total: 0,
              successful: 0,
              rateLimited: 0,
              errors: 0
            });
          }
          
          const userStats = userResults.get(userIndex);
          userStats.total++;
          
          if (result.success && result.response.status < 400) {
            userStats.successful++;
          } else if (result.response && result.response.status === 429) {
            userStats.rateLimited++;
          } else {
            userStats.errors++;
          }
        }
      });
      
      // Analyze distribution
      let usersWithinLimit = 0;
      let usersRateLimited = 0;
      
      userResults.forEach((stats, userIndex) => {
        console.log(`User ${userIndex}: ${stats.successful}/${stats.total} successful, ${stats.rateLimited} rate limited`);
        
        if (stats.successful <= 10) { // Within rate limit
          usersWithinLimit++;
        }
        if (stats.rateLimited > 0) {
          usersRateLimited++;
        }
      });
      
      console.log(`📈 Distributed Rate Limiting Results:
        Total Users: ${authenticatedUsers.length}
        Users Within Limit: ${usersWithinLimit}
        Users Rate Limited: ${usersRateLimited}
        Total Requests: ${results.length}
        Overall Success Rate: ${(results.filter(r => r.success && r.response.status < 400).length / results.length * 100).toFixed(2)}%
      `);
      
      // Validate distributed rate limiting
      expect(userResults.size).toBe(authenticatedUsers.length);
      expect(usersWithinLimit).toBeGreaterThan(0);
      
      // Each user should be rate limited independently
      userResults.forEach((stats, userIndex) => {
        // Most users should stay within limits
        if (stats.total === requestsPerUser) {
          expect(stats.successful).toBeGreaterThan(0);
          expect(stats.successful).toBeLessThanOrEqual(10); // Rate limit
        }
      });
      
    }, 60000);
  });

  describe('Availability API Rate Limiting', () => {
    test('should enforce availability check rate limits (20 req/min)', async () => {
      const requestsPerMinute = 20;
      const burstSize = 30; // Exceed limit
      
      console.log(`🔍 Testing availability rate limits: ${burstSize} requests (limit: ${requestsPerMinute}/min)`);
      
      // Create test data
      const customer = CustomerFactory.create();
      const providers = ProviderFactory.createMany(5);
      
      // Authenticate customer
      const { userId } = await testEnv.client.authenticate('customer', customer);
      
      // Prepare availability check requests
      const availabilityRequests = [];
      for (let i = 0; i < burstSize; i++) {
        const provider = providers[i % providers.length];
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() + 1 + (i % 7)); // Next week
        
        availabilityRequests.push({
          method: 'GET',
          path: `/api/availability/${provider.id}?date=${checkDate.toISOString().split('T')[0]}&duration=60`,
          data: null,
          userId: userId,
          options: { timeout: 3000 }
        });
      }
      
      console.log(`📊 Sending ${burstSize} availability requests rapidly...`);
      
      // Execute burst of availability checks
      const results = await testEnv.executor.executeConcurrent(availabilityRequests, {
        maxConcurrency: burstSize,
        rampUpMs: 200,
        delayBetweenRequests: 20
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 15000);
      
      // Analyze rate limiting for availability
      const successful = results.filter(r => r.success && r.response.status < 400);
      const rateLimited = results.filter(r => r.response && r.response.status === 429);
      const avgResponseTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      
      console.log(`📈 Availability Rate Limiting Results:
        Total Requests: ${results.length}
        Successful: ${successful.length}
        Rate Limited: ${rateLimited.length}
        Average Response Time: ${avgResponseTime.toFixed(2)}ms
        Rate Limit Hit Rate: ${(rateLimited.length / results.length * 100).toFixed(2)}%
      `);
      
      // Validate availability rate limiting
      expect(results.length).toBe(burstSize);
      expect(rateLimited.length).toBeGreaterThan(0); // Should hit rate limits
      expect(successful.length).toBeLessThanOrEqual(requestsPerMinute + 5); // Allow some tolerance
      expect(avgResponseTime).toBeLessThan(1000); // Should remain fast
      
      // Successful requests should return valid availability data
      successful.forEach(result => {
        expect(result.response.body.slots).toBeDefined();
        expect(Array.isArray(result.response.body.slots)).toBe(true);
      });
      
    }, 30000);

    test('should maintain performance during sustained availability load', async () => {
      const requestsPerSecond = 2; // Sustainable rate
      const testDuration = 30; // 30 seconds
      const totalRequests = requestsPerSecond * testDuration;
      
      console.log(`⚡ Testing sustained availability load: ${requestsPerSecond} req/s for ${testDuration}s`);
      
      // Create test data
      const customer = CustomerFactory.create();
      const providers = ProviderFactory.createMany(10);
      
      // Authenticate customer
      const { userId } = await testEnv.client.authenticate('customer', customer);
      
      // Generate sustained load pattern
      const loadPattern = LoadPatternGenerator.steadyLoad(requestsPerSecond, testDuration);
      
      const availabilityRequests = loadPattern.map((timing, index) => {
        const provider = providers[index % providers.length];
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() + 1 + Math.floor(index / 20));
        
        return {
          method: 'GET',
          path: `/api/availability/${provider.id}?date=${checkDate.toISOString().split('T')[0]}`,
          data: null,
          userId: userId,
          startTime: timing.startTime,
          requestIndex: timing.requestIndex
        };
      });
      
      console.log(`📊 Executing sustained load of ${totalRequests} requests...`);
      
      // Execute sustained load with proper timing
      const results = [];
      const startTime = Date.now();
      
      for (const request of availabilityRequests) {
        const elapsed = Date.now() - startTime;
        const delay = request.startTime - elapsed;
        
        if (delay > 0) {
          await sleep(delay);
        }
        
        // Execute request
        const resultPromise = testEnv.executor.executeRequest(request);
        results.push(resultPromise);
        
        // Print progress every 10 seconds
        if ((request.requestIndex + 1) % (requestsPerSecond * 10) === 0) {
          testEnv.monitor.printStatus();
        }
      }
      
      // Wait for all requests to complete
      const finalResults = await Promise.all(results);
      
      console.log(`⏱️ Sustained load test completed in ${Date.now() - startTime}ms`);
      
      // Analyze sustained load performance
      const successful = finalResults.filter(r => r.success && r.response.status < 400);
      const rateLimited = finalResults.filter(r => r.response && r.response.status === 429);
      const responseTimePercentiles = this.calculatePercentiles(successful.map(r => r.duration));
      
      console.log(`📈 Sustained Load Results:
        Total Requests: ${finalResults.length}
        Successful: ${successful.length}
        Rate Limited: ${rateLimited.length}
        Success Rate: ${(successful.length / finalResults.length * 100).toFixed(2)}%
        P95 Response Time: ${responseTimePercentiles.p95?.toFixed(2) || 0}ms
        P99 Response Time: ${responseTimePercentiles.p99?.toFixed(2) || 0}ms
      `);
      
      // Validate sustained performance
      expect(finalResults.length).toBe(totalRequests);
      expect(successful.length / finalResults.length).toBeGreaterThan(0.95); // 95% success rate
      expect(rateLimited.length).toBeLessThan(totalRequests * 0.02); // Less than 2% rate limited
      expect(responseTimePercentiles.p95).toBeLessThan(2000); // P95 under 2 seconds
      
      // Generate performance report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(testEnv.monitor);
      expect(performanceReport.benchmarks.throughput.passed).toBe(true);
      
    }, 45000);
  });

  describe('API Endpoint Rate Limiting Coordination', () => {
    test('should apply different rate limits to different endpoints', async () => {
      const testDuration = 20000; // 20 seconds
      
      console.log(`🎯 Testing endpoint-specific rate limiting coordination`);
      
      // Create test data
      const customer = CustomerFactory.create();
      const provider = ProviderFactory.create();
      const service = ServiceFactory.create(provider.id);
      
      // Authenticate customer
      const { userId } = await testEnv.client.authenticate('customer', customer);
      
      // Create mixed workload hitting different endpoints
      const mixedRequests = [];
      
      // Booking requests (10/min limit)
      for (let i = 0; i < 12; i++) {
        mixedRequests.push({
          type: 'booking',
          method: 'POST',
          path: '/api/bookings',
          data: {
            providerId: provider.id,
            serviceId: service.id,
            customerId: customer.id,
            date: new Date(Date.now() + 86400000 * (i + 1)).toISOString().split('T')[0],
            time: '10:00',
            duration: service.duration,
            totalAmount: service.basePrice,
            paymentMethod: 'cash'
          },
          userId: userId
        });
      }
      
      // Availability requests (20/min limit)
      for (let i = 0; i < 25; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() + i + 1);
        
        mixedRequests.push({
          type: 'availability',
          method: 'GET',
          path: `/api/availability/${provider.id}?date=${checkDate.toISOString().split('T')[0]}`,
          data: null,
          userId: userId
        });
      }
      
      // General API requests (50/min limit)
      for (let i = 0; i < 55; i++) {
        mixedRequests.push({
          type: 'search',
          method: 'GET',
          path: `/api/providers/search?lat=31.9566&lng=35.9457&radius=${5 + (i % 10)}`,
          data: null,
          userId: userId
        });
      }
      
      // Shuffle requests to simulate realistic usage
      for (let i = mixedRequests.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mixedRequests[i], mixedRequests[j]] = [mixedRequests[j], mixedRequests[i]];
      }
      
      console.log(`📊 Executing ${mixedRequests.length} mixed endpoint requests...`);
      
      // Execute mixed load
      const results = await testEnv.executor.executeConcurrent(mixedRequests, {
        maxConcurrency: 30,
        rampUpMs: 3000,
        delayBetweenRequests: 50
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 25000);
      
      // Analyze by endpoint type
      const resultsByType = {
        booking: { total: 0, successful: 0, rateLimited: 0 },
        availability: { total: 0, successful: 0, rateLimited: 0 },
        search: { total: 0, successful: 0, rateLimited: 0 }
      };
      
      results.forEach(result => {
        const type = result.requestConfig?.type;
        if (type && resultsByType[type]) {
          resultsByType[type].total++;
          
          if (result.success && result.response.status < 400) {
            resultsByType[type].successful++;
          } else if (result.response && result.response.status === 429) {
            resultsByType[type].rateLimited++;
          }
        }
      });
      
      console.log(`📈 Endpoint-Specific Rate Limiting Results:`);
      Object.entries(resultsByType).forEach(([type, stats]) => {
        const successRate = (stats.successful / stats.total * 100).toFixed(2);
        const rateLimitRate = (stats.rateLimited / stats.total * 100).toFixed(2);
        console.log(`  ${type}: ${stats.successful}/${stats.total} successful (${successRate}%), ${stats.rateLimited} rate limited (${rateLimitRate}%)`);
      });
      
      // Validate endpoint-specific rate limiting
      expect(resultsByType.booking.total).toBeGreaterThan(0);
      expect(resultsByType.availability.total).toBeGreaterThan(0);
      expect(resultsByType.search.total).toBeGreaterThan(0);
      
      // Booking endpoint should be most restrictive
      expect(resultsByType.booking.rateLimited).toBeGreaterThan(0);
      
      // Search endpoint should be least restrictive
      expect(resultsByType.search.successful / resultsByType.search.total)
        .toBeGreaterThan(resultsByType.booking.successful / resultsByType.booking.total);
      
    }, 40000);

    test('should handle rate limit bypass attempts', async () => {
      const attackAttempts = 50;
      
      console.log(`🔒 Testing rate limit bypass resistance with ${attackAttempts} rapid requests`);
      
      // Create attacker scenario
      const customer = CustomerFactory.create();
      const provider = ProviderFactory.create();
      
      // Authenticate attacker
      const { userId } = await testEnv.client.authenticate('customer', customer);
      
      // Attempt to bypass rate limits with various techniques
      const bypassAttempts = [];
      
      for (let i = 0; i < attackAttempts; i++) {
        const attemptType = i % 4;
        let headers = {};
        
        // Different bypass techniques
        switch (attemptType) {
          case 0:
            // Normal request
            break;
          case 1:
            // Try different User-Agent
            headers['User-Agent'] = `TestBot-${i}`;
            break;
          case 2:
            // Try X-Forwarded-For spoofing
            headers['X-Forwarded-For'] = `192.168.1.${i % 255}`;
            break;
          case 3:
            // Try X-Real-IP spoofing
            headers['X-Real-IP'] = `10.0.0.${i % 255}`;
            break;
        }
        
        bypassAttempts.push({
          method: 'GET',
          path: `/api/providers/${provider.id}`,
          data: null,
          userId: userId,
          options: {
            headers,
            timeout: 3000
          },
          metadata: { attemptType, attempt: i }
        });
      }
      
      console.log(`📊 Executing ${attackAttempts} rate limit bypass attempts...`);
      
      // Execute all attempts rapidly
      const results = await testEnv.executor.executeConcurrent(bypassAttempts, {
        maxConcurrency: attackAttempts,
        rampUpMs: 100, // Very fast
        delayBetweenRequests: 10 // Minimal delay
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 15000);
      
      // Analyze bypass resistance
      const successful = results.filter(r => r.success && r.response.status < 400);
      const rateLimited = results.filter(r => r.response && r.response.status === 429);
      const bypassSuccessful = successful.filter(r => r.metadata.attempt > 50); // Later attempts
      
      console.log(`📈 Rate Limit Bypass Resistance Results:
        Total Attempts: ${results.length}
        Successful: ${successful.length}
        Rate Limited: ${rateLimited.length}
        Late Bypass Attempts Successful: ${bypassSuccessful.length}
        Defense Effectiveness: ${(rateLimited.length / results.length * 100).toFixed(2)}%
      `);
      
      // Validate bypass resistance
      expect(results.length).toBe(attackAttempts);
      expect(rateLimited.length).toBeGreaterThan(attackAttempts * 0.6); // At least 60% blocked
      expect(bypassSuccessful.length).toBeLessThan(5); // Very few late bypasses
      
      // Rate limiting should be consistent regardless of headers
      const attemptsByType = new Map();
      results.forEach(result => {
        const type = result.metadata.attemptType;
        if (!attemptsByType.has(type)) {
          attemptsByType.set(type, { total: 0, rateLimited: 0 });
        }
        
        const stats = attemptsByType.get(type);
        stats.total++;
        if (result.response && result.response.status === 429) {
          stats.rateLimited++;
        }
      });
      
      // All attempt types should face similar rate limiting
      attemptsByType.forEach((stats, type) => {
        const rateLimitRate = stats.rateLimited / stats.total;
        console.log(`Attempt type ${type}: ${(rateLimitRate * 100).toFixed(2)}% rate limited`);
        expect(rateLimitRate).toBeGreaterThan(0.5); // At least 50% rate limited per type
      });
      
    }, 25000);
  });

  describe('Rate Limiting Error Handling', () => {
    test('should provide informative rate limit error responses', async () => {
      const burstSize = 15;
      
      console.log(`📋 Testing rate limit error response quality`);
      
      // Create test scenario
      const customer = CustomerFactory.create();
      const provider = ProviderFactory.create();
      const service = ServiceFactory.create(provider.id);
      
      // Authenticate customer
      const { userId } = await testEnv.client.authenticate('customer', customer);
      
      // Send burst of requests to trigger rate limiting
      const requests = Array.from({ length: burstSize }, (_, i) => ({
        method: 'POST',
        path: '/api/bookings',
        data: {
          providerId: provider.id,
          serviceId: service.id,
          customerId: customer.id,
          date: new Date(Date.now() + 86400000 * (i + 1)).toISOString().split('T')[0],
          time: '10:00',
          duration: service.duration,
          totalAmount: service.basePrice,
          paymentMethod: 'cash'
        },
        userId: userId
      }));
      
      const results = await testEnv.executor.executeConcurrent(requests, {
        maxConcurrency: burstSize,
        rampUpMs: 100,
        delayBetweenRequests: 20
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 10000);
      
      // Find rate limited responses
      const rateLimitedResponses = results.filter(r => 
        r.response && r.response.status === 429
      );
      
      console.log(`📊 Found ${rateLimitedResponses.length} rate limited responses`);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Validate rate limit error response quality
      rateLimitedResponses.forEach(result => {
        const response = result.response;
        const body = response.body;
        
        // Check HTTP headers
        expect(response.headers['retry-after']).toBeDefined();
        expect(parseInt(response.headers['retry-after'])).toBeGreaterThan(0);
        
        // Check response body structure
        expect(body.success).toBe(false);
        expect(body.error).toBe('RATE_LIMIT_EXCEEDED');
        expect(body.message).toBeDefined();
        expect(body.messageAr).toBeDefined(); // Arabic message
        
        // Check rate limit details
        expect(body.rateLimit).toBeDefined();
        expect(body.rateLimit.limit).toBeDefined();
        expect(body.rateLimit.windowMs).toBeDefined();
        expect(body.rateLimit.retryAfter).toBeDefined();
        
        // Verify message quality
        expect(body.message).toContain('rate limit');
        expect(body.messageAr).toMatch(/تجاوز|معدل|حد/); // Arabic rate limit terms
        
        console.log(`Rate limit error: ${body.message}`);
        console.log(`Arabic: ${body.messageAr}`);
        console.log(`Retry after: ${response.headers['retry-after']} seconds`);
      });
      
    }, 20000);
  });

  // Helper method for percentile calculation
  calculatePercentiles(values) {
    if (values.length === 0) return {};
    
    const sorted = values.sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
});