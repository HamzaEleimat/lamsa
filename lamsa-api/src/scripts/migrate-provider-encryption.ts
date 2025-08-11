#!/usr/bin/env node

/**
 * Script to migrate existing provider data to encrypted format
 * This should be run once to encrypt all existing provider PII
 */

// import { encryptedDb } from '../services/encrypted-db.service';  // TODO: Fix encrypted-db service TypeScript issues
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrateProviderEncryption() {
  try {
    logger.info('Starting provider PII encryption migration...');
    
    // Check if encryption key is configured
    if (!process.env.PII_ENCRYPTION_KEY) {
      logger.error('PII_ENCRYPTION_KEY must be set before running migration');
      process.exit(1);
    }
    
    // Migrate providers table
    logger.info('Migrating providers table...');
    const { migrated, errors } = await encryptedDb.migrateUnencryptedData('providers', 100);
    
    logger.info(`Migration completed:`);
    logger.info(`- Providers migrated: ${migrated}`);
    logger.info(`- Errors encountered: ${errors}`);
    
    if (errors > 0) {
      logger.warn('Some records failed to migrate. Check logs for details.');
      process.exit(1);
    }
    
    logger.info('Provider encryption migration completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateProviderEncryption();