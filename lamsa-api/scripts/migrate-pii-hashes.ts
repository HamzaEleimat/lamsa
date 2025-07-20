#!/usr/bin/env ts-node
/**
 * @file migrate-pii-hashes.ts
 * @description Migration script to update PII hashes from SHA256 to HMAC-SHA256
 * @author BeautyCort Development Team
 * @date Created: 2025-07-20
 * @copyright BeautyCort 2025
 */

import { supabaseAdmin } from '../src/config/supabase-simple';
import { encryptionService } from '../src/services/encryption.service';
import { logger } from '../src/utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

interface MigrationResult {
  table: string;
  processed: number;
  errors: number;
  skipped: number;
}

/**
 * Migrate PII hashes for a specific table
 */
async function migrateTableHashes(
  tableName: string,
  encryptedFields: string[],
  hashFields: string[]
): Promise<MigrationResult> {
  const result: MigrationResult = {
    table: tableName,
    processed: 0,
    errors: 0,
    skipped: 0
  };

  try {
    // Get all records
    const { data: records, error } = await supabaseAdmin
      .from(tableName)
      .select('*');

    if (error || !records) {
      logger.error(`Failed to fetch ${tableName} records`, error);
      return result;
    }

    logger.info(`Found ${records.length} records in ${tableName}`);

    // Process each record
    for (const record of records) {
      try {
        const updates: any = {};
        let needsUpdate = false;

        // Check each hash field
        for (const hashField of hashFields) {
          const encryptedField = hashField.replace('_hash', '');
          
          if (encryptedFields.includes(encryptedField) && record[encryptedField]) {
            // Decrypt the original value
            const decryptedValue = encryptionService.decrypt(
              record[encryptedField],
              encryptedField
            );
            
            if (decryptedValue) {
              // Generate new HMAC-SHA256 hash
              const newHash = encryptionService.hash(decryptedValue);
              
              // Only update if hash is different
              if (record[hashField] !== newHash) {
                updates[hashField] = newHash;
                needsUpdate = true;
              }
            }
          }
        }

        if (needsUpdate) {
          // Update the record
          const { error: updateError } = await supabaseAdmin
            .from(tableName)
            .update(updates)
            .eq('id', record.id);

          if (updateError) {
            logger.error(`Failed to update ${tableName} record ${record.id}`, updateError);
            result.errors++;
          } else {
            result.processed++;
          }
        } else {
          result.skipped++;
        }
      } catch (recordError) {
        logger.error(`Error processing ${tableName} record ${record.id}`, recordError);
        result.errors++;
      }
    }

    return result;
  } catch (error) {
    logger.error(`Failed to migrate ${tableName}`, error);
    return result;
  }
}

/**
 * Main migration function
 */
async function main() {
  logger.info('Starting PII hash migration to HMAC-SHA256...');

  const results: MigrationResult[] = [];

  // Migrate users table
  logger.info('Migrating users table...');
  const userResult = await migrateTableHashes(
    'users',
    ['email', 'phone'],
    ['email_hash', 'phone_hash']
  );
  results.push(userResult);

  // Migrate providers table
  logger.info('Migrating providers table...');
  const providerResult = await migrateTableHashes(
    'providers',
    ['email', 'phone'],
    ['email_hash', 'phone_hash']
  );
  results.push(providerResult);

  // Print summary
  logger.info('\n=== Migration Summary ===');
  let totalProcessed = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  results.forEach(result => {
    logger.info(`${result.table}:`);
    logger.info(`  - Processed: ${result.processed}`);
    logger.info(`  - Errors: ${result.errors}`);
    logger.info(`  - Skipped: ${result.skipped}`);
    
    totalProcessed += result.processed;
    totalErrors += result.errors;
    totalSkipped += result.skipped;
  });

  logger.info('\nTotal:');
  logger.info(`  - Processed: ${totalProcessed}`);
  logger.info(`  - Errors: ${totalErrors}`);
  logger.info(`  - Skipped: ${totalSkipped}`);

  if (totalErrors > 0) {
    logger.warn(`\n⚠️  Migration completed with ${totalErrors} errors`);
    process.exit(1);
  } else {
    logger.info('\n✅ Migration completed successfully');
    process.exit(0);
  }
}

// Run migration
if (require.main === module) {
  main().catch(error => {
    logger.error('Migration failed', error);
    process.exit(1);
  });
}

export { migrateTableHashes };