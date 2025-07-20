#!/usr/bin/env ts-node

/**
 * @file migrate-pii-encryption.ts
 * @description Script to migrate existing unencrypted PII data to encrypted format
 * @author BeautyCort Development Team
 * @date Created: 2025-07-20
 * @copyright BeautyCort 2025
 */

import dotenv from 'dotenv';
import { encryptedDb } from '../src/services/encrypted-db.service';
import { logger } from '../src/utils/logger';
import { PIIFields } from '../src/services/encryption.service';

// Load environment variables
dotenv.config();

interface MigrationStats {
  table: string;
  migrated: number;
  errors: number;
  duration: number;
}

async function migrateTable(tableName: keyof PIIFields): Promise<MigrationStats> {
  console.log(`\n📊 Starting migration for table: ${tableName}`);
  const startTime = Date.now();
  
  try {
    const result = await encryptedDb.migrateUnencryptedData(tableName, 100);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Completed ${tableName}: ${result.migrated} records encrypted, ${result.errors} errors`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
    
    return {
      table: tableName,
      migrated: result.migrated,
      errors: result.errors,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Migration failed for ${tableName}:`, error);
    
    return {
      table: tableName,
      migrated: 0,
      errors: 1,
      duration
    };
  }
}

async function generateEncryptionKey() {
  const { EncryptionService } = await import('../src/services/encryption.service');
  const key = EncryptionService.generateKey();
  
  console.log('\n🔐 Generated new encryption key:');
  console.log('─'.repeat(60));
  console.log(`PII_ENCRYPTION_KEY="${key}"`);
  console.log('─'.repeat(60));
  console.log('\n⚠️  Add this to your .env file before running the migration!');
  console.log('⚠️  Store this key securely - it cannot be recovered if lost!');
  console.log('⚠️  In production, use AWS KMS or similar key management service.');
}

async function checkEncryptionStatus() {
  const { db } = await import('../src/config/supabase-simple');
  
  console.log('\n📊 Checking current encryption status...');
  
  try {
    const { data, error } = await db.supabaseAdmin
      .rpc('check_pii_encryption_status');
    
    if (error) {
      console.error('Failed to check encryption status:', error);
      return;
    }
    
    console.log('\n┌─────────────┬───────────┬───────────┬─────────────┬──────────┐');
    console.log('│ Table       │ Total     │ Encrypted │ Unencrypted │ % Done   │');
    console.log('├─────────────┼───────────┼───────────┼─────────────┼──────────┤');
    
    for (const row of data) {
      console.log(
        `│ ${row.table_name.padEnd(11)} │ ${
          String(row.total_records).padStart(9)
        } │ ${
          String(row.encrypted_records).padStart(9)
        } │ ${
          String(row.unencrypted_records).padStart(11)
        } │ ${
          String(row.encryption_percentage + '%').padStart(8)
        } │`
      );
    }
    
    console.log('└─────────────┴───────────┴───────────┴─────────────┴──────────┘');
  } catch (error) {
    console.error('Error checking encryption status:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🔒 BeautyCort PII Encryption Migration Tool');
  console.log('==========================================\n');
  
  switch (command) {
    case 'generate-key':
      await generateEncryptionKey();
      break;
      
    case 'status':
      await checkEncryptionStatus();
      break;
      
    case 'migrate':
      if (!process.env.PII_ENCRYPTION_KEY) {
        console.error('❌ PII_ENCRYPTION_KEY not found in environment!');
        console.error('   Run "npm run migrate:pii generate-key" to generate one.');
        process.exit(1);
      }
      
      console.log('🚀 Starting PII encryption migration...');
      console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
      
      const tables: (keyof PIIFields)[] = ['users', 'providers', 'bookings', 'reviews', 'payments'];
      const stats: MigrationStats[] = [];
      
      // Check status before migration
      await checkEncryptionStatus();
      
      // Migrate each table
      for (const table of tables) {
        const stat = await migrateTable(table);
        stats.push(stat);
      }
      
      // Summary
      console.log('\n📊 Migration Summary');
      console.log('===================');
      
      const totalMigrated = stats.reduce((sum, s) => sum + s.migrated, 0);
      const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0);
      const totalDuration = stats.reduce((sum, s) => sum + s.duration, 0);
      
      console.log(`✅ Total records encrypted: ${totalMigrated}`);
      console.log(`❌ Total errors: ${totalErrors}`);
      console.log(`⏱️  Total duration: ${(totalDuration / 1000).toFixed(2)} seconds`);
      
      // Check status after migration
      console.log('\n📊 Final encryption status:');
      await checkEncryptionStatus();
      
      if (totalErrors > 0) {
        console.log('\n⚠️  Migration completed with errors. Check logs for details.');
        process.exit(1);
      } else {
        console.log('\n✅ Migration completed successfully!');
      }
      break;
      
    case 'rollback':
      console.error('❌ Rollback not implemented!');
      console.error('   Decryption should only be done through the application.');
      process.exit(1);
      break;
      
    default:
      console.log('Usage: npm run migrate:pii <command>');
      console.log('\nCommands:');
      console.log('  generate-key  Generate a new encryption key');
      console.log('  status        Check current encryption status');
      console.log('  migrate       Encrypt all unencrypted PII data');
      console.log('\nExamples:');
      console.log('  npm run migrate:pii generate-key');
      console.log('  npm run migrate:pii status');
      console.log('  npm run migrate:pii migrate');
      process.exit(1);
  }
}

// Run the migration
main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});