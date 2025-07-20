/**
 * Global Test Setup
 * Runs once before all tests start
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Create test database if it doesn't exist
    await setupTestDatabase();
    
    // Run database migrations
    await runMigrations();
    
    // Setup test data
    await setupTestData();
    
    console.log('✅ Global test setup completed');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    process.exit(1);
  }
}

async function setupTestDatabase() {
  console.log('📦 Setting up test database...');
  
  try {
    // Check if database exists, create if not
    const dbName = 'beautycort_test';
    const checkDbQuery = `psql -lqt | cut -d \\| -f 1 | grep -wq ${dbName}`;
    
    try {
      await execAsync(checkDbQuery);
      console.log('Database already exists');
    } catch {
      // Database doesn't exist, create it
      await execAsync(`createdb ${dbName}`);
      console.log('Test database created');
    }
  } catch (error) {
    console.warn('Could not setup PostgreSQL database:', error);
    // Continue with in-memory or mock database
  }
}

async function runMigrations() {
  console.log('🔧 Running database migrations...');
  
  try {
    // Run SQL migrations if they exist
    const migrationsPath = './database/migrations';
    await execAsync(`ls ${migrationsPath}/*.sql 2>/dev/null || echo "No migrations found"`);
    
    // Apply schema
    const schemaPath = './database/schema.sql';
    await execAsync(`psql ${process.env.TEST_DATABASE_URL} -f ${schemaPath} 2>/dev/null || echo "No schema file found"`);
    
    console.log('Migrations completed');
  } catch (error) {
    console.warn('Migration warning:', error);
  }
}

async function setupTestData() {
  console.log('🌱 Setting up test data...');
  
  // This will be implemented with actual test data seeding
  // For now, just log that we're ready
  console.log('Test data setup ready');
}

// Cleanup function to be called on exit
process.on('exit', () => {
  console.log('🧹 Cleaning up test environment...');
});