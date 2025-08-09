/**
 * Global Test Setup
 * Configures the testing environment for all test types
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
config({ path: resolve(__dirname, '../.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Suppress console logs during tests (unless debugging)
if (!process.env.DEBUG_TESTS) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

// Set default test timeout
jest.setTimeout(30000);

// Global test utilities
global.testConfig = {
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  dbUrl: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/beautycort_test',
  jwtSecret: process.env.JWT_SECRET || 'test-secret-key',
  defaultTimeout: 30000,
  longTimeout: 60000,
  shortTimeout: 10000
};

// Mock external services by default
jest.mock('../src/config/supabase-simple', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      signInWithOtp: jest.fn(),
      getUser: jest.fn()
    },
    rpc: jest.fn()
  }
}));

// Mock notification services
jest.mock('../src/services/notification.service', () => ({
  notificationService: {
    sendNotification: jest.fn(),
    getUserPreferences: jest.fn(),
    updateUserPreferences: jest.fn()
  }
}));

// Mock Redis for caching
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    flushall: jest.fn(),
    // Add event handler methods
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    // Add additional Redis methods that might be used
    quit: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    setex: jest.fn(),
    multi: jest.fn(() => ({
      exec: jest.fn()
    }))
  }))
}));

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Extend Jest matchers with custom matchers
expect.extend({
  toBeValidJWT(received) {
    const jwtPattern = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    const pass = jwtPattern.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid JWT token`,
      pass
    };
  },
  
  toBeValidBookingStatus(received) {
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    const pass = validStatuses.includes(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid booking status`,
      pass
    };
  },
  
  toBeValidPhoneNumber(received) {
    const jordanPhonePattern = /^(\+962|962|07|7)[0-9]{8,9}$/;
    const pass = jordanPhonePattern.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid Jordanian phone number`,
      pass
    };
  }
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJWT(): R;
      toBeValidBookingStatus(): R;
      toBeValidPhoneNumber(): R;
    }
  }
  
  var testConfig: {
    apiUrl: string;
    dbUrl: string;
    jwtSecret: string;
    defaultTimeout: number;
    longTimeout: number;
    shortTimeout: number;
  };
}

export {};