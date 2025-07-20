/**
 * Integration Test Setup
 * Sets up the environment for integration tests
 */

import { testDatabase } from '../utils/database';

// Setup before all integration tests
beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...');
  
  // Initialize test database
  await testDatabase.setup();
  
  // Additional integration test setup
  process.env.NODE_ENV = 'test';
  process.env.DISABLE_RATE_LIMITING = 'true';
  process.env.MOCK_NOTIFICATIONS = 'true';
  
  console.log('✅ Integration test environment ready');
}, 60000);

// Cleanup after all integration tests
afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');
  
  // Clean up test database
  await testDatabase.cleanup();
  
  console.log('✅ Integration test environment cleaned up');
}, 30000);

// Reset database between test suites
beforeEach(async () => {
  // Reset database to clean state
  await testDatabase.reset();
});