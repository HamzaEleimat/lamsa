/**
 * Global Test Teardown
 * Runs once after all tests complete
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Clean up test database
    await cleanupTestDatabase();
    
    // Clean up test files
    await cleanupTestFiles();
    
    // Close any open connections
    await closeConnections();
    
    console.log('✅ Global test teardown completed');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
  }
}

async function cleanupTestDatabase() {
  console.log('🗑️  Cleaning up test database...');
  
  try {
    const dbName = 'beautycort_test';
    
    // Drop test database
    await execAsync(`dropdb ${dbName} 2>/dev/null || echo "Database cleanup skipped"`);
    
    console.log('Test database cleaned up');
  } catch (error) {
    console.warn('Database cleanup warning:', error);
  }
}

async function cleanupTestFiles() {
  console.log('📁 Cleaning up test files...');
  
  try {
    // Clean up temporary test files
    await execAsync('rm -rf /tmp/beautycort-test-* 2>/dev/null || true');
    
    // Clean up test logs
    await execAsync('rm -rf test-logs/ 2>/dev/null || true');
    
    console.log('Test files cleaned up');
  } catch (error) {
    console.warn('File cleanup warning:', error);
  }
}

async function closeConnections() {
  console.log('🔌 Closing connections...');
  
  try {
    // Force close any hanging connections
    // This is handled by Jest but we can add custom cleanup here
    
    console.log('Connections closed');
  } catch (error) {
    console.warn('Connection cleanup warning:', error);
  }
}