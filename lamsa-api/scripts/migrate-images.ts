#!/usr/bin/env ts-node

/**
 * Image Migration Script
 * Migrates base64 images from database to cloud storage (AWS S3/Cloudinary)
 * Run with: npm run migrate:images
 */

import dotenv from 'dotenv';
import { imageStorageService } from '../src/services/image-storage.service';
import { supabase } from '../src/config/supabase';

// Load environment variables
dotenv.config();

interface MigrationStats {
  startTime: Date;
  endTime?: Date;
  duration?: string;
  migrated: number;
  failed: number;
  totalSize: number;
  errors: string[];
  databaseSizeBefore?: string;
  databaseSizeAfter?: string;
}

class ImageMigrationScript {
  private stats: MigrationStats = {
    startTime: new Date(),
    migrated: 0,
    failed: 0,
    totalSize: 0,
    errors: []
  };

  async run(): Promise<void> {
    console.log('🚀 BeautyCort Image Migration Script');
    console.log('====================================');
    
    try {
      // Check cloud storage configuration
      await this.checkConfiguration();
      
      // Get database size before migration
      await this.getDatabaseSize('before');
      
      // Run migration
      console.log('\n📦 Starting image migration...');
      const migrationResult = await imageStorageService.migrateBase64Images();
      
      // Update stats
      this.stats.migrated = migrationResult.migrated;
      this.stats.failed = migrationResult.failed;
      this.stats.totalSize = migrationResult.totalSize;
      this.stats.errors = migrationResult.errors;
      
      // Get database size after migration
      await this.getDatabaseSize('after');
      
      // Clean up database (optional - remove base64 columns)
      await this.promptCleanup();
      
      // Generate migration report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.stats.errors.push(`Migration failed: ${error.message}`);
    } finally {
      this.stats.endTime = new Date();
      this.stats.duration = this.calculateDuration();
      
      // Save migration log
      await this.saveMigrationLog();
    }
  }

  private async checkConfiguration(): Promise<void> {
    console.log('🔍 Checking configuration...');
    
    const hasCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && 
                            process.env.CLOUDINARY_API_KEY && 
                            process.env.CLOUDINARY_API_SECRET);
    
    const hasS3 = !!(process.env.AWS_ACCESS_KEY_ID && 
                    process.env.AWS_SECRET_ACCESS_KEY);
    
    if (!hasCloudinary && !hasS3) {
      throw new Error('No cloud storage configured. Please set up Cloudinary or AWS S3 credentials.');
    }
    
    if (hasCloudinary) {
      console.log('✅ Cloudinary configured');
    }
    
    if (hasS3) {
      console.log('✅ AWS S3 configured');
      console.log(`   Bucket: ${process.env.AWS_S3_BUCKET || 'lamsa-images'}`);
    }
    
    // Test database connection
    const { data, error } = await supabase.from('providers').select('count').limit(1);
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    console.log('✅ Database connection verified');
  }

  private async getDatabaseSize(phase: 'before' | 'after'): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('pg_database_size', {
        database_name: 'lamsa' // Replace with actual database name
      });
      
      if (!error && data) {
        const sizeInMB = (data / 1024 / 1024).toFixed(2);
        if (phase === 'before') {
          this.stats.databaseSizeBefore = `${sizeInMB} MB`;
          console.log(`📊 Database size before migration: ${sizeInMB} MB`);
        } else {
          this.stats.databaseSizeAfter = `${sizeInMB} MB`;
          console.log(`📊 Database size after migration: ${sizeInMB} MB`);
          
          if (this.stats.databaseSizeBefore) {
            const beforeSize = parseFloat(this.stats.databaseSizeBefore);
            const afterSize = parseFloat(sizeInMB);
            const reduction = beforeSize - afterSize;
            const reductionPercent = ((reduction / beforeSize) * 100).toFixed(1);
            console.log(`📉 Database size reduction: ${reduction.toFixed(2)} MB (${reductionPercent}%)`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not get database size: ${error.message}`);
    }
  }

  private async promptCleanup(): Promise<void> {
    console.log('\n🧹 Database Cleanup Options:');
    console.log('1. Keep base64 columns (recommended for rollback capability)');
    console.log('2. Remove base64 columns (maximum space savings)');
    
    // For automated script, we'll keep the columns for safety
    console.log('📝 Keeping base64 columns for rollback safety');
    console.log('   Run cleanup manually after verifying migration success');
    
    // Optionally, you could add interactive prompts here
    // const readline = require('readline');
    // const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // const answer = await new Promise(resolve => rl.question('Choose option (1 or 2): ', resolve));
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 Migration Report');
    console.log('==================');
    console.log(`✅ Successfully migrated: ${this.stats.migrated} images`);
    console.log(`❌ Failed migrations: ${this.stats.failed} images`);
    console.log(`📦 Total data migrated: ${(this.stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⏱️  Migration duration: ${this.stats.duration}`);
    
    if (this.stats.databaseSizeBefore && this.stats.databaseSizeAfter) {
      console.log(`📊 Database size before: ${this.stats.databaseSizeBefore}`);
      console.log(`📊 Database size after: ${this.stats.databaseSizeAfter}`);
    }
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    // Get cloud storage stats
    const storageStats = await imageStorageService.getStorageStats();
    console.log('\n☁️  Cloud Storage Stats:');
    console.log(`   Provider: ${storageStats.provider}`);
    console.log(`   Total images: ${storageStats.totalImages}`);
    console.log(`   Total size: ${storageStats.totalSize}`);
    console.log(`   Average size: ${storageStats.avgImageSize}`);
    
    console.log('\n🎉 Migration completed!');
    
    if (this.stats.migrated > 0) {
      console.log('\n📋 Next Steps:');
      console.log('1. Test image loading on web and mobile apps');
      console.log('2. Monitor performance improvements');
      console.log('3. Verify all images are accessible');
      console.log('4. Consider cleanup of base64 columns after verification');
    }
  }

  private calculateDuration(): string {
    if (!this.stats.endTime) return 'Unknown';
    
    const duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  private async saveMigrationLog(): Promise<void> {
    const logEntry = {
      migration_type: 'image_migration',
      started_at: this.stats.startTime.toISOString(),
      completed_at: this.stats.endTime?.toISOString(),
      duration: this.stats.duration,
      migrated_count: this.stats.migrated,
      failed_count: this.stats.failed,
      total_size_bytes: this.stats.totalSize,
      database_size_before: this.stats.databaseSizeBefore,
      database_size_after: this.stats.databaseSizeAfter,
      errors: this.stats.errors,
      success: this.stats.failed === 0
    };

    try {
      // Create migration log table if it doesn't exist
      await supabase.rpc('create_migration_log_table');
      
      // Insert log entry
      const { error } = await supabase
        .from('migration_logs')
        .insert(logEntry);
      
      if (error) {
        console.error('⚠️ Failed to save migration log:', error.message);
      } else {
        console.log('✅ Migration log saved to database');
      }
    } catch (error) {
      console.error('⚠️ Failed to save migration log:', error);
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const migration = new ImageMigrationScript();
  migration.run()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { ImageMigrationScript };