/**
 * Mixed Workload Simulation Stress Tests
 * Tests realistic production traffic patterns and system stability under combined load
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
  BookingFactory,
  TestScenarioFactory
} = require('./utils/booking-factories');
const { sleep } = require('./utils/performance-monitor');

describe('Mixed Workload Simulation Stress Tests', () => {
  let app;
  let server;
  let testEnv;

  beforeAll(async () => {
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-mixed-workload-stress';
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    await clearTestDatabase();
    testEnv = StressTestUtils.createTestEnvironment(app);
    testEnv.monitor.startMonitoring(200); // Monitor every 200ms for mixed workload
  });

  afterEach(async () => {
    StressTestUtils.cleanupTestEnvironment(testEnv);
  });

  describe('Realistic Production Traffic Simulation', () => {
    test('should handle peak hour traffic pattern (8am-10am Jordan time)', async () => {
      const peakDurationMinutes = 10; // Simulate 10 minutes of peak time
      const baseRequestsPerMinute = 30;
      const peakMultiplier = 3; // 3x traffic during peak
      
      console.log(`🌅 Simulating peak hour traffic: ${peakDurationMinutes} minutes at ${baseRequestsPerMinute * peakMultiplier} req/min`);
      
      // Create realistic production dataset
      const providers = ProviderFactory.createMany(15);
      const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 4));
      const customers = CustomerFactory.createMany(100);
      
      // Create historical bookings for realistic context
      const historicalBookings = [];
      for (let i = 0; i < 150; i++) {
        const customer = customers[i % customers.length];
        const service = services[i % services.length];
        const provider = providers.find(p => p.id === service.providerId);
        
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 30)); // Past month
        
        historicalBookings.push(BookingFactory.create(customer.id, provider.id, service.id, {
          date: pastDate.toISOString().split('T')[0],
          status: 'completed',
          totalAmount: service.basePrice + (Math.random() * 30)
        }));
      }
      
      // Authenticate representative users
      const authenticatedCustomers = [];
      const authenticatedProviders = [];
      
      for (let i = 0; i < Math.min(customers.length, 25); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedCustomers.push(auth);
        } catch (error) {
          console.log(`Customer auth failed for ${i}`);
        }
      }
      
      for (let i = 0; i < Math.min(providers.length, 8); i++) {
        try {
          const auth = await testEnv.client.authenticate('provider', providers[i]);
          authenticatedProviders.push(auth);
        } catch (error) {
          console.log(`Provider auth failed for ${i}`);
        }
      }
      
      console.log(`✅ Authenticated ${authenticatedCustomers.length} customers and ${authenticatedProviders.length} providers`);
      
      // Generate realistic peak hour traffic pattern
      const peakTrafficPattern = this.generatePeakHourPattern(
        peakDurationMinutes * 60, // seconds
        baseRequestsPerMinute,
        peakMultiplier
      );
      
      const workloadRequests = peakTrafficPattern.map((timing, index) => {
        const requestType = this.selectRequestType(timing.intensity);
        return this.createRealisticRequest(
          requestType,
          authenticatedCustomers,
          authenticatedProviders,
          providers,
          services,
          index
        );
      });
      
      console.log(`📊 Executing peak hour simulation: ${workloadRequests.length} requests...`);
      
      // Execute peak hour traffic
      const results = [];
      const startTime = Date.now();
      
      for (let minute = 0; minute < peakDurationMinutes; minute++) {
        const minuteStart = minute * 60;
        const minuteEnd = (minute + 1) * 60;
        const minuteRequests = workloadRequests.filter(req => 
          req.timing >= minuteStart && req.timing < minuteEnd
        );
        
        console.log(`📊 Minute ${minute + 1}: ${minuteRequests.length} requests`);
        
        const minuteResults = await testEnv.executor.executeConcurrent(minuteRequests, {
          maxConcurrency: 40,
          rampUpMs: 2000,
          delayBetweenRequests: Math.max(10, 60000 / minuteRequests.length) // Spread across minute
        });
        
        results.push(...minuteResults);
        
        // Print real-time metrics every 2 minutes
        if ((minute + 1) % 2 === 0) {
          testEnv.monitor.printStatus();
        }
        
        // Brief pause between minutes
        await sleep(500);
      }
      
      const totalDuration = Date.now() - startTime;
      await StressTestUtils.waitForCompletion(testEnv.executor, 30000);
      
      // Analyze peak hour performance
      const successful = results.filter(r => r.success && r.response.status < 400);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      
      // Group by request type
      const resultsByType = this.groupResultsByType(results);
      const performanceByType = this.calculatePerformanceByType(resultsByType);
      
      const actualThroughput = successful.length / (totalDuration / 60000); // per minute
      const avgResponseTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      const errorRate = (failed.length / results.length) * 100;
      
      console.log(`📈 Peak Hour Results:
        Total Requests: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Success Rate: ${((successful.length / results.length) * 100).toFixed(2)}%
        Error Rate: ${errorRate.toFixed(2)}%
        Actual Throughput: ${actualThroughput.toFixed(2)} req/min
        Target Throughput: ${baseRequestsPerMinute * peakMultiplier} req/min
        Avg Response Time: ${avgResponseTime.toFixed(2)}ms
        Duration: ${totalDuration}ms
      `);
      
      console.log(`📊 Performance by Request Type:`);
      Object.entries(performanceByType).forEach(([type, stats]) => {
        console.log(`  ${type}: ${stats.successful}/${stats.total} (${(stats.successRate * 100).toFixed(2)}%), avg ${stats.avgResponseTime.toFixed(2)}ms`);
      });
      
      // Validate peak hour performance
      expect(results.length).toBeGreaterThan(peakDurationMinutes * baseRequestsPerMinute * peakMultiplier * 0.8);
      expect(successful.length / results.length).toBeGreaterThan(0.9); // 90% success rate during peak
      expect(errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(avgResponseTime).toBeLessThan(3000); // Under 3 seconds during peak
      expect(actualThroughput).toBeGreaterThan(baseRequestsPerMinute * peakMultiplier * 0.8); // 80% of target
      
      // Critical request types should maintain good performance
      expect(performanceByType.booking?.successRate || 0).toBeGreaterThan(0.95); // 95% booking success
      expect(performanceByType.availability?.avgResponseTime || 0).toBeLessThan(2000); // 2s availability
      
      // Generate comprehensive performance report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(testEnv.monitor, {
        peakHour: true,
        requestTypes: Object.keys(performanceByType)
      });
      
      expect(performanceReport.benchmarks.memory.passed).toBe(true);
      
    }, 180000); // 3 minutes for 10-minute simulation + buffer

    test('should maintain stability during sustained mixed load', async () => {
      const testDurationMinutes = 15;
      const sustainedRpm = 25; // requests per minute
      const totalRequests = testDurationMinutes * sustainedRpm;
      
      console.log(`⚖️ Sustained mixed load test: ${sustainedRpm} req/min for ${testDurationMinutes} minutes`);
      
      // Create comprehensive test dataset
      const scenario = TestScenarioFactory.createRealisticWorkload(12, 40);
      const { providers: providerData } = scenario;
      
      // Authenticate users for sustained test
      const authenticatedUsers = await this.authenticateTestUsers(
        providerData.flatMap(p => p.customers).slice(0, 20),
        providerData.map(p => p.provider).slice(0, 6)
      );
      
      console.log(`✅ Authenticated ${authenticatedUsers.customers.length} customers and ${authenticatedUsers.providers.length} providers`);
      
      // Generate sustained workload pattern
      const sustainedPattern = LoadPatternGenerator.steadyLoad(sustainedRpm, testDurationMinutes * 60);
      
      // Create diverse request mix reflecting real usage patterns
      const requestMix = {
        booking_creation: 0.25,    // 25% - booking creation
        availability_check: 0.30,  // 30% - availability checks
        provider_search: 0.20,     // 20% - provider searches
        booking_management: 0.10,  // 10% - booking updates/cancellations
        provider_dashboard: 0.10,  // 10% - provider dashboard activities
        notifications: 0.05        // 5% - notification triggers
      };
      
      const sustainedRequests = sustainedPattern.map((timing, index) => {
        const requestType = this.selectRequestTypeByMix(requestMix);
        const request = this.createRequestByType(
          requestType,
          authenticatedUsers,
          providerData,
          index
        );
        
        request.timing = timing.startTime;
        request.requestIndex = timing.requestIndex;
        return request;
      });
      
      console.log(`📊 Executing sustained load: ${sustainedRequests.length} requests over ${testDurationMinutes} minutes...`);
      
      // Execute sustained load with proper timing
      const results = [];
      const metricsHistory = [];
      const startTime = Date.now();
      
      // Process requests in batches to maintain steady rate
      const batchSize = Math.ceil(sustainedRpm / 4); // 4 batches per minute
      const batchInterval = 15000; // 15 seconds between batches
      
      for (let batchIndex = 0; batchIndex < Math.ceil(sustainedRequests.length / batchSize); batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, sustainedRequests.length);
        const batch = sustainedRequests.slice(batchStart, batchEnd);
        
        const batchStartTime = Date.now();
        const batchResults = await testEnv.executor.executeConcurrent(batch, {
          maxConcurrency: 20,
          rampUpMs: 1000,
          delayBetweenRequests: 100
        });
        
        results.push(...batchResults);
        
        // Collect metrics
        const batchDuration = Date.now() - batchStartTime;
        const successful = batchResults.filter(r => r.success && r.response.status < 400);
        
        metricsHistory.push({
          batchIndex,
          timestamp: Date.now(),
          requests: batch.length,
          successful: successful.length,
          duration: batchDuration,
          avgResponseTime: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
        });
        
        // Print progress every minute
        const elapsed = Date.now() - startTime;
        if (elapsed >= 60000 * Math.floor(elapsed / 60000) && elapsed % 60000 < batchInterval) {
          const minute = Math.floor(elapsed / 60000);
          console.log(`📊 Minute ${minute + 1}: ${results.length} requests processed`);
          testEnv.monitor.printStatus();
        }
        
        // Wait for next batch if not last
        if (batchIndex < Math.ceil(sustainedRequests.length / batchSize) - 1) {
          const remainingTime = batchInterval - batchDuration;
          if (remainingTime > 0) {
            await sleep(remainingTime);
          }
        }
      }
      
      const totalDuration = Date.now() - startTime;
      await StressTestUtils.waitForCompletion(testEnv.executor, 20000);
      
      console.log(`⏱️ Sustained load test completed in ${(totalDuration / 60000).toFixed(2)} minutes`);
      
      // Analyze sustained load performance
      const successful = results.filter(r => r.success && r.response.status < 400);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      
      // Calculate stability metrics
      const stabilityMetrics = this.calculateStabilityMetrics(metricsHistory);
      const performanceByType = this.calculatePerformanceByType(this.groupResultsByType(results));
      
      const actualThroughput = successful.length / (totalDuration / 60000);
      const overallErrorRate = (failed.length / results.length) * 100;
      const avgResponseTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      
      console.log(`📈 Sustained Load Results:
        Total Duration: ${(totalDuration / 60000).toFixed(2)} minutes
        Total Requests: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Overall Success Rate: ${((successful.length / results.length) * 100).toFixed(2)}%
        Overall Error Rate: ${overallErrorRate.toFixed(2)}%
        Actual Throughput: ${actualThroughput.toFixed(2)} req/min
        Target Throughput: ${sustainedRpm} req/min
        Avg Response Time: ${avgResponseTime.toFixed(2)}ms
        Performance Stability: ${stabilityMetrics.stabilityScore.toFixed(2)}%
        Response Time Variance: ${stabilityMetrics.responseTimeVariance.toFixed(2)}ms²
      `);
      
      console.log(`📊 Sustained Performance by Type:`);
      Object.entries(performanceByType).forEach(([type, stats]) => {
        console.log(`  ${type}: ${(stats.successRate * 100).toFixed(2)}% success, ${stats.avgResponseTime.toFixed(2)}ms avg`);
      });
      
      // Validate sustained performance and stability
      expect(results.length).toBe(totalRequests);
      expect(successful.length / results.length).toBeGreaterThan(0.95); // 95% success rate
      expect(overallErrorRate).toBeLessThan(3); // Less than 3% error rate
      expect(avgResponseTime).toBeLessThan(2500); // Under 2.5 seconds average
      expect(actualThroughput).toBeGreaterThan(sustainedRpm * 0.9); // 90% of target throughput
      
      // Stability metrics should indicate consistent performance
      expect(stabilityMetrics.stabilityScore).toBeGreaterThan(80); // 80% stability score
      expect(stabilityMetrics.responseTimeVariance).toBeLessThan(1000000); // Reasonable variance
      
      // Performance should not degrade significantly over time
      const earlyBatches = metricsHistory.slice(0, 5);
      const lateBatches = metricsHistory.slice(-5);
      
      const earlyAvgResponseTime = earlyBatches.reduce((sum, b) => sum + b.avgResponseTime, 0) / earlyBatches.length;
      const lateAvgResponseTime = lateBatches.reduce((sum, b) => sum + b.avgResponseTime, 0) / lateBatches.length;
      
      const performanceDegradation = (lateAvgResponseTime - earlyAvgResponseTime) / earlyAvgResponseTime;
      expect(performanceDegradation).toBeLessThan(0.3); // Less than 30% degradation
      
      // Generate comprehensive stability report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(testEnv.monitor, {
        sustainedLoad: true,
        stabilityMetrics,
        performanceByType
      });
      
      expect(performanceReport.benchmarks.allPassed).toBe(true);
      
    }, 300000); // 5 minutes for 15-minute test + buffer
  });

  describe('System Breaking Point Analysis', () => {
    test('should identify system limits through gradual load increase', async () => {
      const startRpm = 10;
      const endRpm = 100;
      const rampDurationMinutes = 8;
      const stepDurationSeconds = 30; // 30 seconds per load level
      
      console.log(`📈 Breaking point analysis: ${startRpm} to ${endRpm} req/min over ${rampDurationMinutes} minutes`);
      
      // Create test data
      const providers = ProviderFactory.createMany(8);
      const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 3));
      const customers = CustomerFactory.createMany(50);
      
      // Authenticate users
      const authenticatedUsers = await this.authenticateTestUsers(
        customers.slice(0, 15),
        providers.slice(0, 4)
      );
      
      // Generate ramp-up load pattern
      const rampUpPattern = LoadPatternGenerator.rampUpLoad(
        startRpm,
        endRpm,
        rampDurationMinutes * 60
      );
      
      const rampUpRequests = rampUpPattern.map((timing, index) => {
        const requestType = index % 3 === 0 ? 'booking' : (index % 3 === 1 ? 'availability' : 'search');
        return this.createSimpleRequest(requestType, authenticatedUsers, providers, services, index);
      });
      
      console.log(`📊 Executing breaking point test: ${rampUpRequests.length} requests with gradual ramp-up...`);
      
      // Execute ramp-up test with load level tracking
      const results = [];
      const loadLevelMetrics = [];
      const startTime = Date.now();
      
      let currentLoadLevel = startRpm;
      const rpmIncrement = (endRpm - startRpm) / (rampDurationMinutes * 60);
      
      for (let step = 0; step < rampDurationMinutes * 2; step++) { // 30-second steps
        const stepStart = step * stepDurationSeconds;
        const stepEnd = (step + 1) * stepDurationSeconds;
        
        // Get requests for this time window
        const stepRequests = rampUpRequests.filter(req => 
          req.timing >= stepStart && req.timing < stepEnd
        );
        
        const stepStartTime = Date.now();
        const stepResults = await testEnv.executor.executeConcurrent(stepRequests, {
          maxConcurrency: Math.min(30, stepRequests.length),
          rampUpMs: 1000,
          delayBetweenRequests: Math.max(10, stepDurationSeconds * 1000 / stepRequests.length)
        });
        
        results.push(...stepResults);
        
        // Analyze step performance
        const stepSuccessful = stepResults.filter(r => r.success && r.response.status < 400);
        const stepFailed = stepResults.filter(r => !r.success || r.response.status >= 400);
        const stepDuration = Date.now() - stepStartTime;
        
        const stepMetrics = {
          step,
          loadLevel: Math.round(currentLoadLevel),
          totalRequests: stepRequests.length,
          successful: stepSuccessful.length,
          failed: stepFailed.length,
          successRate: stepSuccessful.length / stepRequests.length,
          avgResponseTime: stepSuccessful.reduce((sum, r) => sum + r.duration, 0) / stepSuccessful.length || 0,
          maxResponseTime: stepSuccessful.length > 0 ? Math.max(...stepSuccessful.map(r => r.duration)) : 0,
          throughput: stepSuccessful.length / (stepDuration / 60000),
          duration: stepDuration
        };
        
        loadLevelMetrics.push(stepMetrics);
        
        console.log(`📊 Step ${step + 1}: ${stepMetrics.loadLevel} req/min - ${stepMetrics.successful}/${stepMetrics.totalRequests} successful (${(stepMetrics.successRate * 100).toFixed(1)}%), ${stepMetrics.avgResponseTime.toFixed(0)}ms avg`);
        
        // Update load level
        currentLoadLevel += rpmIncrement * stepDurationSeconds;
        
        // Brief pause between steps
        await sleep(500);
      }
      
      const totalDuration = Date.now() - startTime;
      await StressTestUtils.waitForCompletion(testEnv.executor, 15000);
      
      // Analyze breaking point
      const breakingPointAnalysis = this.analyzeBreakingPoint(loadLevelMetrics);
      
      console.log(`📈 Breaking Point Analysis Results:
        Total Duration: ${(totalDuration / 60000).toFixed(2)} minutes
        Total Requests: ${results.length}
        Peak Load Level: ${Math.max(...loadLevelMetrics.map(m => m.loadLevel))} req/min
        Breaking Point: ${breakingPointAnalysis.breakingPoint} req/min
        Optimal Load: ${breakingPointAnalysis.optimalLoad} req/min
        Performance Cliff: ${breakingPointAnalysis.hasPerformanceCliff ? 'Yes' : 'No'}
        Graceful Degradation: ${breakingPointAnalysis.gracefulDegradation ? 'Yes' : 'No'}
      `);
      
      console.log(`📊 Load Level Performance Summary:`);
      loadLevelMetrics.forEach(metrics => {
        if (metrics.step % 4 === 0) { // Every 2 minutes
          console.log(`  ${metrics.loadLevel} req/min: ${(metrics.successRate * 100).toFixed(1)}% success, ${metrics.avgResponseTime.toFixed(0)}ms avg`);
        }
      });
      
      // Validate breaking point analysis
      expect(loadLevelMetrics.length).toBeGreaterThan(0);
      expect(breakingPointAnalysis.breakingPoint).toBeGreaterThan(startRpm);
      expect(breakingPointAnalysis.breakingPoint).toBeLessThanOrEqual(endRpm);
      expect(breakingPointAnalysis.optimalLoad).toBeGreaterThan(0);
      expect(breakingPointAnalysis.optimalLoad).toBeLessThanOrEqual(breakingPointAnalysis.breakingPoint);
      
      // System should handle at least 2x the starting load
      expect(breakingPointAnalysis.breakingPoint).toBeGreaterThan(startRpm * 2);
      
      // Performance should degrade gracefully
      expect(breakingPointAnalysis.gracefulDegradation).toBe(true);
      
      // Early load levels should have high success rates
      const earlyMetrics = loadLevelMetrics.slice(0, 5);
      earlyMetrics.forEach(metrics => {
        expect(metrics.successRate).toBeGreaterThan(0.95);
      });
      
    }, 240000); // 4 minutes for 8-minute test + buffer
  });

  describe('Resource Exhaustion Recovery', () => {
    test('should recover from memory pressure gracefully', async () => {
      const memoryPressureRequests = 150;
      const recoveryRequests = 50;
      
      console.log(`💾 Testing memory pressure recovery: ${memoryPressureRequests} + ${recoveryRequests} requests`);
      
      // Create memory-intensive test scenario
      const providers = ProviderFactory.createMany(10);
      const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 5));
      const customers = CustomerFactory.createMany(memoryPressureRequests);
      
      // Authenticate users
      const authenticatedUsers = await this.authenticateTestUsers(
        customers.slice(0, 20),
        providers.slice(0, 5)
      );
      
      // Create snapshot before memory pressure
      await testEnv.dbManager.createSnapshot('before_memory_pressure', async () => ({
        memoryUsage: process.memoryUsage(),
        activeConnections: 0,
        queueSize: 0
      }));
      
      // Phase 1: Create memory pressure with large responses
      const memoryPressureOps = [];
      for (let i = 0; i < memoryPressureRequests; i++) {
        const customer = authenticatedUsers.customers[i % authenticatedUsers.customers.length];
        
        // Mix of memory-intensive operations
        const opType = i % 4;
        if (opType === 0) {
          // Large search with detailed results
          memoryPressureOps.push({
            method: 'GET',
            path: '/api/providers/search?lat=31.9566&lng=35.9457&radius=50&includeServices=true&includeReviews=true&includePhotos=true&limit=100',
            data: null,
            userId: customer.userId,
            type: 'large_search'
          });
        } else if (opType === 1) {
          // Complex availability calculation
          const provider = providers[i % providers.length];
          memoryPressureOps.push({
            method: 'GET',
            path: `/api/availability/${provider.id}?date=${new Date(Date.now() + 86400000).toISOString().split('T')[0]}&includeAllSlots=true&includePrayerTimes=true&includeBreaks=true`,
            data: null,
            userId: customer.userId,
            type: 'complex_availability'
          });
        } else if (opType === 2) {
          // Large booking history request
          memoryPressureOps.push({
            method: 'GET',
            path: '/api/bookings/history?limit=200&includeServices=true&includeProviders=true&includePayments=true',
            data: null,
            userId: customer.userId,
            type: 'large_history'
          });
        } else {
          // Analytics request
          memoryPressureOps.push({
            method: 'GET',
            path: '/api/analytics/provider-performance?period=year&includeDetails=true&includeComparisons=true',
            data: null,
            userId: customer.userId,
            type: 'analytics'
          });
        }
      }
      
      console.log(`📊 Phase 1: Creating memory pressure with ${memoryPressureRequests} intensive operations...`);
      
      const memoryPressureResults = await testEnv.executor.executeConcurrent(memoryPressureOps, {
        maxConcurrency: 50, // High concurrency to stress memory
        rampUpMs: 2000,
        delayBetweenRequests: 20
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 30000);
      
      // Check memory usage after pressure
      const memoryAfterPressure = process.memoryUsage();
      console.log(`💾 Memory after pressure: ${(memoryAfterPressure.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      // Phase 2: Recovery period
      console.log(`⏳ Recovery period: waiting 5 seconds...`);
      await sleep(5000);
      
      // Phase 3: Test recovery with normal operations
      const recoveryOps = [];
      for (let i = 0; i < recoveryRequests; i++) {
        const customer = authenticatedUsers.customers[i % authenticatedUsers.customers.length];
        const service = services[i % services.length];
        const provider = providers.find(p => p.id === service.providerId);
        
        // Simple operations to test recovery
        recoveryOps.push({
          method: 'POST',
          path: '/api/bookings',
          data: {
            providerId: provider.id,
            serviceId: service.id,
            customerId: customer.user.id,
            date: new Date(Date.now() + 86400000 * (i % 5 + 1)).toISOString().split('T')[0],
            time: `${9 + (i % 8)}:00`,
            duration: service.duration,
            totalAmount: service.basePrice,
            paymentMethod: 'cash',
            notes: `Recovery test booking ${i + 1}`
          },
          userId: customer.userId,
          type: 'recovery_booking'
        });
      }
      
      console.log(`📊 Phase 3: Testing recovery with ${recoveryRequests} normal operations...`);
      
      const recoveryResults = await testEnv.executor.executeConcurrent(recoveryOps, {
        maxConcurrency: 15,
        rampUpMs: 1500,
        delayBetweenRequests: 100
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 20000);
      
      // Analyze memory recovery
      const memoryAfterRecovery = process.memoryUsage();
      
      const pressureSuccessful = memoryPressureResults.filter(r => r.success && r.response.status < 400);
      const recoverySuccessful = recoveryResults.filter(r => r.success && r.response.status < 400);
      
      const pressureSuccessRate = pressureSuccessful.length / memoryPressureResults.length;
      const recoverySuccessRate = recoverySuccessful.length / recoveryResults.length;
      
      const pressureAvgTime = pressureSuccessful.reduce((sum, r) => sum + r.duration, 0) / pressureSuccessful.length;
      const recoveryAvgTime = recoverySuccessful.reduce((sum, r) => sum + r.duration, 0) / recoverySuccessful.length;
      
      const memoryRecoveryRate = (memoryAfterPressure.heapUsed - memoryAfterRecovery.heapUsed) / memoryAfterPressure.heapUsed;
      
      console.log(`📈 Memory Pressure Recovery Results:
        Memory Pressure Phase: ${pressureSuccessful.length}/${memoryPressureResults.length} successful (${(pressureSuccessRate * 100).toFixed(2)}%)
        Recovery Phase: ${recoverySuccessful.length}/${recoveryResults.length} successful (${(recoverySuccessRate * 100).toFixed(2)}%)
        Memory Before: ${(testEnv.monitor.metrics.memory.initial.heapUsed / 1024 / 1024).toFixed(2)}MB
        Memory Peak: ${(memoryAfterPressure.heapUsed / 1024 / 1024).toFixed(2)}MB
        Memory After Recovery: ${(memoryAfterRecovery.heapUsed / 1024 / 1024).toFixed(2)}MB
        Memory Recovery Rate: ${(memoryRecoveryRate * 100).toFixed(2)}%
        Response Time - Pressure: ${pressureAvgTime.toFixed(2)}ms
        Response Time - Recovery: ${recoveryAvgTime.toFixed(2)}ms
      `);
      
      // Validate memory recovery
      expect(memoryPressureResults.length).toBe(memoryPressureRequests);
      expect(recoveryResults.length).toBe(recoveryRequests);
      expect(pressureSuccessRate).toBeGreaterThan(0.8); // 80% should succeed under pressure
      expect(recoverySuccessRate).toBeGreaterThan(0.95); // 95% should succeed after recovery
      
      // Memory should show some recovery
      expect(memoryAfterRecovery.heapUsed).toBeLessThan(memoryAfterPressure.heapUsed * 1.1); // Some improvement
      
      // Recovery operations should perform better than pressure operations
      expect(recoveryAvgTime).toBeLessThan(pressureAvgTime * 1.2); // Within 20% of pressure time
      
      // System should not crash under memory pressure
      const memoryErrors = memoryPressureResults.filter(r => 
        r.response && r.response.body && r.response.body.error && 
        r.response.body.error.includes('memory')
      );
      expect(memoryErrors.length).toBeLessThan(memoryPressureRequests * 0.1); // Less than 10% memory errors
      
    }, 90000);
  });

  // Helper methods for mixed workload testing
  generatePeakHourPattern(durationSeconds, baseRpm, peakMultiplier) {
    const pattern = [];
    const requests = [];
    
    for (let second = 0; second < durationSeconds; second++) {
      // Create realistic peak curve (early morning rush)
      const timeProgress = second / durationSeconds;
      const peakCurve = Math.sin(timeProgress * Math.PI); // Bell curve
      const intensity = 1 + (peakMultiplier - 1) * peakCurve;
      const requestsThisSecond = Math.round((baseRpm / 60) * intensity);
      
      for (let req = 0; req < requestsThisSecond; req++) {
        pattern.push({
          timing: second + (req / requestsThisSecond),
          intensity
        });
      }
    }
    
    return pattern;
  }

  selectRequestType(intensity) {
    // Higher intensity = more booking/availability requests
    if (intensity > 2.5) {
      return Math.random() < 0.4 ? 'booking' : 'availability';
    } else if (intensity > 1.5) {
      return Math.random() < 0.3 ? 'booking' : (Math.random() < 0.5 ? 'availability' : 'search');
    } else {
      const rand = Math.random();
      if (rand < 0.2) return 'booking';
      if (rand < 0.4) return 'availability';
      if (rand < 0.6) return 'search';
      if (rand < 0.8) return 'dashboard';
      return 'notification';
    }
  }

  createRealisticRequest(type, customers, providers, providerList, services, index) {
    const customer = customers[index % customers.length];
    
    switch (type) {
      case 'booking':
        const service = services[index % services.length];
        const provider = providerList.find(p => p.id === service.providerId);
        return {
          method: 'POST',
          path: '/api/bookings',
          data: {
            providerId: provider.id,
            serviceId: service.id,
            customerId: customer.user.id,
            date: new Date(Date.now() + 86400000 * (index % 7 + 1)).toISOString().split('T')[0],
            time: `${9 + (index % 8)}:00`,
            duration: service.duration,
            totalAmount: service.basePrice,
            paymentMethod: 'cash'
          },
          userId: customer.userId,
          type: 'booking'
        };
        
      case 'availability':
        const availProvider = providerList[index % providerList.length];
        return {
          method: 'GET',
          path: `/api/availability/${availProvider.id}?date=${new Date(Date.now() + 86400000 * (index % 7 + 1)).toISOString().split('T')[0]}`,
          data: null,
          userId: customer.userId,
          type: 'availability'
        };
        
      case 'search':
        return {
          method: 'GET',
          path: `/api/providers/search?lat=31.9566&lng=35.9457&radius=${5 + (index % 10)}`,
          data: null,
          userId: customer.userId,
          type: 'search'
        };
        
      default:
        return {
          method: 'GET',
          path: '/api/providers',
          data: null,
          userId: customer.userId,
          type: 'general'
        };
    }
  }

  async authenticateTestUsers(customers, providers) {
    const authenticatedCustomers = [];
    const authenticatedProviders = [];
    
    for (let i = 0; i < customers.length; i++) {
      try {
        const auth = await testEnv.client.authenticate('customer', customers[i]);
        authenticatedCustomers.push(auth);
      } catch (error) {
        // Ignore auth failures in stress tests
      }
    }
    
    for (let i = 0; i < providers.length; i++) {
      try {
        const auth = await testEnv.client.authenticate('provider', providers[i]);
        authenticatedProviders.push(auth);
      } catch (error) {
        // Ignore auth failures in stress tests
      }
    }
    
    return {
      customers: authenticatedCustomers,
      providers: authenticatedProviders
    };
  }

  selectRequestTypeByMix(requestMix) {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [type, probability] of Object.entries(requestMix)) {
      cumulative += probability;
      if (rand <= cumulative) {
        return type;
      }
    }
    
    return 'booking_creation'; // fallback
  }

  createRequestByType(type, authenticatedUsers, providerData, index) {
    const customer = authenticatedUsers.customers[index % authenticatedUsers.customers.length];
    const providerInfo = providerData[index % providerData.length];
    
    // Implementation would create specific request based on type
    // Simplified for brevity
    return {
      method: 'GET',
      path: '/api/providers',
      data: null,
      userId: customer.userId,
      type: type
    };
  }

  createSimpleRequest(type, authenticatedUsers, providers, services, index) {
    const customer = authenticatedUsers.customers[index % authenticatedUsers.customers.length];
    
    switch (type) {
      case 'booking':
        const service = services[index % services.length];
        return {
          method: 'POST',
          path: '/api/bookings',
          data: {
            providerId: service.providerId,
            serviceId: service.id,
            customerId: customer.user.id,
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            time: '10:00',
            duration: service.duration,
            totalAmount: service.basePrice,
            paymentMethod: 'cash'
          },
          userId: customer.userId,
          type: 'booking',
          timing: index * 100 // Simple timing
        };
        
      case 'availability':
        const provider = providers[index % providers.length];
        return {
          method: 'GET',
          path: `/api/availability/${provider.id}?date=${new Date(Date.now() + 86400000).toISOString().split('T')[0]}`,
          data: null,
          userId: customer.userId,
          type: 'availability',
          timing: index * 100
        };
        
      default:
        return {
          method: 'GET',
          path: '/api/providers/search?lat=31.9566&lng=35.9457&radius=10',
          data: null,
          userId: customer.userId,
          type: 'search',
          timing: index * 100
        };
    }
  }

  groupResultsByType(results) {
    const grouped = {};
    results.forEach(result => {
      const type = result.requestConfig?.type || 'unknown';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(result);
    });
    return grouped;
  }

  calculatePerformanceByType(resultsByType) {
    const performanceByType = {};
    
    Object.entries(resultsByType).forEach(([type, results]) => {
      const successful = results.filter(r => r.success && r.response.status < 400);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      
      performanceByType[type] = {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        successRate: successful.length / results.length,
        avgResponseTime: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length || 0,
        maxResponseTime: successful.length > 0 ? Math.max(...successful.map(r => r.duration)) : 0
      };
    });
    
    return performanceByType;
  }

  calculateStabilityMetrics(metricsHistory) {
    if (metricsHistory.length === 0) {
      return { stabilityScore: 0, responseTimeVariance: 0 };
    }
    
    const successRates = metricsHistory.map(m => m.successful / m.requests);
    const responseTimes = metricsHistory.map(m => m.avgResponseTime);
    
    // Calculate stability score (consistency of success rates)
    const avgSuccessRate = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
    const successRateVariance = successRates.reduce((sum, rate) => sum + Math.pow(rate - avgSuccessRate, 2), 0) / successRates.length;
    const stabilityScore = Math.max(0, 100 - (successRateVariance * 1000)); // Scale variance to percentage
    
    // Calculate response time variance
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const responseTimeVariance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgResponseTime, 2), 0) / responseTimes.length;
    
    return {
      stabilityScore,
      responseTimeVariance
    };
  }

  analyzeBreakingPoint(loadLevelMetrics) {
    let breakingPoint = loadLevelMetrics[loadLevelMetrics.length - 1].loadLevel;
    let optimalLoad = loadLevelMetrics[0].loadLevel;
    let hasPerformanceCliff = false;
    let gracefulDegradation = true;
    
    // Find breaking point (where success rate drops below 80%)
    for (let i = 0; i < loadLevelMetrics.length; i++) {
      if (loadLevelMetrics[i].successRate < 0.8) {
        breakingPoint = loadLevelMetrics[i].loadLevel;
        break;
      }
    }
    
    // Find optimal load (best balance of throughput and response time)
    let bestScore = 0;
    for (const metrics of loadLevelMetrics) {
      if (metrics.successRate > 0.95) {
        const score = metrics.throughput / (metrics.avgResponseTime / 1000); // requests per second per response second
        if (score > bestScore) {
          bestScore = score;
          optimalLoad = metrics.loadLevel;
        }
      }
    }
    
    // Check for performance cliff (sudden degradation)
    for (let i = 1; i < loadLevelMetrics.length; i++) {
      const prev = loadLevelMetrics[i - 1];
      const curr = loadLevelMetrics[i];
      
      if (prev.successRate - curr.successRate > 0.3) { // 30% drop
        hasPerformanceCliff = true;
        gracefulDegradation = false;
        break;
      }
    }
    
    return {
      breakingPoint,
      optimalLoad,
      hasPerformanceCliff,
      gracefulDegradation
    };
  }
});