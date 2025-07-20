/**
 * Mock Helper Utilities
 * Provides helper functions for setting up and managing mocks in tests
 */

const { mockServiceManager, testScenarios, mockUtils } = require('../mocks');

/**
 * Test setup helpers for different test types
 */
class MockHelpers {
  /**
   * Setup mocks for unit tests
   */
  static setupUnitTestMocks() {
    mockServiceManager.configureForTestType('unit');
    testScenarios.reliable();
  }

  /**
   * Setup mocks for integration tests
   */
  static setupIntegrationTestMocks() {
    mockServiceManager.configureForTestType('integration');
    testScenarios.normal();
  }

  /**
   * Setup mocks for end-to-end tests
   */
  static setupE2ETestMocks() {
    mockServiceManager.configureForTestType('e2e');
    testScenarios.normal();
  }

  /**
   * Setup mocks for performance tests
   */
  static setupPerformanceTestMocks() {
    mockServiceManager.configureForTestType('performance');
    testScenarios.reliable();
  }

  /**
   * Setup mocks for failure scenario tests
   */
  static setupFailureTestMocks() {
    mockServiceManager.configureForTestType('failure');
    testScenarios.outage();
  }

  /**
   * Reset all mocks to clean state
   */
  static resetAllMocks() {
    mockServiceManager.resetAllMocks();
    testScenarios.reset();
  }

  /**
   * Create booking notification test scenario
   */
  static async createBookingNotificationScenario(bookingData) {
    const smsService = mockServiceManager.getMockService('sms');
    const emailService = mockServiceManager.getMockService('email');

    // Simulate booking creation notifications
    const smsResult = await smsService.sendBookingNotification(
      bookingData.userPhone,
      bookingData,
      'booking_created'
    );

    const emailResult = await emailService.sendBookingNotification(
      bookingData,
      'booking_created'
    );

    return {
      sms: smsResult,
      email: emailResult
    };
  }

  /**
   * Create payment processing test scenario
   */
  static async createPaymentScenario(amount, paymentMethod, shouldFail = false) {
    const paymentService = mockServiceManager.getMockService('payment');

    if (shouldFail) {
      paymentService.setFailureRate(1);
    } else {
      paymentService.setFailureRate(0);
    }

    try {
      const result = await paymentService.processPayment({
        amount,
        method: paymentMethod,
        currency: 'JOD'
      });

      return { success: true, payment: result };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Simulate network issues for all services
   */
  static simulateNetworkIssues() {
    testScenarios.networkIssues();
  }

  /**
   * Simulate service outages
   */
  static simulateServiceOutages() {
    testScenarios.outage();
  }

  /**
   * Simulate intermittent failures
   */
  static simulateIntermittentFailures() {
    testScenarios.unstable();
  }

  /**
   * Verify booking flow notifications were sent
   */
  static verifyBookingNotifications(bookingData) {
    const smsService = mockServiceManager.getMockService('sms');
    const emailService = mockServiceManager.getMockService('email');

    // Check SMS notifications
    const smsMessages = smsService.getMessagesByRecipient(bookingData.userPhone);
    const bookingSMS = smsMessages.find(msg => 
      msg.metadata.bookingId === bookingData.id
    );

    // Check email notifications
    const emails = emailService.getEmailsByRecipient(bookingData.userEmail);
    const bookingEmail = emails.find(email => 
      email.metadata.bookingId === bookingData.id
    );

    return {
      smsNotificationSent: !!bookingSMS,
      emailNotificationSent: !!bookingEmail,
      smsDelivered: bookingSMS?.status === 'delivered',
      emailDelivered: bookingEmail?.status === 'delivered'
    };
  }

  /**
   * Verify payment processing
   */
  static verifyPaymentProcessing(bookingData) {
    const paymentService = mockServiceManager.getMockService('payment');
    const payments = paymentService.getAllPayments();

    const bookingPayment = payments.find(payment => 
      payment.metadata.bookingId === bookingData.id
    );

    return {
      paymentProcessed: !!bookingPayment,
      paymentAmount: bookingPayment?.amount,
      paymentStatus: bookingPayment?.status,
      paymentMethod: bookingPayment?.paymentMethod
    };
  }

  /**
   * Get comprehensive test statistics
   */
  static getTestStatistics() {
    const stats = mockServiceManager.getAllStats();
    
    return {
      services: stats,
      configuration: mockServiceManager.getConfiguration(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Assert service call expectations
   */
  static assertServiceCalls(expectations) {
    const results = {};

    Object.entries(expectations).forEach(([serviceName, expectedCount]) => {
      const actualCalls = mockUtils.verifyServiceCalls(serviceName, expectedCount);
      results[serviceName] = {
        expected: expectedCount,
        met: actualCalls
      };
    });

    return results;
  }

  /**
   * Create comprehensive booking test data with mock responses
   */
  static createBookingTestData() {
    return {
      booking: {
        id: 'test-booking-123',
        userId: 'test-user-456',
        providerId: 'test-provider-789',
        serviceId: 'test-service-101',
        userPhone: '+962781234567',
        userEmail: 'test@example.com',
        userName: 'Test User',
        providerName: 'Test Beauty Salon',
        serviceName: 'Hair Cut',
        bookingDate: '2024-07-25',
        startTime: '14:30',
        amount: 25.00,
        paymentMethod: 'cash',
        status: 'pending'
      },
      
      expectations: {
        sms: 1, // Booking creation SMS
        email: 1, // Booking creation email
        payment: 0 // No payment for cash bookings
      }
    };
  }

  /**
   * Create payment booking test data
   */
  static createPaymentBookingTestData() {
    return {
      booking: {
        id: 'test-booking-payment-123',
        userId: 'test-user-456',
        providerId: 'test-provider-789',
        serviceId: 'test-service-premium-101',
        userPhone: '+962781234567',
        userEmail: 'test@example.com',
        userName: 'Test User',
        providerName: 'Premium Beauty Salon',
        serviceName: 'Premium Package',
        bookingDate: '2024-07-25',
        startTime: '14:30',
        amount: 150.00,
        paymentMethod: 'online',
        status: 'pending'
      },
      
      expectations: {
        sms: 1, // Booking creation SMS
        email: 1, // Booking creation email
        payment: 1 // Online payment required
      }
    };
  }

  /**
   * Create bulk operation test data
   */
  static createBulkOperationTestData(count = 5) {
    const bookings = [];
    
    for (let i = 0; i < count; i++) {
      bookings.push({
        id: `bulk-booking-${i}`,
        userId: `user-${i}`,
        userPhone: `+96277${String(i).padStart(7, '0')}`,
        userEmail: `user${i}@test.com`,
        userName: `Test User ${i}`,
        providerName: 'Bulk Test Salon',
        serviceName: 'Test Service',
        bookingDate: '2024-07-25',
        startTime: `${10 + i}:00`,
        amount: 25.00,
        status: 'pending'
      });
    }

    return {
      bookings,
      expectations: {
        sms: count, // One SMS per booking
        email: count, // One email per booking
        payment: 0 // Cash bookings
      }
    };
  }

  /**
   * Wait for async mock operations to complete
   */
  static async waitForMockOperations(timeoutMs = 1000) {
    return mockUtils.waitForMockOperations(timeoutMs);
  }

  /**
   * Create failure scenario test
   */
  static async createFailureScenarioTest(testFunction, expectedFailures) {
    // Setup failure scenario
    this.simulateServiceOutages();

    const results = {
      errors: [],
      successes: 0,
      failures: 0
    };

    try {
      await testFunction();
      results.successes++;
    } catch (error) {
      results.errors.push(error);
      results.failures++;
    }

    // Verify expected failures occurred
    const actualFailures = results.failures;
    const expectedFailureCount = expectedFailures.length;

    return {
      ...results,
      expectedFailures: expectedFailures,
      actualFailures: actualFailures,
      failureExpectationMet: actualFailures >= expectedFailureCount
    };
  }

  /**
   * Generate test report from mock services
   */
  static generateTestReport() {
    const smsService = mockServiceManager.getMockService('sms');
    const emailService = mockServiceManager.getMockService('email');
    const paymentService = mockServiceManager.getMockService('payment');

    const report = {
      timestamp: new Date().toISOString(),
      services: {
        sms: {
          stats: smsService.getDeliveryStats(),
          messages: smsService.getAllMessages().length,
          byType: {
            booking_notification: smsService.getMessagesByType('booking_notification').length,
            otp: smsService.getMessagesByType('otp').length
          }
        },
        email: {
          stats: emailService.getEmailStats(),
          emails: emailService.getAllEmails().length,
          byType: {
            booking_notification: emailService.getEmailsByType('booking_notification').length,
            welcome: emailService.getEmailsByType('welcome').length,
            invoice: emailService.getEmailsByType('invoice').length
          }
        },
        payment: {
          payments: paymentService.getAllPayments().length,
          totalAmount: paymentService.getAllPayments().reduce((sum, p) => sum + p.amount, 0),
          byMethod: paymentService.getAllPayments().reduce((acc, p) => {
            acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + 1;
            return acc;
          }, {})
        }
      },
      configuration: mockServiceManager.getConfiguration()
    };

    return report;
  }
}

module.exports = MockHelpers;