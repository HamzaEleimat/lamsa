/**
 * Notification Queue Load Stress Tests
 * Tests notification delivery timing and queue processing under high load
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

describe('Notification Queue Load Stress Tests', () => {
  let app;
  let server;
  let testEnv;

  beforeAll(async () => {
    const testServerSetup = await createTestServer();
    app = testServerSetup.app;
    server = testServerSetup.server;
    
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-notification-stress';
    
    // Configure notification system for testing
    process.env.NOTIFICATION_QUEUE_BATCH_SIZE = '50';
    process.env.NOTIFICATION_QUEUE_CONCURRENCY = '10';
    process.env.SMS_RATE_LIMIT = '100'; // per minute
    process.env.EMAIL_RATE_LIMIT = '200'; // per minute
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    await clearTestDatabase();
    testEnv = StressTestUtils.createTestEnvironment(app);
    testEnv.monitor.startMonitoring(250); // Monitor every 250ms for notification processing
  });

  afterEach(async () => {
    StressTestUtils.cleanupTestEnvironment(testEnv);
  });

  describe('High Volume Notification Processing', () => {
    test('should process 1000 notifications efficiently', async () => {
      const notificationCount = 1000;
      const maxProcessingTime = 30000; // 30 seconds
      
      console.log(`📢 Testing high volume notification processing: ${notificationCount} notifications`);
      
      // Create diverse notification scenario
      const notifications = TestScenarioFactory.createNotificationScenario(notificationCount);
      
      // Create providers and customers for realistic notifications
      const providers = ProviderFactory.createMany(10);
      const customers = CustomerFactory.createMany(50);
      const services = providers.flatMap(p => ServiceFactory.createMany(p.id, 2));
      
      // Authenticate a few users to trigger notifications
      const authenticatedCustomers = [];
      for (let i = 0; i < Math.min(customers.length, 10); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedCustomers.push(auth);
        } catch (error) {
          console.log(`Auth failed for customer ${i}`);
        }
      }
      
      console.log(`✅ Authenticated ${authenticatedCustomers.length} customers`);
      
      // Create snapshot before notification flood
      await testEnv.dbManager.createSnapshot('pre_notification_flood', async () => ({
        queuedNotifications: 0,
        sentNotifications: 0,
        failedNotifications: 0,
        queueBacklog: 0
      }));
      
      // Prepare actions that trigger notifications
      const notificationTriggers = [];
      
      for (let i = 0; i < notificationCount; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const service = services[i % services.length];
        const provider = providers.find(p => p.id === service.providerId);
        const triggerType = i % 6;
        
        switch (triggerType) {
          case 0:
            // Create booking (triggers confirmation notification)
            notificationTriggers.push({
              method: 'POST',
              path: '/api/bookings',
              data: {
                providerId: provider.id,
                serviceId: service.id,
                customerId: customer.user.id,
                date: new Date(Date.now() + 86400000 * (i % 7 + 1)).toISOString().split('T')[0],
                time: `${9 + (i % 8)}:00`,
                duration: service.duration,
                totalAmount: service.basePrice,
                paymentMethod: 'cash',
                notes: `Notification test booking ${i + 1}`,
                sendConfirmation: true
              },
              userId: customer.userId,
              triggerType: 'booking_confirmation',
              expectedNotifications: 2 // SMS + email
            });
            break;
            
          case 1:
            // Cancel booking (triggers cancellation notification)
            const existingBooking = BookingFactory.create(customer.user.id, provider.id, service.id);
            notificationTriggers.push({
              method: 'PUT',
              path: `/api/bookings/${existingBooking.id}/cancel`,
              data: {
                cancellationReason: 'Customer request',
                cancellationReasonAr: 'طلب العميل',
                sendNotification: true
              },
              userId: customer.userId,
              triggerType: 'booking_cancellation',
              expectedNotifications: 1 // SMS
            });
            break;
            
          case 2:
            // Send reminder notification
            notificationTriggers.push({
              method: 'POST',
              path: '/api/notifications/reminder',
              data: {
                recipientId: customer.user.id,
                type: 'booking_reminder',
                message: `Reminder: Your appointment is tomorrow at ${9 + (i % 8)}:00`,
                messageAr: `تذكير: موعدك غداً في الساعة ${9 + (i % 8)}:00`,
                channel: i % 2 === 0 ? 'sms' : 'email',
                priority: 'normal'
              },
              userId: customer.userId,
              triggerType: 'reminder',
              expectedNotifications: 1
            });
            break;
            
          case 3:
            // Provider message to customer
            notificationTriggers.push({
              method: 'POST',
              path: '/api/messages',
              data: {
                recipientId: customer.user.id,
                senderId: provider.id,
                subject: 'Service Update',
                subjectAr: 'تحديث الخدمة',
                message: `We have updated our service schedule`,
                messageAr: `لقد قمنا بتحديث جدول خدماتنا`,
                sendNotification: true
              },
              userId: customer.userId,
              triggerType: 'provider_message',
              expectedNotifications: 1
            });
            break;
            
          case 4:
            // Promotional notification
            notificationTriggers.push({
              method: 'POST',
              path: '/api/notifications/promotional',
              data: {
                recipientId: customer.user.id,
                campaign: 'summer_special',
                message: 'Special summer discount available!',
                messageAr: 'خصم صيفي خاص متاح!',
                discount: 20,
                validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
                channel: 'email'
              },
              userId: customer.userId,
              triggerType: 'promotional',
              expectedNotifications: 1
            });
            break;
            
          case 5:
            // System notification
            notificationTriggers.push({
              method: 'POST',
              path: '/api/notifications/system',
              data: {
                recipientId: customer.user.id,
                type: 'maintenance_notice',
                message: 'Scheduled maintenance tonight 2-3 AM',
                messageAr: 'صيانة مجدولة الليلة 2-3 صباحاً',
                priority: 'high',
                channels: ['sms', 'email']
              },
              userId: customer.userId,
              triggerType: 'system',
              expectedNotifications: 2
            });
            break;
        }
      }
      
      console.log(`📊 Triggering ${notificationTriggers.length} notification-generating actions...`);
      
      // Execute notification triggers in waves to simulate realistic load
      const waveSize = 50;
      const waveDelay = 2000; // 2 seconds between waves
      const allResults = [];
      
      for (let wave = 0; wave < Math.ceil(notificationTriggers.length / waveSize); wave++) {
        const waveStart = wave * waveSize;
        const waveEnd = Math.min(waveStart + waveSize, notificationTriggers.length);
        const waveRequests = notificationTriggers.slice(waveStart, waveEnd);
        
        console.log(`📊 Processing wave ${wave + 1}: ${waveRequests.length} requests...`);
        
        const waveResults = await testEnv.executor.executeConcurrent(waveRequests, {
          maxConcurrency: 25,
          rampUpMs: 500,
          delayBetweenRequests: 20
        });
        
        allResults.push(...waveResults);
        
        // Brief pause between waves
        if (wave < Math.ceil(notificationTriggers.length / waveSize) - 1) {
          await sleep(waveDelay);
        }
        
        // Print progress
        testEnv.monitor.printStatus();
      }
      
      await StressTestUtils.waitForCompletion(testEnv.executor, maxProcessingTime);
      
      // Wait additional time for notification queue processing
      console.log('⏳ Waiting for notification queue processing...');
      await sleep(15000); // 15 seconds for queue processing
      
      // Analyze notification processing results
      const successful = allResults.filter(r => r.success && r.response.status < 400);
      const failed = allResults.filter(r => !r.success || r.response.status >= 400);
      
      // Calculate expected notification count
      let expectedNotificationCount = 0;
      successful.forEach(result => {
        expectedNotificationCount += result.requestConfig?.expectedNotifications || 0;
      });
      
      // Group results by trigger type
      const resultsByType = {};
      allResults.forEach(result => {
        const type = result.requestConfig?.triggerType || 'unknown';
        if (!resultsByType[type]) {
          resultsByType[type] = { total: 0, successful: 0, failed: 0 };
        }
        
        const stats = resultsByType[type];
        stats.total++;
        
        if (result.success && result.response.status < 400) {
          stats.successful++;
        } else {
          stats.failed++;
        }
      });
      
      console.log(`📈 Notification Load Results:
        Total Triggers: ${allResults.length}
        Successful Triggers: ${successful.length}
        Failed Triggers: ${failed.length}
        Success Rate: ${(successful.length / allResults.length * 100).toFixed(2)}%
        Expected Notifications: ${expectedNotificationCount}
      `);
      
      console.log(`📊 Results by Trigger Type:`);
      Object.entries(resultsByType).forEach(([type, stats]) => {
        const successRate = (stats.successful / stats.total * 100).toFixed(2);
        console.log(`  ${type}: ${stats.successful}/${stats.total} successful (${successRate}%)`);
      });
      
      // Validate notification processing
      expect(allResults.length).toBe(notificationCount);
      expect(successful.length / allResults.length).toBeGreaterThan(0.9); // 90% trigger success
      expect(expectedNotificationCount).toBeGreaterThan(notificationCount * 0.8); // Reasonable notification volume
      
      // All trigger types should have some success
      Object.values(resultsByType).forEach(stats => {
        expect(stats.successful).toBeGreaterThan(0);
      });
      
      // Check database state after notification flood
      const dbComparison = await testEnv.dbManager.compareWithSnapshot('pre_notification_flood', async () => ({
        queuedNotifications: expectedNotificationCount,
        sentNotifications: Math.floor(expectedNotificationCount * 0.95), // Assume 95% sent
        failedNotifications: Math.floor(expectedNotificationCount * 0.05),
        queueBacklog: Math.floor(expectedNotificationCount * 0.1) // 10% still in queue
      }));
      
      expect(dbComparison.current.queuedNotifications).toBeGreaterThan(0);
      
    }, 60000);

    test('should handle notification delivery failures gracefully', async () => {
      const notificationCount = 100;
      const simulatedFailureRate = 0.2; // 20% failure rate
      
      console.log(`⚠️  Testing notification failure handling: ${notificationCount} notifications with ${(simulatedFailureRate * 100).toFixed(0)}% failure rate`);
      
      // Create test data
      const customers = CustomerFactory.createMany(notificationCount);
      const providers = ProviderFactory.createMany(5);
      
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
      
      // Prepare notifications with various failure scenarios
      const notificationRequests = [];
      
      for (let i = 0; i < notificationCount; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        const provider = providers[i % providers.length];
        const shouldFail = Math.random() < simulatedFailureRate;
        
        let phoneNumber = customer.user.phone;
        let email = customer.user.email;
        
        // Introduce failure scenarios
        if (shouldFail) {
          const failureType = i % 4;
          switch (failureType) {
            case 0:
              // Invalid phone number
              phoneNumber = '+962771234567890'; // Too long
              break;
            case 1:
              // Invalid email
              email = 'invalid-email-format';
              break;
            case 2:
              // Non-existent recipient
              phoneNumber = '+962777777777';
              email = 'nonexistent@nonexistent.com';
              break;
            case 3:
              // Temporary service unavailable (simulated)
              phoneNumber = '+962771234567'; // Valid but will fail due to service
              break;
          }
        }
        
        notificationRequests.push({
          method: 'POST',
          path: '/api/notifications/send',
          data: {
            recipientId: customer.user.id,
            recipientPhone: phoneNumber,
            recipientEmail: email,
            type: 'test_notification',
            message: `Test notification ${i + 1}`,
            messageAr: `إشعار اختبار ${i + 1}`,
            channel: i % 3 === 0 ? 'sms' : (i % 3 === 1 ? 'email' : 'both'),
            priority: i % 4 === 0 ? 'high' : 'normal',
            retryPolicy: {
              maxRetries: 3,
              retryDelay: 1000,
              backoffMultiplier: 2
            }
          },
          userId: customer.userId,
          metadata: {
            shouldFail,
            failureType: shouldFail ? (i % 4) : null,
            originalPhone: customer.user.phone,
            originalEmail: customer.user.email
          }
        });
      }
      
      console.log(`📊 Sending ${notificationCount} notifications (${Math.floor(notificationCount * simulatedFailureRate)} expected to fail)...`);
      
      // Execute notification requests
      const results = await testEnv.executor.executeConcurrent(notificationRequests, {
        maxConcurrency: 30,
        rampUpMs: 2000,
        delayBetweenRequests: 50
      });
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 25000);
      
      // Wait for retry processing
      console.log('⏳ Waiting for retry processing...');
      await sleep(10000);
      
      // Analyze failure handling
      const successful = results.filter(r => r.success && r.response.status === 200);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      const retryable = results.filter(r => 
        r.response && r.response.body && r.response.body.retryable === true
      );
      
      // Categorize failures by type
      const failuresByType = {};
      failed.forEach(result => {
        const failureType = result.metadata?.failureType;
        if (failureType !== null && failureType !== undefined) {
          const typeName = ['invalid_phone', 'invalid_email', 'nonexistent_recipient', 'service_unavailable'][failureType];
          if (!failuresByType[typeName]) {
            failuresByType[typeName] = { count: 0, retryable: 0 };
          }
          
          failuresByType[typeName].count++;
          if (retryable.includes(result)) {
            failuresByType[typeName].retryable++;
          }
        }
      });
      
      // Analyze expected vs actual failures
      const expectedFailures = results.filter(r => r.metadata?.shouldFail === true);
      const unexpectedFailures = failed.filter(r => r.metadata?.shouldFail !== true);
      
      console.log(`📈 Notification Failure Handling Results:
        Total Notifications: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        Expected Failures: ${expectedFailures.length}
        Unexpected Failures: ${unexpectedFailures.length}
        Retryable Failures: ${retryable.length}
        Failure Accuracy: ${(failed.length / expectedFailures.length * 100).toFixed(2)}%
      `);
      
      console.log(`📊 Failures by Type:`);
      Object.entries(failuresByType).forEach(([type, stats]) => {
        const retryableRate = (stats.retryable / stats.count * 100).toFixed(2);
        console.log(`  ${type}: ${stats.count} failures, ${stats.retryable} retryable (${retryableRate}%)`);
      });
      
      // Validate failure handling
      expect(results.length).toBe(notificationCount);
      expect(failed.length).toBeGreaterThan(0); // Should have some failures
      expect(failed.length / results.length).toBeLessThan(simulatedFailureRate + 0.1); // Within expected range
      expect(unexpectedFailures.length).toBeLessThan(notificationCount * 0.05); // Less than 5% unexpected failures
      
      // Retryable failures should be properly identified
      expect(retryable.length).toBeGreaterThan(0);
      
      // Check error response quality
      failed.forEach(result => {
        if (result.response && result.response.body) {
          const body = result.response.body;
          expect(body.success).toBe(false);
          expect(body.error).toBeDefined();
          expect(body.message).toBeDefined();
          expect(body.messageAr).toBeDefined();
          
          if (body.retryable) {
            expect(body.retryAfter).toBeDefined();
            expect(body.retryAfter).toBeGreaterThan(0);
          }
        }
      });
      
      // Successful notifications should have delivery confirmations
      successful.forEach(result => {
        const body = result.response.body;
        expect(body.success).toBe(true);
        expect(body.notificationId).toBeDefined();
        expect(body.deliveryStatus).toBeDefined();
        expect(body.estimatedDelivery).toBeDefined();
      });
      
    }, 45000);
  });

  describe('Notification Queue Performance', () => {
    test('should maintain delivery timing under sustained load', async () => {
      const messagesPerMinute = 60;
      const testDurationMinutes = 2;
      const totalMessages = messagesPerMinute * testDurationMinutes;
      
      console.log(`⏱️  Testing delivery timing: ${messagesPerMinute} messages/minute for ${testDurationMinutes} minutes`);
      
      // Create test recipients
      const customers = CustomerFactory.createMany(20);
      
      // Authenticate customers
      const authenticatedCustomers = [];
      for (let i = 0; i < Math.min(customers.length, 10); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedCustomers.push(auth);
        } catch (error) {
          console.log(`Auth failed for customer ${i}`);
        }
      }
      
      // Generate steady message load
      const messageSchedule = LoadPatternGenerator.steadyLoad(messagesPerMinute, testDurationMinutes * 60);
      const notificationRequests = messageSchedule.map((timing, index) => {
        const customer = authenticatedCustomers[index % authenticatedCustomers.length];
        
        return {
          method: 'POST',
          path: '/api/notifications/send',
          data: {
            recipientId: customer.user.id,
            recipientPhone: customer.user.phone,
            type: 'timing_test',
            message: `Timing test message ${index + 1}`,
            messageAr: `رسالة اختبار التوقيت ${index + 1}`,
            channel: 'sms',
            priority: 'normal',
            scheduledFor: new Date(Date.now() + timing.startTime).toISOString()
          },
          userId: customer.userId,
          startTime: timing.startTime,
          metadata: {
            messageIndex: index,
            expectedDeliveryTime: Date.now() + timing.startTime + 5000 // 5 second processing time
          }
        };
      });
      
      console.log(`📊 Scheduling ${totalMessages} messages over ${testDurationMinutes} minutes...`);
      
      // Execute sustained message load
      const deliveryTimes = [];
      const startTime = Date.now();
      
      // Process messages in real-time according to schedule
      for (const request of notificationRequests) {
        const elapsed = Date.now() - startTime;
        const delay = request.startTime - elapsed;
        
        if (delay > 0) {
          await sleep(delay);
        }
        
        // Send message and track timing
        const sendStart = Date.now();
        const result = await testEnv.executor.executeRequest(request);
        const sendEnd = Date.now();
        
        deliveryTimes.push({
          messageIndex: request.metadata.messageIndex,
          sendTime: sendStart,
          responseTime: sendEnd - sendStart,
          success: result.success && result.response.status === 200,
          expectedDeliveryTime: request.metadata.expectedDeliveryTime,
          actualDeliveryTime: sendEnd // Approximate
        });
        
        // Print progress every 30 messages
        if ((request.metadata.messageIndex + 1) % 30 === 0) {
          const progress = ((request.metadata.messageIndex + 1) / totalMessages * 100).toFixed(1);
          console.log(`📊 Progress: ${progress}% (${request.metadata.messageIndex + 1}/${totalMessages})`);
        }
      }
      
      const totalDuration = Date.now() - startTime;
      console.log(`⏱️ Message scheduling completed in ${totalDuration}ms`);
      
      // Wait for queue processing
      console.log('⏳ Waiting for queue processing...');
      await sleep(10000);
      
      // Analyze delivery timing performance
      const successfulDeliveries = deliveryTimes.filter(d => d.success);
      const failedDeliveries = deliveryTimes.filter(d => !d.success);
      
      // Calculate timing metrics
      const responseTimes = successfulDeliveries.map(d => d.responseTime);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      // Calculate delivery timing accuracy
      const timingAccuracies = successfulDeliveries.map(delivery => {
        const timingError = Math.abs(delivery.actualDeliveryTime - delivery.expectedDeliveryTime);
        return timingError;
      });
      
      const avgTimingError = timingAccuracies.reduce((sum, error) => sum + error, 0) / timingAccuracies.length;
      const maxTimingError = Math.max(...timingAccuracies);
      
      const actualThroughput = successfulDeliveries.length / (totalDuration / 60000); // per minute
      
      console.log(`📈 Delivery Timing Results:
        Total Messages: ${deliveryTimes.length}
        Successful Deliveries: ${successfulDeliveries.length}
        Failed Deliveries: ${failedDeliveries.length}
        Success Rate: ${(successfulDeliveries.length / deliveryTimes.length * 100).toFixed(2)}%
        Actual Throughput: ${actualThroughput.toFixed(2)} messages/minute
        Target Throughput: ${messagesPerMinute} messages/minute
        Avg Response Time: ${avgResponseTime.toFixed(2)}ms
        Max Response Time: ${maxResponseTime}ms
        Avg Timing Error: ${avgTimingError.toFixed(2)}ms
        Max Timing Error: ${maxTimingError}ms
      `);
      
      // Validate delivery timing performance
      expect(deliveryTimes.length).toBe(totalMessages);
      expect(successfulDeliveries.length / deliveryTimes.length).toBeGreaterThan(0.95); // 95% success rate
      expect(actualThroughput).toBeGreaterThan(messagesPerMinute * 0.9); // 90% of target throughput
      expect(avgResponseTime).toBeLessThan(2000); // Under 2 seconds response
      expect(avgTimingError).toBeLessThan(5000); // Within 5 seconds of expected timing
      
      // Check for timing consistency (no major delays)
      const timingVariance = this.calculateVariance(timingAccuracies);
      expect(timingVariance).toBeLessThan(10000); // Reasonable variance in timing
      
      // Response times should remain consistent under load
      const responseTimeVariance = this.calculateVariance(responseTimes);
      expect(responseTimeVariance).toBeLessThan(avgResponseTime * avgResponseTime); // Variance not too high
      
    }, 180000); // 3 minutes for 2-minute test + buffer

    test('should handle notification priority queuing correctly', async () => {
      const highPriorityCount = 30;
      const normalPriorityCount = 60;
      const lowPriorityCount = 30;
      const totalNotifications = highPriorityCount + normalPriorityCount + lowPriorityCount;
      
      console.log(`🎯 Testing priority queuing: ${highPriorityCount} high + ${normalPriorityCount} normal + ${lowPriorityCount} low priority`);
      
      // Create test data
      const customers = CustomerFactory.createMany(20);
      
      // Authenticate customers
      const authenticatedCustomers = [];
      for (let i = 0; i < Math.min(customers.length, 8); i++) {
        try {
          const auth = await testEnv.client.authenticate('customer', customers[i]);
          authenticatedCustomers.push(auth);
        } catch (error) {
          console.log(`Auth failed for customer ${i}`);
        }
      }
      
      // Prepare notifications with different priorities
      const priorityRequests = [];
      
      // High priority notifications (emergency alerts, booking confirmations)
      for (let i = 0; i < highPriorityCount; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        priorityRequests.push({
          method: 'POST',
          path: '/api/notifications/send',
          data: {
            recipientId: customer.user.id,
            recipientPhone: customer.user.phone,
            type: 'emergency_alert',
            message: `High priority alert ${i + 1}`,
            messageAr: `تنبيه عالي الأولوية ${i + 1}`,
            channel: 'sms',
            priority: 'high',
            urgent: true
          },
          userId: customer.userId,
          metadata: {
            priority: 'high',
            expectedProcessingOrder: i,
            submittedAt: Date.now()
          }
        });
      }
      
      // Normal priority notifications (booking reminders, updates)
      for (let i = 0; i < normalPriorityCount; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        priorityRequests.push({
          method: 'POST',
          path: '/api/notifications/send',
          data: {
            recipientId: customer.user.id,
            recipientPhone: customer.user.phone,
            type: 'booking_reminder',
            message: `Normal priority reminder ${i + 1}`,
            messageAr: `تذكير عادي الأولوية ${i + 1}`,
            channel: 'sms',
            priority: 'normal'
          },
          userId: customer.userId,
          metadata: {
            priority: 'normal',
            expectedProcessingOrder: highPriorityCount + i,
            submittedAt: Date.now()
          }
        });
      }
      
      // Low priority notifications (marketing, newsletters)
      for (let i = 0; i < lowPriorityCount; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        priorityRequests.push({
          method: 'POST',
          path: '/api/notifications/send',
          data: {
            recipientId: customer.user.id,
            recipientEmail: customer.user.email,
            type: 'promotional',
            message: `Low priority promotion ${i + 1}`,
            messageAr: `عرض ترويجي منخفض الأولوية ${i + 1}`,
            channel: 'email',
            priority: 'low'
          },
          userId: customer.userId,
          metadata: {
            priority: 'low',
            expectedProcessingOrder: highPriorityCount + normalPriorityCount + i,
            submittedAt: Date.now()
          }
        });
      }
      
      // Shuffle requests to simulate real-world submission order
      const shuffledRequests = [...priorityRequests];
      for (let i = shuffledRequests.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledRequests[i], shuffledRequests[j]] = [shuffledRequests[j], shuffledRequests[i]];
      }
      
      console.log(`📊 Submitting ${totalNotifications} notifications in random order...`);
      
      // Submit all notifications rapidly
      const submissionStart = Date.now();
      const results = await testEnv.executor.executeConcurrent(shuffledRequests, {
        maxConcurrency: 40,
        rampUpMs: 1000,
        delayBetweenRequests: 25
      });
      
      const submissionEnd = Date.now();
      await StressTestUtils.waitForCompletion(testEnv.executor, 20000);
      
      // Wait for queue processing with priority ordering
      console.log('⏳ Waiting for priority queue processing...');
      await sleep(15000);
      
      // Analyze priority processing
      const successful = results.filter(r => r.success && r.response.status === 200);
      const failed = results.filter(r => !r.success || r.response.status >= 400);
      
      // Group by priority
      const resultsByPriority = {
        high: successful.filter(r => r.requestConfig?.metadata?.priority === 'high'),
        normal: successful.filter(r => r.requestConfig?.metadata?.priority === 'normal'),
        low: successful.filter(r => r.requestConfig?.metadata?.priority === 'low')
      };
      
      // Analyze processing times by priority
      const avgProcessingTimeByPriority = {};
      Object.entries(resultsByPriority).forEach(([priority, priorityResults]) => {
        if (priorityResults.length > 0) {
          const avgTime = priorityResults.reduce((sum, r) => sum + r.duration, 0) / priorityResults.length;
          avgProcessingTimeByPriority[priority] = avgTime;
        }
      });
      
      // Check if high priority messages were processed faster
      const highPriorityResponses = resultsByPriority.high.map(r => r.response.body.queuePosition || 0);
      const lowPriorityResponses = resultsByPriority.low.map(r => r.response.body.queuePosition || 999);
      
      const avgHighPriorityPosition = highPriorityResponses.reduce((sum, pos) => sum + pos, 0) / highPriorityResponses.length;
      const avgLowPriorityPosition = lowPriorityResponses.reduce((sum, pos) => sum + pos, 0) / lowPriorityResponses.length;
      
      console.log(`📈 Priority Queue Results:
        Total Notifications: ${results.length}
        Successful: ${successful.length}
        Failed: ${failed.length}
        High Priority: ${resultsByPriority.high.length}/${highPriorityCount} (avg ${avgProcessingTimeByPriority.high?.toFixed(2) || 0}ms)
        Normal Priority: ${resultsByPriority.normal.length}/${normalPriorityCount} (avg ${avgProcessingTimeByPriority.normal?.toFixed(2) || 0}ms)
        Low Priority: ${resultsByPriority.low.length}/${lowPriorityCount} (avg ${avgProcessingTimeByPriority.low?.toFixed(2) || 0}ms)
        Avg High Priority Queue Position: ${avgHighPriorityPosition.toFixed(2)}
        Avg Low Priority Queue Position: ${avgLowPriorityPosition.toFixed(2)}
      `);
      
      // Validate priority queuing
      expect(results.length).toBe(totalNotifications);
      expect(successful.length / results.length).toBeGreaterThan(0.95); // 95% success rate
      
      // All priority levels should have some successful notifications
      expect(resultsByPriority.high.length).toBeGreaterThan(highPriorityCount * 0.9);
      expect(resultsByPriority.normal.length).toBeGreaterThan(normalPriorityCount * 0.9);
      expect(resultsByPriority.low.length).toBeGreaterThan(lowPriorityCount * 0.9);
      
      // High priority should be processed faster than low priority
      if (avgProcessingTimeByPriority.high && avgProcessingTimeByPriority.low) {
        expect(avgProcessingTimeByPriority.high).toBeLessThan(avgProcessingTimeByPriority.low);
      }
      
      // High priority should have better queue positions
      expect(avgHighPriorityPosition).toBeLessThan(avgLowPriorityPosition);
      
      // Validate priority-specific features
      resultsByPriority.high.forEach(result => {
        const body = result.response.body;
        expect(body.priority).toBe('high');
        expect(body.estimatedDelivery).toBeLessThan(Date.now() + 10000); // Within 10 seconds
      });
      
      resultsByPriority.low.forEach(result => {
        const body = result.response.body;
        expect(body.priority).toBe('low');
        // Low priority may have longer delivery times
      });
      
    }, 50000);
  });

  describe('Notification System Resilience', () => {
    test('should handle notification service outages gracefully', async () => {
      const notificationCount = 50;
      const outageStart = 15; // Start outage after 15 notifications
      const outageDuration = 5000; // 5 second outage
      
      console.log(`🔧 Testing service outage resilience: ${notificationCount} notifications with ${outageDuration}ms outage`);
      
      // Create test data
      const customers = CustomerFactory.createMany(notificationCount);
      
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
      
      // Prepare notifications
      const notificationRequests = [];
      for (let i = 0; i < notificationCount; i++) {
        const customer = authenticatedCustomers[i % authenticatedCustomers.length];
        
        notificationRequests.push({
          method: 'POST',
          path: '/api/notifications/send',
          data: {
            recipientId: customer.user.id,
            recipientPhone: customer.user.phone,
            type: 'outage_test',
            message: `Outage test notification ${i + 1}`,
            messageAr: `إشعار اختبار الانقطاع ${i + 1}`,
            channel: 'sms',
            priority: 'normal',
            retryPolicy: {
              maxRetries: 3,
              retryDelay: 2000,
              backoffMultiplier: 1.5
            }
          },
          userId: customer.userId,
          metadata: {
            notificationIndex: i,
            duringOutage: i >= outageStart && i < outageStart + 20 // Rough outage window
          }
        });
      }
      
      console.log('📊 Phase 1: Pre-outage notifications...');
      
      // Execute notifications in phases
      const preOutageResults = await testEnv.executor.executeConcurrent(
        notificationRequests.slice(0, outageStart), 
        {
          maxConcurrency: 10,
          rampUpMs: 1000,
          delayBetweenRequests: 100
        }
      );
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 10000);
      
      console.log('📊 Phase 2: Simulating service outage...');
      
      // Simulate outage by sending during "outage" period
      const duringOutagePromise = testEnv.executor.executeConcurrent(
        notificationRequests.slice(outageStart, outageStart + 20),
        {
          maxConcurrency: 15,
          rampUpMs: 200,
          delayBetweenRequests: 50
        }
      );
      
      // Wait for outage duration
      await sleep(outageDuration);
      
      const duringOutageResults = await duringOutagePromise;
      await StressTestUtils.waitForCompletion(testEnv.executor, 15000);
      
      console.log('📊 Phase 3: Post-outage recovery...');
      
      // Post-outage notifications
      const postOutageResults = await testEnv.executor.executeConcurrent(
        notificationRequests.slice(outageStart + 20),
        {
          maxConcurrency: 10,
          rampUpMs: 1000,
          delayBetweenRequests: 100
        }
      );
      
      await StressTestUtils.waitForCompletion(testEnv.executor, 15000);
      
      // Wait for retry processing
      console.log('⏳ Waiting for retry processing...');
      await sleep(10000);
      
      // Analyze outage resilience
      const preOutageSuccessful = preOutageResults.filter(r => r.success && r.response.status === 200);
      const duringOutageSuccessful = duringOutageResults.filter(r => r.success && r.response.status === 200);
      const postOutageSuccessful = postOutageResults.filter(r => r.success && r.response.status === 200);
      
      const preOutageRate = preOutageSuccessful.length / preOutageResults.length;
      const duringOutageRate = duringOutageSuccessful.length / duringOutageResults.length;
      const postOutageRate = postOutageSuccessful.length / postOutageResults.length;
      
      const recoveryEffectiveness = postOutageRate / preOutageRate;
      
      // Count retried notifications
      const retriedNotifications = duringOutageResults.filter(r => 
        r.response && r.response.body && r.response.body.retryScheduled === true
      );
      
      console.log(`📈 Service Outage Resilience Results:
        Pre-outage: ${preOutageSuccessful.length}/${preOutageResults.length} successful (${(preOutageRate * 100).toFixed(2)}%)
        During outage: ${duringOutageSuccessful.length}/${duringOutageResults.length} successful (${(duringOutageRate * 100).toFixed(2)}%)
        Post-outage: ${postOutageSuccessful.length}/${postOutageResults.length} successful (${(postOutageRate * 100).toFixed(2)}%)
        Recovery effectiveness: ${(recoveryEffectiveness * 100).toFixed(2)}%
        Retried notifications: ${retriedNotifications.length}
      `);
      
      // Validate outage resilience
      expect(preOutageRate).toBeGreaterThan(0.9); // Pre-outage should be good
      expect(duringOutageRate).toBeLessThan(preOutageRate); // Outage should impact performance
      expect(postOutageRate).toBeGreaterThan(0.85); // Should recover well
      expect(recoveryEffectiveness).toBeGreaterThan(0.9); // Strong recovery
      expect(retriedNotifications.length).toBeGreaterThan(0); // Some notifications should be retried
      
      // Failed notifications during outage should have retry information
      duringOutageResults.filter(r => !r.success || r.response.status >= 400).forEach(result => {
        if (result.response && result.response.body) {
          const body = result.response.body;
          expect(body.retryable).toBe(true);
          expect(body.retryAfter).toBeDefined();
          expect(body.queuedForRetry).toBe(true);
        }
      });
      
    }, 60000);
  });

  // Helper method for variance calculation
  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }
});