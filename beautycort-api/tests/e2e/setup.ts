/**
 * E2E Test Setup
 * Sets up the environment for end-to-end tests
 */

import { testDatabase } from '../utils/database';
import { startTestServer, stopTestServer } from '../utils/testServer';

let testServerInstance: any;

// Setup before all E2E tests
beforeAll(async () => {
  console.log('🚀 Starting E2E test environment...');
  
  // Initialize test database
  await testDatabase.setup();
  
  // Start test server
  testServerInstance = await startTestServer();
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ E2E test environment ready');
}, 90000);

// Cleanup after all E2E tests
afterAll(async () => {
  console.log('🛑 Stopping E2E test environment...');
  
  // Stop test server
  if (testServerInstance) {
    await stopTestServer(testServerInstance);
  }
  
  // Clean up test database
  await testDatabase.cleanup();
  
  console.log('✅ E2E test environment stopped');
}, 60000);

// Reset state between test suites
beforeEach(async () => {
  // Reset database to clean state
  await testDatabase.reset();
});