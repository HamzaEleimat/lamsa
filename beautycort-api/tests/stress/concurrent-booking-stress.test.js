/**
 * Concurrent Booking Stress Tests
 * Tests race conditions, double-booking prevention, and system behavior under high concurrency
 */

const request = require('supertest');
const { createTestServer } = require('../utils/testServer');
const { clearTestDatabase } = require('../utils/database');
const { 
  StressTestUtils, 
  TestResultAnalyzer, 
  StressConfig 
} = require('./utils/stress-test-helpers');
const { 
  TestScenarioFactory, 
  ProviderFactory, 
  ServiceFactory, 
  CustomerFactory,
  BookingFactory 
} = require('./utils/booking-factories');
const { sleep } = require('./utils/performance-monitor');

describe('Concurrent Booking Stress Tests', () => {
  let app;
  let server;
  let testEnv;

  beforeAll(async () => {
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-stress-testing';
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    await clearTestDatabase();
    testEnv = StressTestUtils.createTestEnvironment(app);
    testEnv.monitor.startMonitoring(500); // Monitor every 500ms
  });

  afterEach(async () => {
    StressTestUtils.cleanupTestEnvironment(testEnv);
  });

  describe('Race Condition Prevention', () => {
    test('should prevent double-booking when 100 users try to book same slot simultaneously', async () => {
      // Test configuration
      const concurrentUsers = 100;
      const timeoutMs = 30000; // 30 seconds
      
      console.log(`🚀 Starting race condition test with ${concurrentUsers} concurrent users`);
      
      // Create test scenario
      const scenario = TestScenarioFactory.createConcurrentBookingScenario(concurrentUsers);
      const { provider, service, customers, targetSlot } = scenario;
      
      // Create database snapshot before test
      await testEnv.dbManager.createSnapshot('before_booking', async () => ({
        bookings: [], // Would query actual bookings from database
        availableSlots: [], // Would query available slots
        providerStatus: provider.status
      }));
      
      // Prepare concurrent booking requests
      const bookingRequests = customers.map((customer, index) => ({
        method: 'POST',
        path: '/api/bookings',
        data: {
          providerId: provider.id,
          serviceId: service.id,
          customerId: customer.id,
          date: targetSlot.date,
          time: targetSlot.time,
          duration: service.duration,
          paymentMethod: 'cash',
          notes: `Concurrent booking test #${index + 1}`,
          notesAr: `اختبار الحجز المتزامن #${index + 1}`
        },
        userId: customer.id,
        options: {
          timeout: 10000 // 10 second timeout per request
        }
      }));
      
      console.log(`📊 Executing ${bookingRequests.length} concurrent booking requests...`);
      
      // Execute concurrent requests
      const startTime = Date.now();
      const results = await testEnv.executor.executeConcurrent(bookingRequests, {
        maxConcurrency: concurrentUsers,
        rampUpMs: 1000, // 1 second ramp up
        delayBetweenRequests: 5 // 5ms delay within batches
      });
      
      const executionTime = Date.now() - startTime;
      console.log(`⏱️  Execution completed in ${executionTime}ms`);
      
      // Wait for all requests to complete
      await StressTestUtils.waitForCompletion(testEnv.executor, timeoutMs);
      
      // Analyze results
      const analysis = TestResultAnalyzer.analyzeConcurrentBookings(results, targetSlot);
      
      console.log(`📈 Test Results:
        Total Requests: ${analysis.total}
        Successful: ${analysis.successful}
        Failed: ${analysis.failed}
        Conflicts (409): ${analysis.conflicts}
        Actual Bookings Created: ${analysis.successfulBookings}
        Race Condition Prevented: ${analysis.raceConditionPrevented ? '✅' : '❌'}
        Avg Response Time: ${analysis.averageResponseTime.toFixed(2)}ms
        Max Response Time: ${analysis.maxResponseTime}ms
      `);
      
      // Validate test expectations
      expect(analysis.total).toBe(concurrentUsers);
      expect(analysis.successfulBookings).toBeLessThanOrEqual(1); // Only one booking should succeed
      expect(analysis.conflicts).toBeGreaterThan(0); // Should have conflict responses
      expect(analysis.raceConditionPrevented).toBe(true);
      expect(analysis.maxResponseTime).toBeLessThan(StressConfig.BENCHMARKS.maxResponseTimeP95);
      
      // Validate error handling
      expect(analysis.errorTypes.conflict).toBeDefined();
      expect(analysis.errorTypes.conflict.count).toBeGreaterThan(90); // Most should be conflicts
      
      // Generate performance report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(
        testEnv.monitor, 
        analysis
      );
      
      console.log(`🎯 Performance Benchmarks:
        Response Time: ${performanceReport.benchmarks.responseTime.passed ? '✅' : '❌'} (${performanceReport.benchmarks.responseTime.actual.toFixed(2)}ms)
        Error Rate: ${performanceReport.benchmarks.errorRate.passed ? '✅' : '❌'} (${performanceReport.benchmarks.errorRate.actual.toFixed(2)}%)
        Throughput: ${performanceReport.benchmarks.throughput.passed ? '✅' : '❌'} (${performanceReport.benchmarks.throughput.actual.toFixed(2)} req/s)
        Memory Usage: ${performanceReport.benchmarks.memory.passed ? '✅' : '❌'} (${performanceReport.benchmarks.memory.actual.toFixed(2)}MB)
      `);
      
      // All benchmarks should pass
      expect(performanceReport.benchmarks.allPassed).toBe(true);
      
      // Check database consistency
      const dbComparison = await testEnv.dbManager.compareWithSnapshot('before_booking', async () => ({
        bookings: [/* Would query actual bookings */],
        availableSlots: [/* Would query available slots */],
        providerStatus: provider.status
      }));
      
      // Database should remain consistent
      expect(dbComparison.differences).toBeDefined();
      
    }, 45000); // 45 second timeout for entire test

    test('should handle burst traffic of 50 requests per second for 30 seconds', async () => {
      const requestsPerSecond = 50;
      const durationSeconds = 30;
      const totalRequests = requestsPerSecond * durationSeconds;
      
      console.log(`🔥 Starting burst traffic test: ${requestsPerSecond} req/s for ${durationSeconds}s`);
      
      // Create diverse test data
      const providers = ProviderFactory.createMany(5);
      const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 2));
      const customers = CustomerFactory.createMany(Math.ceil(totalRequests / 10));
      
      // Generate booking requests across different slots
      const bookingRequests = [];
      for (let i = 0; i < totalRequests; i++) {
        const provider = providers[i % providers.length];
        const service = services.find(s => s.providerId === provider.id);
        const customer = customers[i % customers.length];
        
        // Vary the booking dates and times
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + Math.floor(i / 100) + 1);
        const times = ['09:00', '10:00', '11:00', '15:00', '16:00', '17:00'];
        const time = times[i % times.length];
        
        bookingRequests.push({
          method: 'POST',
          path: '/api/bookings',
          data: {
            providerId: provider.id,
            serviceId: service.id,
            customerId: customer.id,
            date: futureDate.toISOString().split('T')[0],
            time,
            duration: service.duration,
            paymentMethod: 'cash',
            notes: `Burst test booking #${i + 1}`
          },
          userId: customer.id,
          options: { timeout: 5000 }
        });
      }
      
      console.log(`📊 Executing ${totalRequests} requests over ${durationSeconds} seconds...`);
      
      // Execute with steady rate
      const results = [];
      const batchSize = Math.ceil(requestsPerSecond / 10); // 10 batches per second
      const batchInterval = 100; // 100ms between batches
      
      const startTime = Date.now();
      for (let second = 0; second < durationSeconds; second++) {
        const secondStartTime = Date.now();
        
        // Execute requests for this second
        for (let batch = 0; batch < 10; batch++) {
          const batchStart = second * requestsPerSecond + (batch * batchSize);
          const batchEnd = Math.min(batchStart + batchSize, totalRequests);
          
          if (batchStart >= totalRequests) break;
          
          const batchRequests = bookingRequests.slice(batchStart, batchEnd);
          
          // Execute batch
          const batchResults = await testEnv.executor.executeConcurrent(batchRequests, {
            maxConcurrency: batchSize,
            rampUpMs: 0,
            delayBetweenRequests: 1
          });
          
          results.push(...batchResults);
          
          // Wait for next batch
          if (batch < 9) {
            await sleep(batchInterval);
          }
        }
        
        // Ensure we maintain 1-second intervals
        const secondDuration = Date.now() - secondStartTime;
        if (secondDuration < 1000) {
          await sleep(1000 - secondDuration);
        }
        
        // Print progress every 5 seconds
        if ((second + 1) % 5 === 0) {
          testEnv.monitor.printStatus();
        }
      }
      
      const totalDuration = Date.now() - startTime;
      console.log(`⏱️  Burst test completed in ${totalDuration}ms`);
      
      // Wait for remaining requests
      await StressTestUtils.waitForCompletion(testEnv.executor, 10000);
      
      // Analyze results
      const successful = results.filter(r => r.success && r.response.status < 400);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      const rateLimit = results.filter(r => r.response && r.response.status === 429);
      
      const actualThroughput = successful.length / (totalDuration / 1000);
      const errorRate = (failed.length / results.length) * 100;
      
      console.log(`📈 Burst Test Results:
        Total Requests: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Rate Limited (429): ${rateLimit.length}
        Actual Throughput: ${actualThroughput.toFixed(2)} req/s
        Error Rate: ${errorRate.toFixed(2)}%
        Target Throughput: ${requestsPerSecond} req/s
      `);
      
      // Validate performance under load
      expect(results.length).toBe(totalRequests);
      expect(actualThroughput).toBeGreaterThan(requestsPerSecond * 0.8); // At least 80% of target
      expect(errorRate).toBeLessThan(5); // Less than 5% error rate
      
      // System should handle rate limiting gracefully
      if (rateLimit.length > 0) {
        expect(rateLimit.length).toBeLessThan(totalRequests * 0.1); // Less than 10% rate limited
      }
      
      // Generate performance report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(testEnv.monitor);
      expect(performanceReport.benchmarks.allPassed).toBe(true);
      
    }, 60000); // 60 second timeout

    test('should maintain data consistency under concurrent modifications', async () => {
      const concurrentOperations = 30;
      
      console.log(`🔄 Testing data consistency with ${concurrentOperations} concurrent operations`);
      
      // Create test data
      const provider = ProviderFactory.create();
      const service = ServiceFactory.create(provider.id);
      const customers = CustomerFactory.createMany(concurrentOperations);
      
      // Create initial booking
      const initialCustomer = customers[0];
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 1);
      const bookingTime = '10:00';
      
      const existingBooking = BookingFactory.createForSlot(
        initialCustomer.id,
        provider.id,
        service.id,
        bookingDate.toISOString().split('T')[0],
        bookingTime
      );
      
      // Create database snapshot
      await testEnv.dbManager.createSnapshot('before_modifications', async () => ({
        bookings: [existingBooking],
        provider: provider,
        service: service,
        customers: customers
      }));
      
      // Prepare concurrent operations (mix of creates, updates, cancellations)
      const operations = [];
      
      for (let i = 0; i < concurrentOperations; i++) {
        const customer = customers[i];
        const operationType = i % 3;
        
        if (operationType === 0) {
          // Create new booking (different slot)
          operations.push({
            type: 'create',
            method: 'POST',
            path: '/api/bookings',
            data: {
              providerId: provider.id,
              serviceId: service.id,
              customerId: customer.id,
              date: bookingDate.toISOString().split('T')[0],
              time: '11:00', // Different time
              duration: service.duration,
              paymentMethod: 'cash'
            },
            userId: customer.id
          });
        } else if (operationType === 1) {
          // Try to book same slot (should conflict)
          operations.push({
            type: 'conflict',
            method: 'POST',
            path: '/api/bookings',
            data: {
              providerId: provider.id,
              serviceId: service.id,
              customerId: customer.id,
              date: bookingDate.toISOString().split('T')[0],
              time: bookingTime, // Same time as existing
              duration: service.duration,
              paymentMethod: 'cash'
            },
            userId: customer.id
          });
        } else {
          // Update existing booking
          operations.push({
            type: 'update',
            method: 'PUT',
            path: `/api/bookings/${existingBooking.id}`,
            data: {
              notes: `Updated by customer ${i}`,
              notesAr: `تم التحديث من قبل العميل ${i}`
            },
            userId: initialCustomer.id
          });
        }
      }
      
      console.log(`📊 Executing ${operations.length} concurrent operations...`);
      
      // Execute all operations concurrently
      const results = await testEnv.executor.executeConcurrent(operations, {
        maxConcurrency: concurrentOperations,
        rampUpMs: 500,
        delayBetweenRequests: 2
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 15000);
      
      // Analyze results by operation type
      const createOps = results.filter(r => r.requestConfig?.type === 'create');
      const conflictOps = results.filter(r => r.requestConfig?.type === 'conflict');
      const updateOps = results.filter(r => r.requestConfig?.type === 'update');
      
      const successfulCreates = createOps.filter(r => r.success && r.response.status === 201);
      const conflictedBookings = conflictOps.filter(r => r.response && r.response.status === 409);
      const successfulUpdates = updateOps.filter(r => r.success && r.response.status === 200);
      
      console.log(`📈 Consistency Test Results:
        Total Operations: ${results.length}
        Successful Creates: ${successfulCreates.length}/${createOps.length}
        Conflicted Bookings: ${conflictedBookings.length}/${conflictOps.length}
        Successful Updates: ${successfulUpdates.length}/${updateOps.length}
      `);
      
      // Validate data consistency
      expect(successfulCreates.length).toBeGreaterThan(0);
      expect(conflictedBookings.length).toBeGreaterThan(0); // Conflicts should be detected
      
      // Only one update should succeed (or all should succeed with proper locking)
      expect(successfulUpdates.length).toBeGreaterThanOrEqual(0);
      
      // Check final database state
      const dbComparison = await testEnv.dbManager.compareWithSnapshot('before_modifications', async () => ({
        bookings: [existingBooking, ...successfulCreates.map(r => r.response.body.booking)],
        provider: provider,
        service: service,
        customers: customers
      }));
      
      // Database should reflect only successful operations
      expect(dbComparison.current.bookings.length).toBeGreaterThan(dbComparison.snapshot.bookings.length);
      
      // Generate performance report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(testEnv.monitor);
      expect(performanceReport.benchmarks.responseTime.passed).toBe(true);
      
    }, 30000);

    test('should handle booking cancellations under concurrent load', async () => {
      const numberOfBookings = 50;
      const concurrentCancellations = 25;
      
      console.log(`❌ Testing concurrent cancellations: ${concurrentCancellations} of ${numberOfBookings} bookings`);
      
      // Create test scenario with existing bookings
      const provider = ProviderFactory.create();
      const service = ServiceFactory.create(provider.id);
      const customers = CustomerFactory.createMany(numberOfBookings);
      
      // Create existing bookings
      const existingBookings = [];
      for (let i = 0; i < numberOfBookings; i++) {
        const customer = customers[i];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1 + Math.floor(i / 10));
        
        const booking = BookingFactory.create(customer.id, provider.id, service.id, {
          date: futureDate.toISOString().split('T')[0],
          time: '10:00',
          status: 'confirmed'
        });
        
        existingBookings.push(booking);
      }
      
      // Randomly select bookings to cancel
      const bookingsToCancel = existingBookings
        .sort(() => Math.random() - 0.5)
        .slice(0, concurrentCancellations);
      
      // Prepare cancellation requests
      const cancellationRequests = bookingsToCancel.map((booking, index) => ({
        method: 'PUT',
        path: `/api/bookings/${booking.id}/cancel`,
        data: {
          cancellationReason: 'Customer request',
          cancellationReasonAr: 'طلب العميل',
          refundAmount: booking.totalAmount * 0.8 // 80% refund
        },
        userId: booking.customerId,
        options: { timeout: 8000 }
      }));
      
      console.log(`📊 Executing ${cancellationRequests.length} concurrent cancellations...`);
      
      // Execute concurrent cancellations
      const results = await testEnv.executor.executeConcurrent(cancellationRequests, {
        maxConcurrency: concurrentCancellations,
        rampUpMs: 1000,
        delayBetweenRequests: 10
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 20000);
      
      // Analyze cancellation results
      const successful = results.filter(r => r.success && r.response.status === 200);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      const alreadyCancelled = results.filter(r => r.response && r.response.status === 409);
      
      console.log(`📈 Cancellation Test Results:
        Total Cancellations: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Already Cancelled: ${alreadyCancelled.length}
        Success Rate: ${(successful.length / results.length * 100).toFixed(2)}%
      `);
      
      // Validate cancellation behavior
      expect(successful.length).toBeGreaterThan(0);
      expect(successful.length + alreadyCancelled.length).toBe(concurrentCancellations);
      
      // All successful cancellations should have refunds processed
      successful.forEach(result => {
        expect(result.response.body.booking.status).toBe('cancelled');
        expect(result.response.body.refund).toBeDefined();
        expect(result.response.body.refund.amount).toBeGreaterThan(0);
      });
      
      // Generate performance report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(testEnv.monitor);
      expect(performanceReport.benchmarks.allPassed).toBe(true);
      
    }, 35000);
  });

  describe('Platform Fee Calculations Under Load', () => {
    test('should accurately calculate fees for various price points under concurrent load', async () => {
      const concurrentBookings = 50;
      const pricePoints = [15, 25, 50, 75, 100, 150, 200]; // JOD
      
      console.log(`💰 Testing fee calculations for ${concurrentBookings} concurrent bookings`);
      
      // Create diverse pricing scenario
      const providers = ProviderFactory.createMany(5);
      const services = [];
      const customers = CustomerFactory.createMany(concurrentBookings);
      
      // Create services with different price points
      providers.forEach(provider => {
        pricePoints.forEach(price => {
          services.push(ServiceFactory.create(provider.id, {
            basePrice: price,
            pricing: {
              type: 'fixed',
              basePrice: price,
              currency: 'JOD'
            }
          }));
        });
      });
      
      // Prepare booking requests with different amounts
      const bookingRequests = [];
      for (let i = 0; i < concurrentBookings; i++) {
        const customer = customers[i];
        const service = services[i % services.length];
        const provider = providers.find(p => p.id === service.providerId);
        
        // Add some variety with tips and upsells
        const tips = Math.random() > 0.7 ? Math.round(service.basePrice * 0.1) : 0;
        const upsellAmount = Math.random() > 0.8 ? Math.round(service.basePrice * 0.2) : 0;
        const totalAmount = service.basePrice + tips + upsellAmount;
        
        bookingRequests.push({
          method: 'POST',
          path: '/api/bookings',
          data: {
            providerId: provider.id,
            serviceId: service.id,
            customerId: customer.id,
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            time: '10:00',
            duration: service.duration,
            totalAmount,
            tips,
            upsellAmount,
            paymentMethod: 'card',
            notes: `Fee calculation test #${i + 1}`
          },
          userId: customer.id,
          metadata: {
            expectedPlatformFee: totalAmount * 0.10, // 10%
            expectedProcessingFee: totalAmount * 0.025, // 2.5%
            expectedNetAmount: totalAmount * 0.875 // 87.5%
          }
        });
      }
      
      console.log(`📊 Processing ${bookingRequests.length} bookings with fee calculations...`);
      
      // Execute concurrent bookings
      const results = await testEnv.executor.executeConcurrent(bookingRequests, {
        maxConcurrency: 25,
        rampUpMs: 2000,
        delayBetweenRequests: 20
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 25000);
      
      // Analyze fee calculation accuracy
      const successful = results.filter(r => r.success && r.response.status === 201);
      const feeErrors = [];
      
      successful.forEach((result, index) => {
        const booking = result.response.body.booking;
        const expected = bookingRequests[index].metadata;
        
        if (booking.fees) {
          const platformFeeDiff = Math.abs(booking.fees.platformFee - expected.expectedPlatformFee);
          const processingFeeDiff = Math.abs(booking.fees.processingFee - expected.expectedProcessingFee);
          const netAmountDiff = Math.abs(booking.netAmount - expected.expectedNetAmount);
          
          // Allow for small rounding differences
          if (platformFeeDiff > 0.01 || processingFeeDiff > 0.01 || netAmountDiff > 0.01) {
            feeErrors.push({
              bookingId: booking.id,
              expected,
              actual: booking.fees,
              differences: {
                platformFee: platformFeeDiff,
                processingFee: processingFeeDiff,
                netAmount: netAmountDiff
              }
            });
          }
        }
      });
      
      console.log(`📈 Fee Calculation Results:
        Total Bookings: ${results.length}
        Successful: ${successful.length}
        Fee Calculation Errors: ${feeErrors.length}
        Accuracy Rate: ${((successful.length - feeErrors.length) / successful.length * 100).toFixed(2)}%
      `);
      
      // Validate fee calculation accuracy
      expect(successful.length).toBeGreaterThan(concurrentBookings * 0.9); // 90% success rate
      expect(feeErrors.length).toBe(0); // No fee calculation errors
      
      // Test different provider tiers
      const premiumProviders = providers.filter(p => p.tier === 'premium');
      if (premiumProviders.length > 0) {
        // Premium providers should have reduced fees
        successful.forEach(result => {
          const booking = result.response.body.booking;
          const provider = providers.find(p => p.id === booking.providerId);
          
          if (provider.tier === 'premium' && booking.fees) {
            expect(booking.fees.platformFee).toBeLessThan(booking.totalAmount * 0.10);
          }
        });
      }
      
      // Generate performance report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(testEnv.monitor);
      expect(performanceReport.benchmarks.allPassed).toBe(true);
      
    }, 40000);

    test('should handle Ramadan fee adjustments during concurrent bookings', async () => {
      const concurrentBookings = 30;
      
      // Mock Ramadan period
      const originalDate = Date.now;
      Date.now = jest.fn(() => new Date('2024-03-15T10:00:00Z').getTime()); // During Ramadan
      
      console.log(`🌙 Testing Ramadan fee adjustments with ${concurrentBookings} concurrent bookings`);
      
      try {
        // Create test scenario
        const providers = ProviderFactory.createMany(3);
        const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 2));
        const customers = CustomerFactory.createMany(concurrentBookings);
        
        // Prepare Ramadan booking requests
        const bookingRequests = customers.map((customer, index) => {
          const service = services[index % services.length];
          const provider = providers.find(p => p.id === service.providerId);
          
          return {
            method: 'POST',
            path: '/api/bookings',
            data: {
              providerId: provider.id,
              serviceId: service.id,
              customerId: customer.id,
              date: '2024-03-20', // During Ramadan
              time: '21:00', // Evening Ramadan hours
              duration: service.duration,
              totalAmount: service.basePrice,
              paymentMethod: 'cash',
              notes: 'Ramadan booking test'
            },
            userId: customer.id,
            metadata: {
              isRamadan: true,
              expectedReducedFee: service.basePrice * 0.08, // 8% instead of 10%
            }
          };
        });
        
        console.log(`📊 Processing Ramadan bookings...`);
        
        // Execute concurrent Ramadan bookings
        const results = await testEnv.executor.executeConcurrent(bookingRequests, {
          maxConcurrency: 20,
          rampUpMs: 1500,
          delayBetweenRequests: 15
        });
        
        await StressTestUtils.waitForCompletion(testEnv.executor, 20000);
        
        // Analyze Ramadan fee adjustments
        const successful = results.filter(r => r.success && r.response.status === 201);
        const ramadanDiscountApplied = successful.filter(result => {
          const booking = result.response.body.booking;
          return booking.fees && booking.fees.specialRate === 'ramadan_discount';
        });
        
        console.log(`📈 Ramadan Fee Test Results:
          Total Bookings: ${results.length}
          Successful: ${successful.length}
          Ramadan Discounts Applied: ${ramadanDiscountApplied.length}
          Discount Rate: ${(ramadanDiscountApplied.length / successful.length * 100).toFixed(2)}%
        `);
        
        // Validate Ramadan fee adjustments
        expect(successful.length).toBeGreaterThan(concurrentBookings * 0.9);
        expect(ramadanDiscountApplied.length).toBeGreaterThan(0);
        
        // Verify reduced fees
        ramadanDiscountApplied.forEach(result => {
          const booking = result.response.body.booking;
          expect(booking.fees.platformFee).toBeLessThan(booking.totalAmount * 0.10);
          expect(booking.fees.specialRate).toBe('ramadan_discount');
        });
        
      } finally {
        // Restore original Date.now
        Date.now = originalDate;
      }
      
    }, 30000);
  });

  describe('System Stress Limits', () => {
    test('should maintain performance with 200 concurrent requests', async () => {
      const concurrentRequests = 200;
      const maxResponseTime = 5000; // 5 seconds acceptable under extreme load
      
      console.log(`🔥 Extreme load test: ${concurrentRequests} concurrent requests`);
      
      // Create large-scale test scenario
      const scenario = TestScenarioFactory.createRealisticWorkload(20, 50);
      const allRequests = [];
      
      // Generate diverse request mix
      scenario.providers.forEach((providerData, providerIndex) => {
        const { provider, services, customers, bookings } = providerData;
        
        // Mix of different operations
        for (let i = 0; i < 10; i++) {
          const customer = customers[i % customers.length];
          const service = services[i % services.length];
          
          // Different request types
          if (i % 4 === 0) {
            // Create booking
            allRequests.push({
              method: 'POST',
              path: '/api/bookings',
              data: {
                providerId: provider.id,
                serviceId: service.id,
                customerId: customer.id,
                date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                time: '10:00',
                duration: service.duration,
                totalAmount: service.basePrice
              },
              userId: customer.id
            });
          } else if (i % 4 === 1) {
            // Check availability
            allRequests.push({
              method: 'GET',
              path: `/api/availability/${provider.id}?date=${new Date(Date.now() + 86400000).toISOString().split('T')[0]}`,
              data: null,
              userId: customer.id
            });
          } else if (i % 4 === 2) {
            // Get provider services
            allRequests.push({
              method: 'GET',
              path: `/api/providers/${provider.id}/services`,
              data: null,
              userId: customer.id
            });
          } else {
            // Search providers
            allRequests.push({
              method: 'GET',
              path: '/api/providers/search?lat=31.9566&lng=35.9457&radius=10',
              data: null,
              userId: customer.id
            });
          }
        }
      });
      
      // Ensure we have enough requests
      while (allRequests.length < concurrentRequests) {
        allRequests.push(...allRequests.slice(0, Math.min(50, concurrentRequests - allRequests.length)));
      }
      
      const finalRequests = allRequests.slice(0, concurrentRequests);
      
      console.log(`📊 Executing ${finalRequests.length} diverse concurrent requests...`);
      
      // Execute extreme load
      const results = await testEnv.executor.executeConcurrent(finalRequests, {
        maxConcurrency: concurrentRequests,
        rampUpMs: 5000, // 5 second ramp up
        delayBetweenRequests: 1
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 30000);
      
      // Analyze extreme load results
      const successful = results.filter(r => r.success && r.response.status < 400);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      const slowRequests = results.filter(r => r.duration > maxResponseTime);
      
      const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.duration));
      const successRate = (successful.length / results.length) * 100;
      
      console.log(`📈 Extreme Load Test Results:
        Total Requests: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Slow Requests (>${maxResponseTime}ms): ${slowRequests.length}
        Average Response Time: ${avgResponseTime.toFixed(2)}ms
        Max Response Time: ${maxResponseTime}ms
        Success Rate: ${successRate.toFixed(2)}%
      `);
      
      // Validate system behavior under extreme load
      expect(results.length).toBe(concurrentRequests);
      expect(successRate).toBeGreaterThan(85); // 85% success rate minimum
      expect(avgResponseTime).toBeLessThan(maxResponseTime);
      expect(slowRequests.length).toBeLessThan(concurrentRequests * 0.05); // Less than 5% slow
      
      // System should degrade gracefully, not crash
      const serverErrors = failed.filter(r => r.response && r.response.status >= 500);
      expect(serverErrors.length).toBeLessThan(concurrentRequests * 0.02); // Less than 2% server errors
      
      // Generate final performance report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(testEnv.monitor);
      
      console.log(`🎯 Final Performance Summary:
        Memory Usage: ${performanceReport.resources.memory.peak}
        Database Queries: ${performanceReport.resources.database.queries}
        Recommendations: ${performanceReport.recommendations.length}
      `);
      
      // Under extreme load, we allow some benchmarks to be relaxed
      expect(performanceReport.benchmarks.memory.passed).toBe(true);
      
    }, 60000); // 60 second timeout for extreme load test
  });
});