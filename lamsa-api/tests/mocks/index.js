/**
 * Mock Services Index
 * Central configuration and management for all mock services
 */

const { mockPaymentService } = require('./paymentService.mock');
const { mockSMSService } = require('./smsService.mock');
const { mockEmailService } = require('./emailService.mock');

/**
 * Mock Service Manager
 * Manages all mock services and provides centralized control
 */
class MockServiceManager {
  constructor() {
    this.services = {
      payment: mockPaymentService,
      sms: mockSMSService,
      email: mockEmailService
    };
    
    this.isTestMode = process.env.NODE_ENV === 'test';
    this.enabledMocks = new Set();
  }

  /**
   * Enable specific mock service
   */
  enableMock(serviceName) {
    if (this.services[serviceName]) {
      this.enabledMocks.add(serviceName);
    } else {
      throw new Error(`Unknown mock service: ${serviceName}`);
    }
  }

  /**
   * Disable specific mock service
   */
  disableMock(serviceName) {
    this.enabledMocks.delete(serviceName);
  }

  /**
   * Enable all mock services
   */
  enableAllMocks() {
    Object.keys(this.services).forEach(serviceName => {
      this.enabledMocks.add(serviceName);
    });
  }

  /**
   * Disable all mock services
   */
  disableAllMocks() {
    this.enabledMocks.clear();
  }

  /**
   * Check if mock service is enabled
   */
  isMockEnabled(serviceName) {
    return this.isTestMode && this.enabledMocks.has(serviceName);
  }

  /**
   * Get mock service instance
   */
  getMockService(serviceName) {
    if (!this.isMockEnabled(serviceName)) {
      throw new Error(`Mock service ${serviceName} is not enabled`);
    }
    return this.services[serviceName];
  }

  /**
   * Reset all mock services
   */
  resetAllMocks() {
    Object.values(this.services).forEach(service => {
      if (service.reset) {
        service.reset();
      }
    });
  }

  /**
   * Set test scenario for all services
   */
  setGlobalScenario(scenarioName) {
    Object.values(this.services).forEach(service => {
      if (service.scenarios && service.scenarios[scenarioName]) {
        service.scenarios[scenarioName]();
      }
    });
  }

  /**
   * Get statistics from all mock services
   */
  getAllStats() {
    const stats = {};
    
    Object.entries(this.services).forEach(([serviceName, service]) => {
      if (this.isMockEnabled(serviceName)) {
        if (service.getDeliveryStats) {
          stats[serviceName] = service.getDeliveryStats();
        } else if (service.getEmailStats) {
          stats[serviceName] = service.getEmailStats();
        } else if (service.getAllPayments) {
          stats[serviceName] = {
            totalPayments: service.getAllPayments().length
          };
        }
      }
    });
    
    return stats;
  }

  /**
   * Configure mock services for specific test types
   */
  configureForTestType(testType) {
    switch (testType) {
      case 'unit':
        this.enableAllMocks();
        this.setGlobalScenario('success');
        break;
        
      case 'integration':
        this.enableAllMocks();
        this.setGlobalScenario('normal');
        break;
        
      case 'e2e':
        this.enableAllMocks();
        this.setGlobalScenario('normal');
        break;
        
      case 'performance':
        this.enableAllMocks();
        this.setGlobalScenario('highDelivery');
        // Reduce latency for performance tests
        this.services.payment.setLatency(10);
        this.services.sms.setLatency(10);
        this.services.email.setLatency(10);
        break;
        
      case 'stress':
        this.enableAllMocks();
        this.setGlobalScenario('intermittent');
        break;
        
      case 'failure':
        this.enableAllMocks();
        this.setGlobalScenario('failure');
        break;
        
      default:
        this.enableAllMocks();
        this.setGlobalScenario('normal');
    }
  }

  /**
   * Get mock service configuration
   */
  getConfiguration() {
    return {
      isTestMode: this.isTestMode,
      enabledMocks: Array.from(this.enabledMocks),
      services: Object.keys(this.services)
    };
  }
}

// Create singleton instance
const mockServiceManager = new MockServiceManager();

// Auto-enable all mocks in test environment
if (process.env.NODE_ENV === 'test') {
  mockServiceManager.enableAllMocks();
  
  // Set default scenario based on test type
  const testType = process.env.TEST_TYPE || 'normal';
  mockServiceManager.configureForTestType(testType);
}

/**
 * Mock service factory functions for easy access
 */
const createMockServices = {
  /**
   * Create payment service mock
   */
  payment: () => {
    if (mockServiceManager.isMockEnabled('payment')) {
      return mockServiceManager.getMockService('payment');
    }
    throw new Error('Payment mock service not enabled');
  },

  /**
   * Create SMS service mock
   */
  sms: () => {
    if (mockServiceManager.isMockEnabled('sms')) {
      return mockServiceManager.getMockService('sms');
    }
    throw new Error('SMS mock service not enabled');
  },

  /**
   * Create email service mock
   */
  email: () => {
    if (mockServiceManager.isMockEnabled('email')) {
      return mockServiceManager.getMockService('email');
    }
    throw new Error('Email mock service not enabled');
  }
};

/**
 * Test scenario configurations
 */
const testScenarios = {
  // Normal operation with realistic failure rates
  normal: () => {
    mockServiceManager.setGlobalScenario('normal');
  },

  // High success rates for critical tests
  reliable: () => {
    mockServiceManager.setGlobalScenario('highDelivery');
  },

  // Network issues simulation
  networkIssues: () => {
    mockServiceManager.services.payment.scenarios.slowNetwork();
    mockServiceManager.services.sms.scenarios.poorNetwork();
    mockServiceManager.services.email.scenarios.serviceIssues();
  },

  // Service outages
  outage: () => {
    mockServiceManager.services.payment.scenarios.failure();
    mockServiceManager.services.sms.scenarios.outage();
    mockServiceManager.services.email.scenarios.serviceIssues();
  },

  // Intermittent failures
  unstable: () => {
    mockServiceManager.services.payment.scenarios.intermittent();
    mockServiceManager.services.sms.scenarios.poorNetwork();
    mockServiceManager.services.email.scenarios.highBounce();
  },

  // Reset all to defaults
  reset: () => {
    mockServiceManager.setGlobalScenario('reset');
  }
};

/**
 * Utility functions for testing
 */
const mockUtils = {
  /**
   * Wait for mock operations to complete
   */
  async waitForMockOperations(timeoutMs = 5000) {
    return new Promise(resolve => {
      setTimeout(resolve, timeoutMs);
    });
  },

  /**
   * Verify mock service calls
   */
  verifyServiceCalls(serviceName, expectedCalls) {
    const service = mockServiceManager.getMockService(serviceName);
    let actualCalls = 0;

    switch (serviceName) {
      case 'payment':
        actualCalls = service.getAllPayments().length;
        break;
      case 'sms':
        actualCalls = service.getAllMessages().length;
        break;
      case 'email':
        actualCalls = service.getAllEmails().length;
        break;
    }

    return actualCalls >= expectedCalls;
  },

  /**
   * Get service call history
   */
  getServiceHistory(serviceName) {
    const service = mockServiceManager.getMockService(serviceName);

    switch (serviceName) {
      case 'payment':
        return service.getAllPayments();
      case 'sms':
        return service.getAllMessages();
      case 'email':
        return service.getAllEmails();
      default:
        return [];
    }
  },

  /**
   * Clear service history
   */
  clearServiceHistory(serviceName) {
    const service = mockServiceManager.getMockService(serviceName);
    if (service.reset) {
      service.reset();
    }
  }
};

module.exports = {
  mockServiceManager,
  createMockServices,
  testScenarios,
  mockUtils,
  
  // Direct service exports for convenience
  mockPaymentService,
  mockSMSService,
  mockEmailService
};