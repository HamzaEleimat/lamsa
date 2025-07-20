/**
 * Jest Setup for Stress Tests
 * Configures global test environment for stress testing
 */

// Increase Jest timeout for stress tests
jest.setTimeout(120000); // 2 minutes default

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log in tests unless --verbose flag is used
  log: process.env.JEST_VERBOSE === 'true' ? console.log : jest.fn(),
  info: process.env.JEST_VERBOSE === 'true' ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
  debug: process.env.JEST_VERBOSE === 'true' ? console.debug : jest.fn()
};

// Stress test environment variables
process.env.NODE_ENV = 'test';
process.env.STRESS_TEST_MODE = 'true';

// Default JWT secret for testing
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-stress-testing';
}

// Database configuration for stress testing
process.env.DB_POOL_MIN = process.env.DB_POOL_MIN || '5';
process.env.DB_POOL_MAX = process.env.DB_POOL_MAX || '20';
process.env.DB_TIMEOUT = process.env.DB_TIMEOUT || '10000';

// Rate limiting configuration for testing
process.env.RATE_LIMIT_BOOKING = process.env.RATE_LIMIT_BOOKING || '10';
process.env.RATE_LIMIT_AVAILABILITY = process.env.RATE_LIMIT_AVAILABILITY || '20';
process.env.RATE_LIMIT_GENERAL = process.env.RATE_LIMIT_GENERAL || '50';

// Notification system configuration
process.env.NOTIFICATION_QUEUE_BATCH_SIZE = process.env.NOTIFICATION_QUEUE_BATCH_SIZE || '50';
process.env.NOTIFICATION_QUEUE_CONCURRENCY = process.env.NOTIFICATION_QUEUE_CONCURRENCY || '10';

// Performance monitoring
global.STRESS_TEST_START_TIME = Date.now();

// Global test utilities
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Global error handling for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process during stress tests
});

// Global error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit process during stress tests
});

// Cleanup function for after tests
global.afterAll = global.afterAll || (() => {});

console.log('🧪 Stress test environment initialized');
console.log(`📊 Test started at: ${new Date(global.STRESS_TEST_START_TIME).toISOString()}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
console.log(`⚡ Stress mode: ${process.env.STRESS_TEST_MODE}`);