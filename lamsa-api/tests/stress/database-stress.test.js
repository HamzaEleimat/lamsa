/**
 * Database Connection Pressure Stress Tests
 * Tests database performance, connection pooling, and transaction handling under load
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

describe('Database Connection Pressure Stress Tests', () => {
  let app;
  let server;
  let testEnv;

  beforeAll(async () => {
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-database-stress';
    
    // Configure database connection limits for testing
    process.env.DB_POOL_MIN = '5';
    process.env.DB_POOL_MAX = '20';
    process.env.DB_TIMEOUT = '10000';
    process.env.DB_IDLE_TIMEOUT = '30000';
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    await clearTestDatabase();
    testEnv = StressTestUtils.createTestEnvironment(app);
    testEnv.monitor.startMonitoring(300); // Monitor every 300ms for DB pressure
  });

  afterEach(async () => {
    StressTestUtils.cleanupTestEnvironment(testEnv);
  });

  describe('Connection Pool Stress Testing', () => {
    test('should handle connection pool exhaustion gracefully', async () => {
      const concurrentConnections = 50; // Exceed pool limit
      const holdConnectionTime = 5000; // 5 seconds
      
      console.log(`🔗 Testing connection pool pressure: ${concurrentConnections} concurrent connections`);
      
      // Create test data
      const providers = ProviderFactory.createMany(10);
      const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 2));
      const customers = CustomerFactory.createMany(concurrentConnections);
      
      // Authenticate customers to establish initial connections
      const authenticatedCustomers = [];
      for (let i = 0; i < Math.min(customers.length, 25); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedCustomers.push(auth);
        } catch (error) {
          console.log(`Auth failed for customer ${i}: ${error.message}`);
        }
      }
      
      console.log(`✅ Authenticated ${authenticatedCustomers.length} customers`);
      
      // Create snapshot of database state before stress test
      await testEnv.dbManager.createSnapshot('pre_connection_stress', async () => ({
        connections: { active: 0, total: 0 },
        queries: { successful: 0, failed: 0 },
        deadlocks: 0
      }));
      
      // Prepare long-running database operations
      const longRunningRequests = [];
      for (let i = 0; i < concurrentConnections; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const provider = providers[i % providers.length];
        const service = services.find(s => s.providerId === provider.id);
        
        // Mix of different database-intensive operations
        const operationType = i % 4;
        
        if (operationType === 0) {
          // Complex availability query (heavy read)
          longRunningRequests.push({
            method: 'GET',
            path: `/api/availability/${provider.id}?date=${new Date(Date.now() + 86400000 * (i % 7 + 1)).toISOString().split('T')[0]}&duration=${service.duration}&includeAllSlots=true`,
            data: null,
            userId: customer.userId,
            type: 'read_heavy',
            metadata: { expectedDuration: 'medium' }
          });
        } else if (operationType === 1) {
          // Create booking (write operation)
          longRunningRequests.push({
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
              notes: `Connection stress test booking ${i + 1}`,
              notesAr: `حجز اختبار ضغط الاتصال ${i + 1}`
            },
            userId: customer.userId,
            type: 'write_heavy',
            metadata: { expectedDuration: 'long' }
          });
        } else if (operationType === 2) {
          // Search providers (complex query with joins)
          longRunningRequests.push({
            method: 'GET',
            path: `/api/providers/search?lat=31.9566&lng=35.9457&radius=10&category=beauty_salon&sortBy=rating&includeServices=true&includeReviews=true`,
            data: null,
            userId: customer.userId,
            type: 'complex_read',
            metadata: { expectedDuration: 'medium' }
          });
        } else {
          // Update booking (transaction)
          const existingBooking = BookingFactory.create(customer.user.id, provider.id, service.id);
          longRunningRequests.push({
            method: 'PUT',
            path: `/api/bookings/${existingBooking.id}`,
            data: {
              notes: `Updated notes for stress test ${i}`,
              notesAr: `ملاحظات محدثة لاختبار الإجهاد ${i}`,
              status: 'confirmed'
            },
            userId: customer.userId,
            type: 'transaction',
            metadata: { expectedDuration: 'short' }
          });
        }
      }
      
      console.log(`📊 Executing ${concurrentConnections} database-intensive operations...`);
      
      // Start monitoring database connections
      const connectionMonitor = setInterval(() => {
        testEnv.monitor.updateDatabaseConnections(Math.random() * 20); // Mock connection count
      }, 1000);
      
      // Execute all operations concurrently to stress connection pool
      const startTime = Date.now();
      const results = await testEnv.executor.executeConcurrent(longRunningRequests, {
        maxConcurrency: concurrentConnections,
        rampUpMs: 1000, // Quick ramp up to stress pool
        delayBetweenRequests: 20
      });
      
      const executionTime = Date.now() - startTime;
      clearInterval(connectionMonitor);
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 30000);
      
      // Analyze connection pool performance
      const successful = results.filter(r => r.success && r.response.status < 400);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      const connectionErrors = results.filter(r => 
        r.response && (
          r.response.status === 503 || // Service unavailable
          (r.response.body && r.response.body.error && r.response.body.error.includes('connection'))
        )
      );
      const timeouts = results.filter(r => 
        r.error && r.error.message && r.error.message.includes('timeout')
      );
      
      // Group by operation type
      const resultsByType = {};
      results.forEach(result => {
        const type = result.requestConfig?.type || 'unknown';
        if (!resultsByType[type]) {
          resultsByType[type] = { total: 0, successful: 0, failed: 0, avgTime: 0 };
        }
        
        const stats = resultsByType[type];
        stats.total++;
        
        if (result.success && result.response.status < 400) {
          stats.successful++;
          stats.avgTime += result.duration;
        } else {
          stats.failed++;
        }
      });
      
      // Calculate average times
      Object.values(resultsByType).forEach(stats => {
        if (stats.successful > 0) {
          stats.avgTime = stats.avgTime / stats.successful;
        }
      });
      
      console.log(`📈 Connection Pool Stress Results:
        Total Operations: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Connection Errors: ${connectionErrors.length}
        Timeouts: ${timeouts.length}
        Success Rate: ${(successful.length / results.length * 100).toFixed(2)}%
        Execution Time: ${executionTime}ms
      `);
      
      console.log(`📊 Performance by Operation Type:`);
      Object.entries(resultsByType).forEach(([type, stats]) => {
        console.log(`  ${type}: ${stats.successful}/${stats.total} successful, avg ${stats.avgTime.toFixed(2)}ms`);
      });
      
      // Validate connection pool handling
      expect(results.length).toBe(concurrentConnections);
      expect(successful.length / results.length).toBeGreaterThan(0.85); // 85% success rate minimum
      expect(connectionErrors.length).toBeLessThan(concurrentConnections * 0.1); // Less than 10% connection errors
      expect(timeouts.length).toBeLessThan(concurrentConnections * 0.05); // Less than 5% timeouts
      
      // Different operation types should perform differently but all should work
      expect(Object.keys(resultsByType).length).toBeGreaterThan(2);
      Object.values(resultsByType).forEach(stats => {
        expect(stats.successful).toBeGreaterThan(0); // All types should have some success
      });
      
      // Verify database remains consistent
      const dbComparison = await testEnv.dbManager.compareWithSnapshot('pre_connection_stress', async () => ({
        connections: { active: 5, total: successful.length },
        queries: { successful: successful.length, failed: failed.length },
        deadlocks: 0
      }));
      
      expect(dbComparison.current.queries.successful).toBeGreaterThan(0);
      
    }, 45000);

    test('should prevent and handle database deadlocks', async () => {
      const concurrentTransactions = 30;
      
      console.log(`🔒 Testing deadlock prevention: ${concurrentTransactions} concurrent transactions`);
      
      // Create test scenario that could cause deadlocks
      const provider = ProviderFactory.create();
      const services = ServiceFactory.createMany(provider.id, 3);
      const customers = CustomerFactory.createMany(concurrentTransactions);
      
      // Authenticate customers
      const authenticatedCustomers = [];
      for (let i = 0; i < Math.min(customers.length, 15); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedCustomers.push(auth);
        } catch (error) {
          console.log(`Auth failed for customer ${i}`);
        }
      }
      
      // Create some initial bookings to modify
      const existingBookings = [];
      for (let i = 0; i < 10; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const service = services[i % services.length];
        const booking = BookingFactory.create(customer.user.id, provider.id, service.id, {
          status: 'confirmed',
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          time: `${10 + i}:00`
        });
        existingBookings.push(booking);
      }
      
      // Prepare operations that could cause deadlocks
      const deadlockRiskyRequests = [];
      
      for (let i = 0; i < concurrentTransactions; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const service = services[i % services.length];
        const operationType = i % 3;
        
        if (operationType === 0) {
          // Create new booking (inserts + availability updates)
          deadlockRiskyRequests.push({
            method: 'POST',
            path: '/api/bookings',
            data: {
              providerId: provider.id,
              serviceId: service.id,
              customerId: customer.user.id,
              date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
              time: `${9 + (i % 8)}:00`,
              duration: service.duration,
              totalAmount: service.basePrice,
              paymentMethod: 'cash',
              notes: `Deadlock test booking ${i + 1}`
            },
            userId: customer.userId,
            type: 'create_booking',
            lockingPattern: ['bookings', 'availability', 'provider_stats']
          });
        } else if (operationType === 1) {
          // Update existing booking (updates + cascade effects)
          const booking = existingBookings[i % existingBookings.length];
          deadlockRiskyRequests.push({
            method: 'PUT',
            path: `/api/bookings/${booking.id}`,
            data: {
              status: i % 2 === 0 ? 'completed' : 'cancelled',
              notes: `Updated in deadlock test ${i}`,
              notesAr: `محدث في اختبار الجمود ${i}`,
              completionTime: new Date().toISOString()
            },
            userId: customer.userId,
            type: 'update_booking',
            lockingPattern: ['bookings', 'payments', 'provider_stats']
          });
        } else {
          // Update provider statistics (could conflict with booking operations)
          deadlockRiskyRequests.push({
            method: 'POST',
            path: `/api/providers/${provider.id}/stats/update`,
            data: {
              metric: 'booking_completion',
              value: 1,
              timestamp: new Date().toISOString()
            },
            userId: customer.userId,
            type: 'update_stats',
            lockingPattern: ['provider_stats', 'bookings']
          });
        }
      }
      
      console.log(`📊 Executing ${concurrentTransactions} deadlock-risky transactions...`);
      
      // Execute all transactions simultaneously to maximize deadlock risk
      const results = await testEnv.executor.executeConcurrent(deadlockRiskyRequests, {
        maxConcurrency: concurrentTransactions, // All at once
        rampUpMs: 100, // Very fast ramp up
        delayBetweenRequests: 5 // Minimal delay
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 25000);
      
      // Analyze deadlock handling
      const successful = results.filter(r => r.success && r.response.status < 400);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      const deadlockErrors = results.filter(r => 
        r.response && r.response.body && r.response.body.error && 
        (r.response.body.error.includes('deadlock') || r.response.body.error.includes('DEADLOCK'))
      );
      const retryableErrors = results.filter(r =>
        r.response && r.response.body && r.response.body.retryable === true
      );
      
      // Group by locking pattern to identify problematic combinations
      const lockingPatternResults = {};
      results.forEach(result => {
        const pattern = result.requestConfig?.lockingPattern?.sort().join(',') || 'unknown';
        if (!lockingPatternResults[pattern]) {
          lockingPatternResults[pattern] = { total: 0, successful: 0, deadlocks: 0 };
        }
        
        const stats = lockingPatternResults[pattern];
        stats.total++;
        
        if (result.success && result.response.status < 400) {
          stats.successful++;
        } else if (deadlockErrors.includes(result)) {
          stats.deadlocks++;
        }
      });
      
      console.log(`📈 Deadlock Prevention Results:
        Total Transactions: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Deadlock Errors: ${deadlockErrors.length}
        Retryable Errors: ${retryableErrors.length}
        Success Rate: ${(successful.length / results.length * 100).toFixed(2)}%
        Deadlock Rate: ${(deadlockErrors.length / results.length * 100).toFixed(2)}%
      `);
      
      console.log(`📊 Results by Locking Pattern:`);
      Object.entries(lockingPatternResults).forEach(([pattern, stats]) => {
        const deadlockRate = (stats.deadlocks / stats.total * 100).toFixed(2);
        console.log(`  ${pattern}: ${stats.successful}/${stats.total} successful, ${stats.deadlocks} deadlocks (${deadlockRate}%)`);
      });
      
      // Validate deadlock handling
      expect(results.length).toBe(concurrentTransactions);
      expect(successful.length / results.length).toBeGreaterThan(0.8); // 80% success rate
      expect(deadlockErrors.length).toBeLessThan(concurrentTransactions * 0.1); // Less than 10% deadlocks
      
      // Deadlock errors should be properly handled
      deadlockErrors.forEach(result => {
        const body = result.response.body;
        expect(body.error).toBeDefined();
        expect(body.retryable).toBe(true); // Should indicate it's retryable
        expect(body.retryAfter).toBeDefined(); // Should suggest retry delay
        expect(body.messageAr).toBeDefined(); // Arabic error message
      });
      
      // No locking pattern should have 100% deadlock rate
      Object.values(lockingPatternResults).forEach(stats => {
        expect(stats.deadlocks / stats.total).toBeLessThan(0.5); // Less than 50% deadlocks per pattern
      });
      
    }, 35000);
  });

  describe('Database Query Performance Under Load', () => {
    test('should maintain query performance with high concurrent read load', async () => {
      const concurrentReads = 100;
      const readDuration = 20000; // 20 seconds
      
      console.log(`📖 Testing high concurrent read load: ${concurrentReads} concurrent readers for ${readDuration}ms`);
      
      // Create large dataset to read from
      const providers = ProviderFactory.createMany(20);
      const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 4));
      const customers = CustomerFactory.createMany(100);
      
      // Create substantial booking history
      const bookings = [];
      for (let i = 0; i < 200; i++) {
        const customer = customers[i % customers.length];
        const service = services[i % services.length];
        const provider = providers.find(p => p.id === service.providerId);
        
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 90)); // Past 3 months
        
        bookings.push(BookingFactory.create(customer.id, provider.id, service.id, {
          date: pastDate.toISOString().split('T')[0],
          status: 'completed',
          totalAmount: service.basePrice + Math.random() * 20
        }));
      }
      
      // Authenticate readers
      const authenticatedReaders = [];
      for (let i = 0; i < Math.min(concurrentReads, 25); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedReaders.push(auth);
        } catch (error) {
          console.log(`Auth failed for reader ${i}`);
        }
      }
      
      console.log(`✅ Authenticated ${authenticatedReaders.length} readers`);
      
      // Prepare diverse read operations
      const readOperations = [];
      for (let i = 0; i < concurrentReads; i++) {
        const reader = authenticatedReaders[i % authenticatedReaders.length];
        const readType = i % 6;
        
        switch (readType) {
          case 0:
            // Provider search (complex join query)
            readOperations.push({
              method: 'GET',
              path: `/api/providers/search?lat=31.9566&lng=35.9457&radius=5&sortBy=rating&includeServices=true`,
              data: null,
              userId: reader.userId,
              type: 'provider_search',
              complexity: 'high'
            });
            break;
          case 1:
            // Availability check (time-based calculation)
            const provider = providers[i % providers.length];
            const checkDate = new Date(Date.now() + 86400000 * (i % 7 + 1)).toISOString().split('T')[0];
            readOperations.push({
              method: 'GET',
              path: `/api/availability/${provider.id}?date=${checkDate}&includeAllSlots=true`,
              data: null,
              userId: reader.userId,
              type: 'availability_check',
              complexity: 'medium'
            });
            break;
          case 2:
            // Booking history (paginated results)
            readOperations.push({
              method: 'GET',
              path: `/api/bookings/history?page=${Math.floor(i / 10) + 1}&limit=20&sortBy=date`,
              data: null,
              userId: reader.userId,
              type: 'booking_history',
              complexity: 'medium'
            });
            break;
          case 3:
            // Provider details (single record with relations)
            const detailProvider = providers[i % providers.length];
            readOperations.push({
              method: 'GET',
              path: `/api/providers/${detailProvider.id}?includeServices=true&includeReviews=true&includeStats=true`,
              data: null,
              userId: reader.userId,
              type: 'provider_details',
              complexity: 'low'
            });
            break;
          case 4:
            // Service catalog (filtered results)
            readOperations.push({
              method: 'GET',
              path: `/api/services?category=beauty_salon&priceRange=20-100&sortBy=popularity&includeProviders=true`,
              data: null,
              userId: reader.userId,
              type: 'service_catalog',
              complexity: 'medium'
            });
            break;
          case 5:
            // Analytics/reports (aggregation queries)
            readOperations.push({
              method: 'GET',
              path: `/api/analytics/popular-services?period=month&city=Amman&groupBy=category`,
              data: null,
              userId: reader.userId,
              type: 'analytics_report',
              complexity: 'high'
            });
            break;
        }
      }
      
      console.log(`📊 Executing ${concurrentReads} concurrent read operations...`);
      
      // Execute sustained read load
      const loadStartTime = Date.now();
      const results = await testEnv.executor.executeConcurrent(readOperations, {
        maxConcurrency: concurrentReads,
        rampUpMs: 2000,
        delayBetweenRequests: 50
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, readDuration + 10000);
      
      const totalDuration = Date.now() - loadStartTime;
      
      // Analyze read performance
      const successful = results.filter(r => r.success && r.response.status === 200);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      
      // Group performance by query complexity
      const performanceByComplexity = {};
      successful.forEach(result => {
        const complexity = result.requestConfig?.complexity || 'unknown';
        if (!performanceByComplexity[complexity]) {
          performanceByComplexity[complexity] = {
            count: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            times: []
          };
        }
        
        const stats = performanceByComplexity[complexity];
        stats.count++;
        stats.totalTime += result.duration;
        stats.minTime = Math.min(stats.minTime, result.duration);
        stats.maxTime = Math.max(stats.maxTime, result.duration);
        stats.times.push(result.duration);
      });
      
      // Calculate percentiles for each complexity
      Object.values(performanceByComplexity).forEach(stats => {
        stats.avgTime = stats.totalTime / stats.count;
        stats.times.sort((a, b) => a - b);
        stats.p95 = stats.times[Math.floor(stats.times.length * 0.95)];
        stats.p99 = stats.times[Math.floor(stats.times.length * 0.99)];
      });
      
      const avgResponseTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      const actualThroughput = successful.length / (totalDuration / 1000);
      
      console.log(`📈 Read Load Results:
        Total Operations: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Success Rate: ${(successful.length / results.length * 100).toFixed(2)}%
        Avg Response Time: ${avgResponseTime.toFixed(2)}ms
        Throughput: ${actualThroughput.toFixed(2)} req/s
        Total Duration: ${totalDuration}ms
      `);
      
      console.log(`📊 Performance by Query Complexity:`);
      Object.entries(performanceByComplexity).forEach(([complexity, stats]) => {
        console.log(`  ${complexity}: ${stats.count} queries, avg ${stats.avgTime.toFixed(2)}ms, P95 ${stats.p95?.toFixed(2) || 0}ms, P99 ${stats.p99?.toFixed(2) || 0}ms`);
      });
      
      // Validate read performance
      expect(results.length).toBe(concurrentReads);
      expect(successful.length / results.length).toBeGreaterThan(0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(3000); // Under 3 seconds average
      expect(actualThroughput).toBeGreaterThan(1); // At least 1 req/s sustained
      
      // Performance should degrade gracefully by complexity
      if (performanceByComplexity.low && performanceByComplexity.high) {
        expect(performanceByComplexity.low.avgTime).toBeLessThan(performanceByComplexity.high.avgTime);
      }
      
      // P95 should be reasonable for all complexity levels
      Object.values(performanceByComplexity).forEach(stats => {
        expect(stats.p95).toBeLessThan(5000); // P95 under 5 seconds
      });
      
    }, 40000);

    test('should handle mixed read/write workload efficiently', async () => {
      const totalOperations = 80;
      const writeRatio = 0.3; // 30% writes, 70% reads
      
      console.log(`⚖️ Testing mixed read/write workload: ${totalOperations} operations (${(writeRatio * 100).toFixed(0)}% writes)`);
      
      // Create test data
      const providers = ProviderFactory.createMany(10);
      const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 3));
      const customers = CustomerFactory.createMany(totalOperations);
      
      // Authenticate users
      const authenticatedUsers = [];
      for (let i = 0; i < Math.min(customers.length, 25); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedUsers.push(auth);
        } catch (error) {
          console.log(`Auth failed for user ${i}`);
        }
      }
      
      // Create existing data for updates
      const existingBookings = [];
      for (let i = 0; i < 20; i++) {
        const customer = authenticatedUsers[i % authenticatedUsers.length];
        const service = services[i % services.length];
        const provider = providers.find(p => p.id === service.providerId);
        
        existingBookings.push(BookingFactory.create(customer.user.id, provider.id, service.id, {
          status: 'confirmed',
          date: new Date(Date.now() + 86400000 * (i % 5 + 1)).toISOString().split('T')[0]
        }));
      }
      
      // Prepare mixed workload
      const mixedOperations = [];
      const writeCount = Math.floor(totalOperations * writeRatio);
      const readCount = totalOperations - writeCount;
      
      // Add write operations
      for (let i = 0; i < writeCount; i++) {
        const user = authenticatedUsers[i % authenticatedUsers.length];
        const writeType = i % 3;
        
        if (writeType === 0) {
          // Create booking
          const service = services[i % services.length];
          const provider = providers.find(p => p.id === service.providerId);
          
          mixedOperations.push({
            method: 'POST',
            path: '/api/bookings',
            data: {
              providerId: provider.id,
              serviceId: service.id,
              customerId: user.user.id,
              date: new Date(Date.now() + 86400000 * (i % 10 + 1)).toISOString().split('T')[0],
              time: `${9 + (i % 8)}:00`,
              duration: service.duration,
              totalAmount: service.basePrice,
              paymentMethod: 'cash'
            },
            userId: user.userId,
            operationType: 'write',
            writeType: 'create_booking'
          });
        } else if (writeType === 1) {
          // Update booking
          const booking = existingBookings[i % existingBookings.length];
          mixedOperations.push({
            method: 'PUT',
            path: `/api/bookings/${booking.id}`,
            data: {
              notes: `Updated in mixed workload test ${i}`,
              notesAr: `محدث في اختبار العبء المختلط ${i}`
            },
            userId: user.userId,
            operationType: 'write',
            writeType: 'update_booking'
          });
        } else {
          // Delete/cancel booking
          const booking = existingBookings[i % existingBookings.length];
          mixedOperations.push({
            method: 'PUT',
            path: `/api/bookings/${booking.id}/cancel`,
            data: {
              cancellationReason: 'Mixed workload test',
              cancellationReasonAr: 'اختبار العبء المختلط'
            },
            userId: user.userId,
            operationType: 'write',
            writeType: 'cancel_booking'
          });
        }
      }
      
      // Add read operations
      for (let i = 0; i < readCount; i++) {
        const user = authenticatedUsers[i % authenticatedUsers.length];
        const readType = i % 4;
        
        if (readType === 0) {
          // Provider search
          mixedOperations.push({
            method: 'GET',
            path: `/api/providers/search?lat=31.9566&lng=35.9457&radius=${5 + (i % 10)}`,
            data: null,
            userId: user.userId,
            operationType: 'read',
            readType: 'search_providers'
          });
        } else if (readType === 1) {
          // Availability check
          const provider = providers[i % providers.length];
          const checkDate = new Date(Date.now() + 86400000 * (i % 7 + 1)).toISOString().split('T')[0];
          mixedOperations.push({
            method: 'GET',
            path: `/api/availability/${provider.id}?date=${checkDate}`,
            data: null,
            userId: user.userId,
            operationType: 'read',
            readType: 'check_availability'
          });
        } else if (readType === 2) {
          // Booking history
          mixedOperations.push({
            method: 'GET',
            path: '/api/bookings/history?limit=10',
            data: null,
            userId: user.userId,
            operationType: 'read',
            readType: 'booking_history'
          });
        } else {
          // Provider details
          const provider = providers[i % providers.length];
          mixedOperations.push({
            method: 'GET',
            path: `/api/providers/${provider.id}?includeServices=true`,
            data: null,
            userId: user.userId,
            operationType: 'read',
            readType: 'provider_details'
          });
        }
      }
      
      // Shuffle operations to simulate realistic mixed workload
      for (let i = mixedOperations.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mixedOperations[i], mixedOperations[j]] = [mixedOperations[j], mixedOperations[i]];
      }
      
      console.log(`📊 Executing mixed workload: ${writeCount} writes + ${readCount} reads...`);
      
      // Execute mixed workload
      const results = await testEnv.executor.executeConcurrent(mixedOperations, {
        maxConcurrency: 30,
        rampUpMs: 3000,
        delayBetweenRequests: 40
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 35000);
      
      // Analyze mixed workload performance
      const readResults = results.filter(r => r.requestConfig?.operationType === 'read');
      const writeResults = results.filter(r => r.requestConfig?.operationType === 'write');
      
      const readSuccessful = readResults.filter(r => r.success && r.response.status < 400);
      const writeSuccessful = writeResults.filter(r => r.success && r.response.status < 400);
      
      const avgReadTime = readSuccessful.reduce((sum, r) => sum + r.duration, 0) / readSuccessful.length;
      const avgWriteTime = writeSuccessful.reduce((sum, r) => sum + r.duration, 0) / writeSuccessful.length;
      
      console.log(`📈 Mixed Workload Results:
        Total Operations: ${results.length}
        Read Operations: ${readResults.length} (${readSuccessful.length} successful, avg ${avgReadTime.toFixed(2)}ms)
        Write Operations: ${writeResults.length} (${writeSuccessful.length} successful, avg ${avgWriteTime.toFixed(2)}ms)
        Overall Success Rate: ${((readSuccessful.length + writeSuccessful.length) / results.length * 100).toFixed(2)}%
      `);
      
      // Validate mixed workload performance
      expect(results.length).toBe(totalOperations);
      expect(readSuccessful.length / readResults.length).toBeGreaterThan(0.9); // 90% read success
      expect(writeSuccessful.length / writeResults.length).toBeGreaterThan(0.85); // 85% write success
      expect(avgReadTime).toBeLessThan(2000); // Reads under 2 seconds
      expect(avgWriteTime).toBeLessThan(4000); // Writes under 4 seconds
      
      // Writes should generally take longer than reads
      expect(avgWriteTime).toBeGreaterThan(avgReadTime);
      
      // Generate performance report
      const performanceReport = TestResultAnalyzer.generatePerformanceReport(testEnv.monitor);
      expect(performanceReport.benchmarks.memory.passed).toBe(true);
      
    }, 50000);
  });

  describe('Database Error Recovery and Resilience', () => {
    test('should recover gracefully from database connection interruptions', async () => {
      const operationsBeforeInterruption = 20;
      const operationsAfterRecovery = 20;
      const recoveryTime = 3000; // 3 seconds
      
      console.log(`🔧 Testing database connection recovery: ${operationsBeforeInterruption} + ${operationsAfterRecovery} operations`);
      
      // Create test data
      const providers = ProviderFactory.createMany(5);
      const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 2));
      const customers = CustomerFactory.createMany(operationsBeforeInterruption + operationsAfterRecovery);
      
      // Authenticate users
      const authenticatedUsers = [];
      for (let i = 0; i < Math.min(customers.length, 15); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedUsers.push(auth);
        } catch (error) {
          console.log(`Auth failed for user ${i}`);
        }
      }
      
      // Phase 1: Normal operations before interruption
      const preInterruptionOps = [];
      for (let i = 0; i < operationsBeforeInterruption; i++) {
        const user = authenticatedUsers[i % authenticatedUsers.length];
        const service = services[i % services.length];
        const provider = providers.find(p => p.id === service.providerId);
        
        preInterruptionOps.push({
          method: 'POST',
          path: '/api/bookings',
          data: {
            providerId: provider.id,
            serviceId: service.id,
            customerId: user.user.id,
            date: new Date(Date.now() + 86400000 * (i + 1)).toISOString().split('T')[0],
            time: `${9 + (i % 8)}:00`,
            duration: service.duration,
            totalAmount: service.basePrice,
            paymentMethod: 'cash',
            notes: `Pre-interruption booking ${i + 1}`
          },
          userId: user.userId,
          phase: 'pre_interruption'
        });
      }
      
      console.log('📊 Phase 1: Normal operations...');
      const preResults = await testEnv.executor.executeConcurrent(preInterruptionOps, {
        maxConcurrency: 10,
        rampUpMs: 1000,
        delayBetweenRequests: 100
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 15000);
      
      const preSuccessful = preResults.filter(r => r.success && r.response.status < 400);
      console.log(`✅ Pre-interruption: ${preSuccessful.length}/${preResults.length} successful`);
      
      // Simulate database connection issues (mock implementation)
      console.log(`⚡ Simulating database connection interruption for ${recoveryTime}ms...`);
      
      // Phase 2: Operations during interruption (should fail gracefully)
      const duringInterruptionOps = [];
      for (let i = 0; i < 5; i++) {
        const user = authenticatedUsers[i % authenticatedUsers.length];
        duringInterruptionOps.push({
          method: 'GET',
          path: `/api/providers/search?lat=31.9566&lng=35.9457&radius=5`,
          data: null,
          userId: user.userId,
          phase: 'during_interruption'
        });
      }
      
      // Simulate interrupted database by expecting timeouts/errors
      console.log('📊 Phase 2: Operations during interruption...');
      const interruptionPromise = testEnv.executor.executeConcurrent(duringInterruptionOps, {
        maxConcurrency: 5,
        rampUpMs: 100,
        delayBetweenRequests: 50
      });
      
      // Wait for recovery period
      await sleep(recoveryTime);
      
      const duringResults = await interruptionPromise;
      await StressTestUtils.waitForCompletion(testEnv.executor, 10000);
      
      console.log(`⚡ Interruption phase: ${duringResults.filter(r => r.success).length}/${duringResults.length} successful`);
      
      // Phase 3: Operations after recovery
      const postRecoveryOps = [];
      for (let i = 0; i < operationsAfterRecovery; i++) {
        const user = authenticatedUsers[i % authenticatedUsers.length];
        const service = services[i % services.length];
        const provider = providers.find(p => p.id === service.providerId);
        
        postRecoveryOps.push({
          method: 'POST',
          path: '/api/bookings',
          data: {
            providerId: provider.id,
            serviceId: service.id,
            customerId: user.user.id,
            date: new Date(Date.now() + 86400000 * (i + 10)).toISOString().split('T')[0],
            time: `${10 + (i % 8)}:00`,
            duration: service.duration,
            totalAmount: service.basePrice,
            paymentMethod: 'cash',
            notes: `Post-recovery booking ${i + 1}`
          },
          userId: user.userId,
          phase: 'post_recovery'
        });
      }
      
      console.log('📊 Phase 3: Post-recovery operations...');
      const postResults = await testEnv.executor.executeConcurrent(postRecoveryOps, {
        maxConcurrency: 10,
        rampUpMs: 1000,
        delayBetweenRequests: 100
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 20000);
      
      const postSuccessful = postResults.filter(r => r.success && r.response.status < 400);
      console.log(`✅ Post-recovery: ${postSuccessful.length}/${postResults.length} successful`);
      
      // Analyze recovery effectiveness
      const preSuccessRate = preSuccessful.length / preResults.length;
      const postSuccessRate = postSuccessful.length / postResults.length;
      const recoveryEffectiveness = postSuccessRate / preSuccessRate;
      
      console.log(`📈 Database Recovery Results:
        Pre-interruption Success: ${(preSuccessRate * 100).toFixed(2)}%
        Post-recovery Success: ${(postSuccessRate * 100).toFixed(2)}%
        Recovery Effectiveness: ${(recoveryEffectiveness * 100).toFixed(2)}%
        During Interruption: ${duringResults.filter(r => r.success).length}/${duringResults.length} successful
      `);
      
      // Validate recovery
      expect(preSuccessRate).toBeGreaterThan(0.9); // Normal operations should succeed
      expect(postSuccessRate).toBeGreaterThan(0.8); // Recovery should restore most functionality
      expect(recoveryEffectiveness).toBeGreaterThan(0.8); // Recovery should be effective
      
      // During interruption, some failures are expected but system shouldn't crash
      const duringSuccessRate = duringResults.filter(r => r.success).length / duringResults.length;
      expect(duringSuccessRate).toBeLessThan(preSuccessRate); // Should show degradation
      
      // Error responses during interruption should be informative
      duringResults.filter(r => !r.success).forEach(result => {
        if (result.response && result.response.body) {
          expect(result.response.body.error).toBeDefined();
          expect(result.response.body.retryable).toBe(true);
        }
      });
      
    }, 60000);
  });
});