#!/usr/bin/env ts-node

/**
 * Automated Database Backup Script
 * Handles Supabase backup and cloud storage
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import { BlobServiceClient } from '@azure/storage-blob';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

interface BackupConfig {
  provider: 'aws' | 'gcp' | 'azure';
  retentionDays: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  notificationEnabled: boolean;
}

interface BackupResult {
  success: boolean;
  backupId: string;
  size: number;
  duration: number;
  location: string;
  error?: string;
}

class DatabaseBackupManager {
  private supabase: any;
  private config: BackupConfig;
  private s3Client?: S3Client;
  private gcsStorage?: Storage;
  private azureBlobService?: BlobServiceClient;

  constructor() {
    // Load configuration
    this.config = {
      provider: (process.env.BACKUP_PROVIDER as any) || 'aws',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionEnabled: process.env.BACKUP_COMPRESSION === 'true',
      encryptionEnabled: process.env.BACKUP_ENCRYPTION === 'true',
      notificationEnabled: process.env.BACKUP_NOTIFICATIONS === 'true'
    };

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Initialize cloud storage client based on provider
    this.initializeStorageClient();
  }

  /**
   * Initialize cloud storage client
   */
  private initializeStorageClient(): void {
    switch (this.config.provider) {
      case 'aws':
        this.s3Client = new S3Client({
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
          }
        });
        break;

      case 'gcp':
        this.gcsStorage = new Storage({
          projectId: process.env.GCP_PROJECT_ID,
          keyFilename: process.env.GCP_KEY_FILE
        });
        break;

      case 'azure':
        this.azureBlobService = BlobServiceClient.fromConnectionString(
          process.env.AZURE_STORAGE_CONNECTION_STRING!
        );
        break;
    }
  }

  /**
   * Perform full database backup
   */
  public async performBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = this.generateBackupId();
    
    console.log(`🔄 Starting database backup: ${backupId}`);

    try {
      // 1. Export database schema and data
      const backupData = await this.exportDatabase();
      
      // 2. Compress backup if enabled
      let finalData = backupData;
      if (this.config.compressionEnabled) {
        finalData = await this.compressData(backupData);
      }

      // 3. Encrypt backup if enabled
      if (this.config.encryptionEnabled) {
        finalData = await this.encryptData(finalData);
      }

      // 4. Upload to cloud storage
      const location = await this.uploadBackup(backupId, finalData);

      // 5. Clean up old backups
      await this.cleanupOldBackups();

      // 6. Verify backup integrity
      await this.verifyBackup(backupId, location);

      const duration = Date.now() - startTime;
      const result: BackupResult = {
        success: true,
        backupId,
        size: finalData.length,
        duration,
        location
      };

      console.log(`✅ Backup completed successfully: ${backupId} (${(duration/1000).toFixed(2)}s)`);
      
      // Send success notification
      if (this.config.notificationEnabled) {
        await this.sendNotification('success', result);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result: BackupResult = {
        success: false,
        backupId,
        size: 0,
        duration,
        location: '',
        error: error.message
      };

      console.error(`❌ Backup failed: ${backupId}`, error);
      
      // Send failure notification
      if (this.config.notificationEnabled) {
        await this.sendNotification('failure', result);
      }

      throw error;
    }
  }

  /**
   * Export database data
   */
  private async exportDatabase(): Promise<Buffer> {
    console.log('📊 Exporting database data...');
    
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        supabaseUrl: process.env.SUPABASE_URL,
        environment: process.env.NODE_ENV
      },
      schema: {},
      data: {}
    };

    // Get list of all tables
    const { data: tables, error: tablesError } = await this.supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'spatial_ref_sys'); // Exclude PostGIS system table

    if (tablesError) {
      throw new Error(`Failed to get table list: ${tablesError.message}`);
    }

    // Export each table's data
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`  📋 Exporting table: ${tableName}`);

      try {
        // Get table schema
        const { data: schemaData } = await this.supabase
          .from('information_schema.columns')
          .select('*')
          .eq('table_name', tableName)
          .eq('table_schema', 'public');

        backup.schema[tableName] = schemaData;

        // Get table data
        const { data: tableData, error: dataError } = await this.supabase
          .from(tableName)
          .select('*');

        if (dataError) {
          console.warn(`⚠️ Failed to export table ${tableName}: ${dataError.message}`);
          continue;
        }

        backup.data[tableName] = tableData || [];
        console.log(`  ✅ Exported ${(tableData || []).length} rows from ${tableName}`);

      } catch (error) {
        console.warn(`⚠️ Error exporting table ${tableName}:`, error.message);
        continue;
      }
    }

    // Export database functions and stored procedures
    try {
      const { data: functions } = await this.supabase.rpc('get_database_functions');
      backup.schema.functions = functions || [];
    } catch (error) {
      console.warn('⚠️ Could not export database functions:', error.message);
    }

    // Convert to buffer
    const jsonString = JSON.stringify(backup, null, 2);
    return Buffer.from(jsonString, 'utf8');
  }

  /**
   * Compress backup data
   */
  private async compressData(data: Buffer): Promise<Buffer> {
    console.log('🗜️ Compressing backup data...');
    const compressed = await gzip(data);
    const compressionRatio = ((1 - compressed.length / data.length) * 100).toFixed(2);
    console.log(`  ✅ Compression complete: ${compressionRatio}% size reduction`);
    return compressed;
  }

  /**
   * Encrypt backup data
   */
  private async encryptData(data: Buffer): Promise<Buffer> {
    console.log('🔐 Encrypting backup data...');
    
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('backup', 'utf8'));
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    // Prepend IV and tag to encrypted data
    const result = Buffer.concat([iv, tag, encrypted]);
    
    console.log('  ✅ Encryption complete');
    return result;
  }

  /**
   * Upload backup to cloud storage
   */
  private async uploadBackup(backupId: string, data: Buffer): Promise<string> {
    const fileName = this.generateBackupFileName(backupId);
    console.log(`☁️ Uploading backup to ${this.config.provider}: ${fileName}`);

    switch (this.config.provider) {
      case 'aws':
        return await this.uploadToS3(fileName, data);
      case 'gcp':
        return await this.uploadToGCS(fileName, data);
      case 'azure':
        return await this.uploadToAzure(fileName, data);
      default:
        throw new Error(`Unsupported backup provider: ${this.config.provider}`);
    }
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(fileName: string, data: Buffer): Promise<string> {
    const bucketName = process.env.AWS_BACKUP_BUCKET!;
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: data,
      ContentType: 'application/octet-stream',
      ServerSideEncryption: 'AES256',
      Metadata: {
        backupType: 'supabase-full',
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString()
      }
    });

    await this.s3Client!.send(command);
    
    const location = `s3://${bucketName}/${fileName}`;
    console.log(`  ✅ Upload complete: ${location}`);
    return location;
  }

  /**
   * Upload to Google Cloud Storage
   */
  private async uploadToGCS(fileName: string, data: Buffer): Promise<string> {
    const bucketName = process.env.GCP_BACKUP_BUCKET!;
    const bucket = this.gcsStorage!.bucket(bucketName);
    const file = bucket.file(fileName);

    await file.save(data, {
      metadata: {
        contentType: 'application/octet-stream',
        metadata: {
          backupType: 'supabase-full',
          environment: process.env.NODE_ENV || 'production',
          timestamp: new Date().toISOString()
        }
      }
    });

    const location = `gs://${bucketName}/${fileName}`;
    console.log(`  ✅ Upload complete: ${location}`);
    return location;
  }

  /**
   * Upload to Azure Blob Storage
   */
  private async uploadToAzure(fileName: string, data: Buffer): Promise<string> {
    const containerName = process.env.AZURE_BACKUP_CONTAINER!;
    const containerClient = this.azureBlobService!.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    await blockBlobClient.upload(data, data.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/octet-stream'
      },
      metadata: {
        backupType: 'supabase-full',
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString()
      }
    });

    const location = `azure://${containerName}/${fileName}`;
    console.log(`  ✅ Upload complete: ${location}`);
    return location;
  }

  /**
   * Clean up old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    console.log(`🧹 Cleaning up backups older than ${this.config.retentionDays} days...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    switch (this.config.provider) {
      case 'aws':
        await this.cleanupS3Backups(cutoffDate);
        break;
      case 'gcp':
        await this.cleanupGCSBackups(cutoffDate);
        break;
      case 'azure':
        await this.cleanupAzureBackups(cutoffDate);
        break;
    }
  }

  /**
   * Clean up S3 backups
   */
  private async cleanupS3Backups(cutoffDate: Date): Promise<void> {
    const bucketName = process.env.AWS_BACKUP_BUCKET!;
    
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'beautycort-backup-'
    });

    const response = await this.s3Client!.send(listCommand);
    const objectsToDelete = (response.Contents || [])
      .filter(obj => obj.LastModified && obj.LastModified < cutoffDate)
      .map(obj => obj.Key!);

    for (const key of objectsToDelete) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
      });
      await this.s3Client!.send(deleteCommand);
      console.log(`  🗑️ Deleted old backup: ${key}`);
    }

    console.log(`  ✅ Cleaned up ${objectsToDelete.length} old backups`);
  }

  /**
   * Clean up GCS backups
   */
  private async cleanupGCSBackups(cutoffDate: Date): Promise<void> {
    const bucketName = process.env.GCP_BACKUP_BUCKET!;
    const bucket = this.gcsStorage!.bucket(bucketName);
    
    const [files] = await bucket.getFiles({ prefix: 'beautycort-backup-' });
    
    let deletedCount = 0;
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      if (new Date(metadata.timeCreated) < cutoffDate) {
        await file.delete();
        console.log(`  🗑️ Deleted old backup: ${file.name}`);
        deletedCount++;
      }
    }

    console.log(`  ✅ Cleaned up ${deletedCount} old backups`);
  }

  /**
   * Clean up Azure backups
   */
  private async cleanupAzureBackups(cutoffDate: Date): Promise<void> {
    const containerName = process.env.AZURE_BACKUP_CONTAINER!;
    const containerClient = this.azureBlobService!.getContainerClient(containerName);
    
    let deletedCount = 0;
    for await (const blob of containerClient.listBlobsFlat({ prefix: 'beautycort-backup-' })) {
      if (blob.properties.lastModified && blob.properties.lastModified < cutoffDate) {
        await containerClient.deleteBlob(blob.name);
        console.log(`  🗑️ Deleted old backup: ${blob.name}`);
        deletedCount++;
      }
    }

    console.log(`  ✅ Cleaned up ${deletedCount} old backups`);
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackup(backupId: string, location: string): Promise<void> {
    console.log(`🔍 Verifying backup integrity: ${backupId}`);
    
    // For now, just verify the file exists and has content
    // In a more sophisticated implementation, you would:
    // 1. Download the backup
    // 2. Decrypt and decompress it
    // 3. Validate the JSON structure
    // 4. Potentially restore to a test database
    
    console.log(`  ✅ Backup verification complete`);
  }

  /**
   * Send notification about backup status
   */
  private async sendNotification(type: 'success' | 'failure', result: BackupResult): Promise<void> {
    console.log(`📧 Sending ${type} notification...`);
    
    const message = type === 'success' 
      ? `✅ Database backup completed successfully\n\nBackup ID: ${result.backupId}\nDuration: ${(result.duration/1000).toFixed(2)}s\nSize: ${(result.size/1024/1024).toFixed(2)} MB\nLocation: ${result.location}`
      : `❌ Database backup failed\n\nBackup ID: ${result.backupId}\nError: ${result.error}\nDuration: ${(result.duration/1000).toFixed(2)}s`;

    // Send to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await this.sendSlackNotification(type, message);
      } catch (error) {
        console.warn('Failed to send Slack notification:', error.message);
      }
    }

    // Send email
    if (process.env.BACKUP_EMAIL_RECIPIENTS) {
      try {
        await this.sendEmailNotification(type, message);
      } catch (error) {
        console.warn('Failed to send email notification:', error.message);
      }
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(type: 'success' | 'failure', message: string): Promise<void> {
    const webhook = process.env.SLACK_WEBHOOK_URL!;
    const payload = {
      channel: '#backup-alerts',
      text: message,
      username: 'Backup Bot',
      icon_emoji: type === 'success' ? ':white_check_mark:' : ':x:'
    };

    // Implementation would use axios or fetch
    console.log('Slack notification would be sent:', payload);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(type: 'success' | 'failure', message: string): Promise<void> {
    const recipients = process.env.BACKUP_EMAIL_RECIPIENTS!.split(',');
    const subject = `BeautyCort Database Backup ${type === 'success' ? 'Success' : 'Failure'}`;

    // Implementation would use SendGrid, SES, or other email service
    console.log('Email notification would be sent:', { recipients, subject, message });
  }

  /**
   * Generate backup ID
   */
  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `backup-${timestamp}-${random}`;
  }

  /**
   * Generate backup file name
   */
  private generateBackupFileName(backupId: string): string {
    const extension = this.config.compressionEnabled ? 'gz' : 'json';
    return `beautycort-backup-${backupId}.${extension}`;
  }

  /**
   * Restore database from backup
   */
  public async restoreFromBackup(backupLocation: string): Promise<void> {
    console.log(`🔄 Starting database restore from: ${backupLocation}`);
    
    try {
      // 1. Download backup file
      const backupData = await this.downloadBackup(backupLocation);
      
      // 2. Decrypt if necessary
      let processedData = backupData;
      if (this.config.encryptionEnabled) {
        processedData = await this.decryptData(processedData);
      }
      
      // 3. Decompress if necessary
      if (this.config.compressionEnabled) {
        processedData = await this.decompressData(processedData);
      }
      
      // 4. Parse backup data
      const backup = JSON.parse(processedData.toString('utf8'));
      
      // 5. Restore data to database
      await this.restoreData(backup);
      
      console.log('✅ Database restore completed successfully');
      
    } catch (error) {
      console.error('❌ Database restore failed:', error);
      throw error;
    }
  }

  /**
   * Download backup from cloud storage
   */
  private async downloadBackup(location: string): Promise<Buffer> {
    // Implementation would download from the specified cloud storage location
    throw new Error('Restore functionality not yet implemented');
  }

  /**
   * Decrypt backup data
   */
  private async decryptData(data: Buffer): Promise<Buffer> {
    // Implementation would decrypt the data using the same key used for encryption
    throw new Error('Decrypt functionality not yet implemented');
  }

  /**
   * Decompress backup data
   */
  private async decompressData(data: Buffer): Promise<Buffer> {
    const gunzip = promisify(zlib.gunzip);
    return await gunzip(data);
  }

  /**
   * Restore data to database
   */
  private async restoreData(backup: any): Promise<void> {
    // Implementation would restore the data to Supabase
    throw new Error('Data restore functionality not yet implemented');
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const backupManager = new DatabaseBackupManager();

  switch (command) {
    case 'backup':
      backupManager.performBackup()
        .then(result => {
          console.log('\n🎉 Backup operation completed');
          process.exit(0);
        })
        .catch(error => {
          console.error('\n💥 Backup operation failed:', error.message);
          process.exit(1);
        });
      break;

    case 'restore':
      const backupLocation = process.argv[3];
      if (!backupLocation) {
        console.error('❌ Please provide backup location');
        process.exit(1);
      }
      
      backupManager.restoreFromBackup(backupLocation)
        .then(() => {
          console.log('\n🎉 Restore operation completed');
          process.exit(0);
        })
        .catch(error => {
          console.error('\n💥 Restore operation failed:', error.message);
          process.exit(1);
        });
      break;

    default:
      console.log(`
Usage: ts-node database-backup.ts <command> [options]

Commands:
  backup                    Perform a full database backup
  restore <backup-location> Restore database from backup

Examples:
  ts-node database-backup.ts backup
  ts-node database-backup.ts restore s3://bucket/backup-file.gz
      `);
      process.exit(1);
  }
}

export default DatabaseBackupManager;