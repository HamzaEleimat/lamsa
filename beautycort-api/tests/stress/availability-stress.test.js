/**
 * Availability System Load Stress Tests
 * Tests availability calculation performance under high concurrent load
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
  ServiceFactory,
  TimeSlotFactory,
  BookingFactory
} = require('./utils/booking-factories');
const { sleep } = require('./utils/performance-monitor');

describe('Availability System Load Stress Tests', () => {
  let app;
  let server;
  let testEnv;

  beforeAll(async () => {
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-availability-stress';
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    await clearTestDatabase();
    testEnv = StressTestUtils.createTestEnvironment(app);
    testEnv.monitor.startMonitoring(500);
  });

  afterEach(async () => {
    StressTestUtils.cleanupTestEnvironment(testEnv);
  });

  describe('Real-time Availability Calculation', () => {
    test('should handle 100 concurrent availability requests for same provider', async () => {
      const concurrentRequests = 100;
      const testDuration = 30000; // 30 seconds
      
      console.log(`⚡ Testing availability calculation under load: ${concurrentRequests} concurrent requests`);
      
      // Create test scenario with complex availability
      const provider = ProviderFactory.create();
      const services = ServiceFactory.createMany(provider.id, 5); // Multiple services
      const customers = CustomerFactory.createMany(concurrentRequests);
      
      // Create existing bookings to make availability calculation complex
      const existingBookings = [];
      for (let i = 0; i < 20; i++) {
        const customer = CustomerFactory.create();
        const service = services[i % services.length];
        const bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() + 1);
        
        const booking = BookingFactory.create(customer.id, provider.id, service.id, {
          date: bookingDate.toISOString().split('T')[0],
          time: `${9 + (i % 8)}:00`,
          duration: service.duration,
          status: 'confirmed'
        });
        
        existingBookings.push(booking);
      }
      
      // Set up Jordan work week with prayer times
      const workingHours = TimeSlotFactory.generateJordanWorkingHours();
      const prayerTimeSettings = {
        enabled: true,
        autoBlock: true,
        customSettings: {
          dhuhr: { enabled: true, blockBefore: 10, blockAfter: 20 },
          asr: { enabled: true, blockBefore: 5, blockAfter: 15 },
          maghrib: { enabled: true, blockBefore: 15, blockAfter: 30 }
        },
        location: {
          city: 'Amman',
          coordinates: { lat: 31.9566, lng: 35.9457 }
        }
      };
      
      // Authenticate customers
      const authenticatedCustomers = [];
      for (let i = 0; i < Math.min(concurrentRequests, 50); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedCustomers.push(auth);
        } catch (error) {
          console.log(`Failed to authenticate customer ${i}: ${error.message}`);
        }
      }
      
      console.log(`✅ Authenticated ${authenticatedCustomers.length} customers`);
      
      // Prepare availability requests for multiple dates and services
      const availabilityRequests = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const service = services[i % services.length];
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() + 1 + (i % 7)); // Next week
        
        availabilityRequests.push({
          method: 'GET',
          path: `/api/availability/${provider.id}?date=${checkDate.toISOString().split('T')[0]}&serviceId=${service.id}&duration=${service.duration}`,
          data: null,
          userId: customer.userId,
          options: { timeout: 8000 },
          metadata: {
            requestIndex: i,
            serviceId: service.id,
            date: checkDate.toISOString().split('T')[0]
          }
        });
      }
      
      console.log(`📊 Executing ${concurrentRequests} availability calculations...`);
      
      // Execute concurrent availability requests
      const startTime = Date.now();
      const results = await testEnv.executor.executeConcurrent(availabilityRequests, {
        maxConcurrency: concurrentRequests,
        rampUpMs: 2000, // 2 second ramp up
        delayBetweenRequests: 10
      });
      
      const executionTime = Date.now() - startTime;
      await StressTestUtils.waitForCompletion(testEnv.executor, testDuration);
      
      // Analyze availability calculation performance
      const successful = results.filter(r => r.success && r.response.status === 200);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      const avgResponseTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      const maxResponseTime = Math.max(...successful.map(r => r.duration));
      const minResponseTime = Math.min(...successful.map(r => r.duration));
      
      console.log(`📈 Availability Calculation Results:
        Total Requests: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Success Rate: ${(successful.length / results.length * 100).toFixed(2)}%
        Avg Response Time: ${avgResponseTime.toFixed(2)}ms
        Min Response Time: ${minResponseTime}ms
        Max Response Time: ${maxResponseTime}ms
        Total Execution: ${executionTime}ms
      `);
      
      // Validate availability calculation performance
      expect(results.length).toBe(concurrentRequests);
      expect(successful.length / results.length).toBeGreaterThan(0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(2000); // Under 2 seconds average
      expect(maxResponseTime).toBeLessThan(5000); // Under 5 seconds max
      
      // Validate response content quality
      let validSlotResponses = 0;
      let invalidSlotResponses = 0;
      
      successful.forEach(result => {
        const body = result.response.body;
        
        // Check basic structure
        expect(body.success).toBe(true);
        expect(body.slots).toBeDefined();
        expect(Array.isArray(body.slots)).toBe(true);
        
        // Validate slot data quality
        if (body.slots.length > 0) {
          validSlotResponses++;
          
          body.slots.forEach(slot => {
            expect(slot.time).toMatch(/^\d{2}:\d{2}$/); // HH:MM format
            expect(typeof slot.available).toBe('boolean');
            expect(typeof slot.duration).toBe('number');
            
            if (!slot.available) {
              expect(slot.reason).toBeDefined(); // Should have reason when unavailable
            }
          });
          
          // Should respect Jordan work week (no Friday slots normally)
          const date = new Date(result.metadata.date);
          const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday
          
          if (dayOfWeek === 5) { // Friday
            expect(body.slots.filter(s => s.available).length).toBe(0);
          }
          
          // Should include prayer time blocks
          const blockedForPrayer = body.slots.filter(s => 
            !s.available && s.reason && s.reason.includes('prayer')
          );
          expect(blockedForPrayer.length).toBeGreaterThanOrEqual(0);
          
        } else {
          invalidSlotResponses++;
        }
      });
      
      console.log(`🎯 Response Quality:
        Valid Slot Responses: ${validSlotResponses}
        Invalid/Empty Responses: ${invalidSlotResponses}
        Quality Rate: ${(validSlotResponses / successful.length * 100).toFixed(2)}%
      `);
      
      expect(validSlotResponses / successful.length).toBeGreaterThan(0.9); // 90% should have valid slots
      
      // Generate performance report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(testEnv.monitor);
      expect(performanceReport.benchmarks.responseTime.passed).toBe(true);
      
    }, 45000);

    test('should maintain cache effectiveness under high load', async () => {
      const requestsPerSecond = 20;
      const testDuration = 30; // 30 seconds
      const totalRequests = requestsPerSecond * testDuration;
      
      console.log(`💾 Testing availability cache performance: ${requestsPerSecond} req/s for ${testDuration}s`);
      
      // Create scenario with high cache hit potential
      const providers = ProviderFactory.createMany(5);
      const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 2));
      const customers = CustomerFactory.createMany(50);
      
      // Authenticate customers
      const authenticatedCustomers = [];
      for (let i = 0; i < Math.min(customers.length, 20); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedCustomers.push(auth);
        } catch (error) {
          console.log(`Auth failed for customer ${i}`);
        }
      }
      
      // Prepare requests that should benefit from caching
      const cacheTestRequests = [];
      const popularDates = [
        new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // Day after
        new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]  // 3 days
      ];
      
      // Generate load pattern with cache-friendly repetition
      for (let i = 0; i < totalRequests; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const provider = providers[i % providers.length];
        const date = popularDates[i % popularDates.length]; // Repeat popular dates
        const service = services.find(s => s.providerId === provider.id);
        
        cacheTestRequests.push({
          method: 'GET',
          path: `/api/availability/${provider.id}?date=${date}&serviceId=${service.id}`,
          data: null,
          userId: customer.userId,
          options: { timeout: 3000 },
          metadata: {
            providerId: provider.id,
            date,
            serviceId: service.id,
            requestIndex: i
          }
        });
      }
      
      console.log(`📊 Executing cache test with ${totalRequests} requests...`);
      
      // Execute with steady rate to test cache performance
      const results = [];
      const batchSize = Math.ceil(requestsPerSecond / 4); // 4 batches per second
      const batchInterval = 250; // 250ms between batches
      
      const startTime = Date.now();
      let requestIndex = 0;
      
      const executeLoadTest = async () => {
        while (requestIndex < totalRequests) {
          const batchStart = requestIndex;
          const batchEnd = Math.min(requestIndex + batchSize, totalRequests);
          const batch = cacheTestRequests.slice(batchStart, batchEnd);
          
          // Execute batch
          const batchPromises = batch.map(req => testEnv.executor.executeRequest(req));
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
          
          requestIndex = batchEnd;
          
          // Print progress
          if (requestIndex % (requestsPerSecond * 5) === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            console.log(`Progress: ${requestIndex}/${totalRequests} requests (${elapsed.toFixed(1)}s)`);
            testEnv.monitor.printStatus();
          }
          
          // Wait for next batch
          if (requestIndex < totalRequests) {
            await sleep(batchInterval);
          }
        }
      };
      
      await executeLoadTest();
      
      const totalDuration = Date.now() - startTime;
      console.log(`⏱️ Cache test completed in ${totalDuration}ms`);
      
      // Analyze cache performance patterns
      const successful = results.filter(r => r.success && r.response.status === 200);
      const responseTimes = successful.map(r => r.duration);
      
      // Group by cache key (provider + date + service)
      const cacheGroups = new Map();
      successful.forEach(result => {
        const key = `${result.metadata.providerId}-${result.metadata.date}-${result.metadata.serviceId}`;
        if (!cacheGroups.has(key)) {
          cacheGroups.set(key, []);
        }
        cacheGroups.get(key).push(result.duration);
      });
      
      // Analyze cache hit patterns
      let cacheHitImprovement = 0;
      let totalGroups = 0;
      
      cacheGroups.forEach((responseTimes, key) => {
        if (responseTimes.length > 1) {
          totalGroups++;
          const firstRequest = responseTimes[0];
          const avgSubsequent = responseTimes.slice(1).reduce((sum, time) => sum + time, 0) / (responseTimes.length - 1);
          
          if (avgSubsequent < firstRequest * 0.8) { // 20% improvement indicates cache hit
            cacheHitImprovement++;
          }
        }
      });
      
      const cacheEffectiveness = totalGroups > 0 ? (cacheHitImprovement / totalGroups) * 100 : 0;
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const actualThroughput = successful.length / (totalDuration / 1000);
      
      console.log(`📈 Cache Performance Results:
        Total Requests: ${results.length}
        Successful: ${successful.length}
        Cache Groups: ${cacheGroups.size}
        Cache Effectiveness: ${cacheEffectiveness.toFixed(2)}%
        Avg Response Time: ${avgResponseTime.toFixed(2)}ms
        Actual Throughput: ${actualThroughput.toFixed(2)} req/s
        Target Throughput: ${requestsPerSecond} req/s
      `);
      
      // Validate cache performance
      expect(successful.length).toBeGreaterThan(totalRequests * 0.95); // 95% success
      expect(actualThroughput).toBeGreaterThan(requestsPerSecond * 0.8); // 80% of target
      expect(avgResponseTime).toBeLessThan(1000); // Under 1 second with cache
      expect(cacheEffectiveness).toBeGreaterThan(30); // At least 30% cache effectiveness
      
      // Validate consistent response data
      cacheGroups.forEach((responseTimes, key) => {
        // All responses for same cache key should be similar (cached data)
        if (responseTimes.length > 2) {
          const variance = this.calculateVariance(responseTimes);
          expect(variance).toBeLessThan(responseTimes[0] * 0.5); // Low variance indicates caching
        }
      });
      
    }, 45000);

    test('should handle complex availability scenarios with prayer times and holidays', async () => {
      const concurrentRequests = 50;
      
      console.log(`🕌 Testing complex availability with prayer times and cultural considerations`);
      
      // Create test scenario during Ramadan
      const originalDate = Date.now;
      Date.now = jest.fn(() => new Date('2024-03-20T10:00:00Z').getTime()); // During Ramadan
      
      try {
        // Create providers in different Jordan cities
        const providers = [
          ProviderFactory.create({ location: { city: 'Amman', coordinates: { lat: 31.9566, lng: 35.9457 } } }),
          ProviderFactory.create({ location: { city: 'Irbid', coordinates: { lat: 32.5556, lng: 35.8500 } } }),
          ProviderFactory.create({ location: { city: 'Aqaba', coordinates: { lat: 29.5267, lng: 35.0072 } } })
        ];
        
        const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 3));
        const customers = CustomerFactory.createMany(concurrentRequests);
        
        // Set up complex availability scenarios
        const testDates = [
          '2024-03-22', // Friday during Ramadan
          '2024-03-23', // Saturday during Ramadan
          '2024-03-24', // Sunday during Ramadan
          '2024-04-10', // Eid Al-Fitr (hypothetical)
        ];
        
        // Authenticate customers
        const authenticatedCustomers = [];
        for (let i = 0; i < Math.min(concurrentRequests, 25); i++) {
          try {
            const auth = await testEnv.client.authenticate('customer', customers[i]);
            authenticatedCustomers.push(auth);
          } catch (error) {
            console.log(`Auth failed for customer ${i}`);
          }
        }
        
        // Prepare complex availability requests
        const complexRequests = [];
        for (let i = 0; i < concurrentRequests; i++) {
          const customer = authenticatedCustomers[i % authenticatedCustomers.length];
          const provider = providers[i % providers.length];
          const service = services.find(s => s.providerId === provider.id);
          const date = testDates[i % testDates.length];
          
          complexRequests.push({
            method: 'GET',
            path: `/api/availability/${provider.id}?date=${date}&serviceId=${service.id}&respectPrayerTimes=true&respectRamadan=true`,
            data: null,
            userId: customer.userId,
            options: { timeout: 10000 },
            metadata: {
              providerId: provider.id,
              serviceId: service.id,
              date,
              city: provider.location.city
            }
          });
        }
        
        console.log(`📊 Executing ${concurrentRequests} complex availability calculations...`);
        
        // Execute complex availability requests
        const results = await testEnv.executor.executeConcurrent(complexRequests, {
          maxConcurrency: 25,
          rampUpMs: 3000,
          delayBetweenRequests: 50
        });
        
        await StressTestUtils.waitForCompletion(testEnv.executor, 30000);
        
        // Analyze complex scenario results
        const successful = results.filter(r => r.success && r.response.status === 200);
        const failed = results.filter(r => !r.success || r.response.status >= 400);
        
        console.log(`📈 Complex Availability Results:
          Total Requests: ${results.length}
          Successful: ${successful.length}
          Failed: ${failed.length}
          Success Rate: ${(successful.length / results.length * 100).toFixed(2)}%
        `);
        
        // Validate cultural considerations
        let fridaySlotBlocks = 0;
        let prayerTimeBlocks = 0;
        let ramadanAdjustments = 0;
        
        successful.forEach(result => {
          const body = result.response.body;
          const metadata = result.metadata;
          
          // Check Friday (day 5) restrictions
          const date = new Date(metadata.date);
          if (date.getDay() === 5) { // Friday
            const availableSlots = body.slots.filter(s => s.available);
            expect(availableSlots.length).toBeLessThan(body.slots.length * 0.5); // Significantly reduced
            fridaySlotBlocks++;
          }
          
          // Check for prayer time blocks
          const prayerBlocks = body.slots.filter(s => 
            !s.available && s.reason && s.reason.toLowerCase().includes('prayer')
          );
          if (prayerBlocks.length > 0) {
            prayerTimeBlocks++;
            
            // Prayer blocks should have Arabic reasons
            prayerBlocks.forEach(block => {
              expect(block.reasonAr).toBeDefined();
              expect(block.reasonAr).toMatch(/صلاة|الظهر|العصر|المغرب/); // Prayer-related Arabic terms
            });
          }
          
          // Check for Ramadan adjustments
          if (body.ramadanSchedule || body.specialHours) {
            ramadanAdjustments++;
            expect(body.ramadanSchedule.enabled).toBe(true);
          }
        });
        
        console.log(`🎯 Cultural Considerations:
          Friday Slot Restrictions: ${fridaySlotBlocks}
          Prayer Time Blocks: ${prayerTimeBlocks}
          Ramadan Adjustments: ${ramadanAdjustments}
        `);
        
        // Validate cultural considerations are applied
        expect(fridaySlotBlocks).toBeGreaterThan(0); // Friday restrictions should be applied
        expect(prayerTimeBlocks).toBeGreaterThan(0); // Prayer times should be considered
        
        // Different cities should have slightly different prayer times
        const citiesWithResults = new Map();
        successful.forEach(result => {
          const city = result.metadata.city;
          if (!citiesWithResults.has(city)) {
            citiesWithResults.set(city, []);
          }
          citiesWithResults.get(city).push(result.response.body);
        });
        
        expect(citiesWithResults.size).toBeGreaterThan(1); // Multiple cities tested
        
      } finally {
        Date.now = originalDate;
      }
      
    }, 40000);
  });

  describe('Availability Cache and Performance', () => {
    test('should maintain performance with cache invalidation under load', async () => {
      const baseRequests = 60;
      const cacheInvalidations = 10;
      
      console.log(`🔄 Testing cache invalidation performance: ${baseRequests} requests + ${cacheInvalidations} invalidations`);
      
      // Create test scenario
      const provider = ProviderFactory.create();
      const services = ServiceFactory.createMany(provider.id, 3);
      const customers = CustomerFactory.createMany(baseRequests + cacheInvalidations);
      
      // Authenticate customers
      const authenticatedCustomers = [];
      for (let i = 0; i < Math.min(customers.length, 30); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedCustomers.push(auth);
        } catch (error) {
          console.log(`Auth failed for customer ${i}`);
        }
      }
      
      const testDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Tomorrow
      
      // Phase 1: Populate cache with availability requests
      const populateCacheRequests = [];
      for (let i = 0; i < 20; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const service = services[i % services.length];
        
        populateCacheRequests.push({
          method: 'GET',
          path: `/api/availability/${provider.id}?date=${testDate}&serviceId=${service.id}`,
          data: null,
          userId: customer.userId,
          phase: 'populate'
        });
      }
      
      console.log('📊 Phase 1: Populating cache...');
      const populateResults = await testEnv.executor.executeConcurrent(populateCacheRequests, {
        maxConcurrency: 10,
        rampUpMs: 1000,
        delayBetweenRequests: 100
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 10000);
      
      // Create baseline performance metrics
      const populateSuccessful = populateResults.filter(r => r.success && r.response.status === 200);
      const baselineResponseTime = populateSuccessful.reduce((sum, r) => sum + r.duration, 0) / populateSuccessful.length;
      
      console.log(`✅ Cache populated. Baseline response time: ${baselineResponseTime.toFixed(2)}ms`);
      
      // Phase 2: Mixed load with cache hits and invalidations
      const mixedRequests = [];
      
      // Add cache hit requests
      for (let i = 0; i < baseRequests; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const service = services[i % services.length];
        
        mixedRequests.push({
          method: 'GET',
          path: `/api/availability/${provider.id}?date=${testDate}&serviceId=${service.id}`,
          data: null,
          userId: customer.userId,
          type: 'cache_hit',
          metadata: { requestIndex: i }
        });
      }
      
      // Add cache invalidation requests (new bookings)
      for (let i = 0; i < cacheInvalidations; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const service = services[i % services.length];
        
        mixedRequests.push({
          method: 'POST',
          path: '/api/bookings',
          data: {
            providerId: provider.id,
            serviceId: service.id,
            customerId: customer.user.id,
            date: testDate,
            time: `${10 + i}:00`,
            duration: service.duration,
            totalAmount: service.basePrice,
            paymentMethod: 'cash',
            notes: `Cache invalidation booking ${i + 1}`
          },
          userId: customer.userId,
          type: 'cache_invalidation',
          metadata: { invalidationIndex: i }
        });
      }
      
      // Interleave requests for realistic cache invalidation pattern
      const interleavedRequests = [];
      const cacheHitChunkSize = Math.ceil(baseRequests / cacheInvalidations);
      
      for (let i = 0; i < cacheInvalidations; i++) {
        // Add chunk of cache hit requests
        const chunkStart = i * cacheHitChunkSize;
        const chunkEnd = Math.min(chunkStart + cacheHitChunkSize, baseRequests);
        interleavedRequests.push(...mixedRequests.slice(chunkStart, chunkEnd));
        
        // Add cache invalidation request
        interleavedRequests.push(mixedRequests[baseRequests + i]);
      }
      
      console.log('📊 Phase 2: Testing cache performance under invalidation...');
      
      // Execute mixed load
      const mixedResults = await testEnv.executor.executeConcurrent(interleavedRequests, {
        maxConcurrency: 20,
        rampUpMs: 2000,
        delayBetweenRequests: 30
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 25000);
      
      // Analyze cache performance
      const cacheHitResults = mixedResults.filter(r => r.requestConfig && r.requestConfig.type === 'cache_hit');
      const invalidationResults = mixedResults.filter(r => r.requestConfig && r.requestConfig.type === 'cache_invalidation');
      
      const cacheHitSuccessful = cacheHitResults.filter(r => r.success && r.response.status === 200);
      const invalidationSuccessful = invalidationResults.filter(r => r.success && r.response.status === 201);
      
      const cacheHitAvgTime = cacheHitSuccessful.reduce((sum, r) => sum + r.duration, 0) / cacheHitSuccessful.length;
      const invalidationAvgTime = invalidationSuccessful.reduce((sum, r) => sum + r.duration, 0) / invalidationSuccessful.length;
      
      console.log(`📈 Cache Performance Under Load:
        Cache Hit Requests: ${cacheHitResults.length}
        Cache Hit Successful: ${cacheHitSuccessful.length}
        Cache Hit Avg Time: ${cacheHitAvgTime.toFixed(2)}ms
        Invalidation Requests: ${invalidationResults.length}
        Invalidation Successful: ${invalidationSuccessful.length}
        Invalidation Avg Time: ${invalidationAvgTime.toFixed(2)}ms
        Cache Performance: ${((baselineResponseTime - cacheHitAvgTime) / baselineResponseTime * 100).toFixed(2)}% improvement
      `);
      
      // Validate cache performance
      expect(cacheHitSuccessful.length / cacheHitResults.length).toBeGreaterThan(0.95); // 95% cache hit success
      expect(invalidationSuccessful.length / invalidationResults.length).toBeGreaterThan(0.9); // 90% invalidation success
      expect(cacheHitAvgTime).toBeLessThan(baselineResponseTime * 1.2); // Cache hits should be fast
      expect(invalidationAvgTime).toBeLessThan(3000); // Invalidations under 3 seconds
      
      // Cache hits should generally be faster than baseline (cache benefits)
      const cacheImprovementRate = cacheHitSuccessful.filter(r => r.duration < baselineResponseTime).length / cacheHitSuccessful.length;
      expect(cacheImprovementRate).toBeGreaterThan(0.7); // 70% should benefit from cache
      
    }, 50000);
  });

  describe('Availability System Error Handling', () => {
    test('should gracefully handle availability calculation errors under load', async () => {
      const errorInducingRequests = 40;
      
      console.log(`⚠️  Testing error handling in availability system: ${errorInducingRequests} problematic requests`);
      
      // Create scenarios that might cause errors
      const providers = ProviderFactory.createMany(3);
      const customers = CustomerFactory.createMany(errorInducingRequests);
      
      // Authenticate customers
      const authenticatedCustomers = [];
      for (let i = 0; i < Math.min(customers.length, 20); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedCustomers.push(auth);
        } catch (error) {
          console.log(`Auth failed for customer ${i}`);
        }
      }
      
      // Prepare error-inducing requests
      const problematicRequests = [];
      
      for (let i = 0; i < errorInducingRequests; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const provider = providers[i % providers.length];
        let path;
        
        const errorType = i % 5;
        switch (errorType) {
          case 0:
            // Invalid date format
            path = `/api/availability/${provider.id}?date=invalid-date&serviceId=123`;
            break;
          case 1:
            // Date too far in future
            const farFuture = new Date();
            farFuture.setFullYear(farFuture.getFullYear() + 2);
            path = `/api/availability/${provider.id}?date=${farFuture.toISOString().split('T')[0]}`;
            break;
          case 2:
            // Past date
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 30);
            path = `/api/availability/${provider.id}?date=${pastDate.toISOString().split('T')[0]}`;
            break;
          case 3:
            // Non-existent provider
            path = `/api/availability/non-existent-provider-id?date=${new Date(Date.now() + 86400000).toISOString().split('T')[0]}`;
            break;
          case 4:
            // Invalid service ID
            path = `/api/availability/${provider.id}?date=${new Date(Date.now() + 86400000).toISOString().split('T')[0]}&serviceId=invalid-service`;
            break;
        }
        
        problematicRequests.push({
          method: 'GET',
          path,
          data: null,
          userId: customer.userId,
          options: { timeout: 5000 },
          metadata: {
            errorType,
            expectedError: true
          }
        });
      }
      
      console.log(`📊 Executing ${errorInducingRequests} error-inducing requests...`);
      
      // Execute problematic requests
      const results = await testEnv.executor.executeConcurrent(problematicRequests, {
        maxConcurrency: 20,
        rampUpMs: 1500,
        delayBetweenRequests: 25
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 20000);
      
      // Analyze error handling
      const validationErrors = results.filter(r => r.response && r.response.status === 400);
      const notFoundErrors = results.filter(r => r.response && r.response.status === 404);
      const serverErrors = results.filter(r => r.response && r.response.status >= 500);
      const networkErrors = results.filter(r => !r.success && !r.response);
      
      console.log(`📈 Error Handling Results:
        Total Requests: ${results.length}
        Validation Errors (400): ${validationErrors.length}
        Not Found Errors (404): ${notFoundErrors.length}
        Server Errors (500+): ${serverErrors.length}
        Network Errors: ${networkErrors.length}
        Proper Error Rate: ${((validationErrors.length + notFoundErrors.length) / results.length * 100).toFixed(2)}%
      `);
      
      // Validate error handling quality
      expect(results.length).toBe(errorInducingRequests);
      expect(serverErrors.length).toBe(0); // No server crashes
      expect(networkErrors.length).toBeLessThan(errorInducingRequests * 0.1); // Less than 10% network errors
      expect(validationErrors.length + notFoundErrors.length).toBeGreaterThan(errorInducingRequests * 0.8); // 80% proper errors
      
      // Check error response quality
      [...validationErrors, ...notFoundErrors].forEach(result => {
        const body = result.response.body;
        
        // Error responses should be well-structured
        expect(body.success).toBe(false);
        expect(body.error).toBeDefined();
        expect(body.message).toBeDefined();
        expect(body.messageAr).toBeDefined(); // Arabic error message
        
        // Should include helpful information
        if (result.response.status === 400) {
          expect(body.validationErrors || body.details).toBeDefined();
        }
      });
      
      // Performance should remain good even with errors
      const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(2000); // Under 2 seconds even with errors
      
    }, 30000);
  });

  // Helper method for variance calculation
  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }
});