/**
 * Test Utils Index
 * Central export for all test utilities
 */

// Database utilities
const { testDatabase } = require('./database');
const { startTestServer, stopTestServer, getTestServer, isTestServerRunning } = require('./testServer');

// Mock utilities
const MockHelpers = require('./mockHelpers');
const { mockServiceManager, createMockServices, testScenarios, mockUtils } = require('../mocks');

// Test helpers
const TestHelpers = require('./testHelpers');

// Data factories
const UserFactory = require('../factories/userFactory');
const ProviderFactory = require('../factories/providerFactory');
const ServiceFactory = require('../factories/serviceFactory');
const BookingFactory = require('../factories/bookingFactory');

/**
 * Comprehensive Test Utilities Suite
 */
class TestUtilities {
  constructor() {
    this.database = testDatabase;
    this.server = {
      start: startTestServer,
      stop: stopTestServer,
      get: getTestServer,
      isRunning: isTestServerRunning
    };
    this.mocks = MockHelpers;
    this.helpers = TestHelpers.getAllHelpers();
    this.factories = {
      user: UserFactory,
      provider: ProviderFactory,
      service: ServiceFactory,
      booking: BookingFactory
    };
  }

  /**
   * Quick setup for different test types
   */
  async setupTestEnvironment(testType = 'unit') {
    switch (testType) {
      case 'unit':
        MockHelpers.setupUnitTestMocks();
        break;
      case 'integration':
        await this.database.setup();
        MockHelpers.setupIntegrationTestMocks();
        break;
      case 'e2e':
        await this.server.start();
        await this.database.setup();
        MockHelpers.setupE2ETestMocks();
        break;
      case 'performance':
        await this.server.start();
        await this.database.setup();
        MockHelpers.setupPerformanceTestMocks();
        break;
      default:
        MockHelpers.setupUnitTestMocks();
    }
  }

  /**
   * Quick cleanup for different test types
   */
  async cleanupTestEnvironment(testType = 'unit') {
    switch (testType) {
      case 'unit':
        MockHelpers.resetAllMocks();
        break;
      case 'integration':
        await this.database.cleanup();
        MockHelpers.resetAllMocks();
        break;
      case 'e2e':
        if (this.server.isRunning()) {
          await this.server.stop();
        }
        await this.database.cleanup();
        MockHelpers.resetAllMocks();
        break;
      case 'performance':
        if (this.server.isRunning()) {
          await this.server.stop();
        }
        await this.database.cleanup();
        MockHelpers.resetAllMocks();
        break;
      default:
        MockHelpers.resetAllMocks();
    }
  }

  /**
   * Create comprehensive test data suite
   */
  createTestDataSuite(options = {}) {
    const {
      userCount = 5,
      providerCount = 3,
      servicesPerProvider = 3,
      bookingCount = 10
    } = options;

    // Create users
    const users = Array.from({ length: userCount }, () => 
      this.factories.user.create()
    );

    // Create providers
    const providers = Array.from({ length: providerCount }, () => 
      this.factories.provider.createVerified()
    );

    // Create services
    const services = [];
    providers.forEach(provider => {
      const providerServices = Array.from({ length: servicesPerProvider }, () =>
        this.factories.service.create(provider.id)
      );
      services.push(...providerServices);
    });

    // Create bookings
    const bookings = Array.from({ length: bookingCount }, (_, index) => {
      const user = users[index % users.length];
      const provider = providers[index % providers.length];
      const service = services.find(s => s.provider_id === provider.id);
      
      return this.factories.booking.create(user.id, provider.id, service.id);
    });

    // Generate tokens
    const userTokens = users.map(user => 
      this.helpers.jwt({
        id: user.id,
        type: 'customer',
        phone: user.phone
      })
    );

    const providerTokens = providers.map(provider =>
      this.helpers.jwt({
        id: provider.id,
        type: 'provider',
        phone: provider.phone
      })
    );

    return {
      users,
      providers,
      services,
      bookings,
      tokens: {
        users: userTokens,
        providers: providerTokens,
        admin: this.helpers.jwt({
          id: 'admin-test',
          type: 'admin',
          phone: '+962771111111'
        })
      }
    };
  }

  /**
   * Performance testing utilities
   */
  createPerformanceTestSuite() {
    return {
      /**
       * Run load test with configuration
       */
      runLoadTest: async (testFunction, config) => {
        const { users, requestsPerUser, timeout = 60000 } = config;
        const startTime = performance.now();
        const results = [];

        const promises = [];
        for (let u = 0; u < users; u++) {
          for (let r = 0; r < requestsPerUser; r++) {
            promises.push(
              (async () => {
                const requestStart = performance.now();
                try {
                  const result = await testFunction(u, r);
                  const requestTime = performance.now() - requestStart;
                  return { success: true, responseTime: requestTime, result };
                } catch (error) {
                  const requestTime = performance.now() - requestStart;
                  return { success: false, responseTime: requestTime, error: error.message };
                }
              })()
            );
          }
        }

        const promiseResults = await Promise.allSettled(promises);
        const endTime = performance.now();

        // Process results
        promiseResults.forEach(promiseResult => {
          if (promiseResult.status === 'fulfilled') {
            results.push(promiseResult.value);
          } else {
            results.push({ 
              success: false, 
              responseTime: 0, 
              error: promiseResult.reason?.message || 'Promise rejected' 
            });
          }
        });

        // Calculate metrics
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const responseTimes = results.map(r => r.responseTime);

        return {
          totalRequests: results.length,
          successful: successful.length,
          failed: failed.length,
          successRate: successful.length / results.length,
          totalDuration: endTime - startTime,
          performance: this.helpers.performance.calculateStats(responseTimes),
          errors: failed.map(f => f.error)
        };
      },

      /**
       * Monitor system resources during test
       */
      monitorResources: (intervalMs = 1000) => {
        const measurements = [];
        let monitoring = true;

        const monitor = setInterval(() => {
          if (!monitoring) {
            clearInterval(monitor);
            return;
          }

          measurements.push({
            timestamp: Date.now(),
            memory: this.helpers.performance.getMemoryUsage()
          });
        }, intervalMs);

        return {
          stop: () => {
            monitoring = false;
            return measurements;
          },
          getMeasurements: () => [...measurements]
        };
      }
    };
  }

  /**
   * Validation testing utilities
   */
  createValidationTestSuite() {
    const validationHelpers = this.helpers.validation;

    return {
      /**
       * Test all phone number formats
       */
      testPhoneValidation: (validationFunction) => {
        const phoneTests = validationHelpers.phoneNumberTests();
        const results = { valid: [], invalid: [] };

        phoneTests.valid.forEach(phone => {
          try {
            const result = validationFunction(phone);
            results.valid.push({ phone, result, passed: true });
          } catch (error) {
            results.valid.push({ phone, error: error.message, passed: false });
          }
        });

        phoneTests.invalid.forEach(phone => {
          try {
            const result = validationFunction(phone);
            results.invalid.push({ phone, result, passed: false }); // Should have failed
          } catch (error) {
            results.invalid.push({ phone, error: error.message, passed: true }); // Correctly failed
          }
        });

        return results;
      },

      /**
       * Test status transitions
       */
      testStatusTransitions: (transitionFunction) => {
        const statusTests = validationHelpers.statusTransitionTests();
        const results = { valid: [], invalid: [] };

        Object.entries(statusTests.valid).forEach(([fromStatus, toStatuses]) => {
          toStatuses.forEach(toStatus => {
            try {
              const result = transitionFunction(fromStatus, toStatus);
              results.valid.push({ from: fromStatus, to: toStatus, result, passed: true });
            } catch (error) {
              results.valid.push({ from: fromStatus, to: toStatus, error: error.message, passed: false });
            }
          });
        });

        Object.entries(statusTests.invalid).forEach(([fromStatus, toStatuses]) => {
          toStatuses.forEach(toStatus => {
            try {
              const result = transitionFunction(fromStatus, toStatus);
              results.invalid.push({ from: fromStatus, to: toStatus, result, passed: false }); // Should have failed
            } catch (error) {
              results.invalid.push({ from: fromStatus, to: toStatus, error: error.message, passed: true }); // Correctly failed
            }
          });
        });

        return results;
      }
    };
  }

  /**
   * Get test report
   */
  generateTestReport() {
    return {
      timestamp: new Date().toISOString(),
      database: {
        connected: this.database ? true : false,
        tablesReady: true // Would check actual database state
      },
      server: {
        running: this.server.isRunning(),
        port: process.env.PORT || 3001
      },
      mocks: {
        enabled: mockServiceManager.getConfiguration().enabledMocks,
        statistics: MockHelpers.generateTestReport()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        testType: process.env.TEST_TYPE || 'unit'
      }
    };
  }
}

// Create singleton instance
const testUtilities = new TestUtilities();

// Export individual utilities for direct access
module.exports = {
  // Main utilities class
  TestUtilities,
  testUtils: testUtilities,

  // Direct access to utilities
  testDatabase,
  MockHelpers,
  TestHelpers,

  // Server utilities
  startTestServer,
  stopTestServer,
  getTestServer,
  isTestServerRunning,

  // Mock services
  mockServiceManager,
  createMockServices,
  testScenarios,
  mockUtils,

  // Factories
  UserFactory,
  ProviderFactory,
  ServiceFactory,
  BookingFactory,

  // Quick setup functions
  setupUnitTests: () => testUtilities.setupTestEnvironment('unit'),
  setupIntegrationTests: () => testUtilities.setupTestEnvironment('integration'),
  setupE2ETests: () => testUtilities.setupTestEnvironment('e2e'),
  setupPerformanceTests: () => testUtilities.setupTestEnvironment('performance'),

  // Quick cleanup functions
  cleanupUnitTests: () => testUtilities.cleanupTestEnvironment('unit'),
  cleanupIntegrationTests: () => testUtilities.cleanupTestEnvironment('integration'),
  cleanupE2ETests: () => testUtilities.cleanupTestEnvironment('e2e'),
  cleanupPerformanceTests: () => testUtilities.cleanupTestEnvironment('performance')
};