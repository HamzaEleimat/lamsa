/**
 * Migration Script: Base64 Images to Object Storage
 * 
 * This script migrates existing base64 images from the database
 * to Supabase Storage and updates the URLs in the database.
 */

import { supabase } from '../src/config/supabase-simple';
import { imageStorageService } from '../src/services/image-storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

class ImageMigration {
  private results: MigrationResult = {
    total: 0,
    migrated: 0,
    failed: 0,
    errors: []
  };

  /**
   * Convert base64 to Buffer
   */
  private base64ToBuffer(base64: string): Buffer {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  /**
   * Detect image format from base64
   */
  private detectImageFormat(base64: string): string {
    if (base64.startsWith('data:image/png')) return 'png';
    if (base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg')) return 'jpg';
    if (base64.startsWith('data:image/webp')) return 'webp';
    if (base64.startsWith('data:image/gif')) return 'gif';
    
    // Try to detect from base64 signature
    const signatures = {
      '/9j/': 'jpg',
      'iVBORw0KGgo': 'png',
      'UklGR': 'webp',
      'R0lGOD': 'gif'
    };

    for (const [signature, format] of Object.entries(signatures)) {
      if (base64.includes(signature)) return format;
    }

    return 'jpg'; // Default fallback
  }

  /**
   * Migrate provider avatars and cover images
   */
  async migrateProviderImages(): Promise<void> {
    console.log('Migrating provider images...');
    
    const { data: providers, error } = await supabase
      .from('providers')
      .select('id, avatar_url, cover_image_url')
      .or('avatar_url.like.data:image%,cover_image_url.like.data:image%');

    if (error) {
      console.error('Error fetching providers:', error);
      return;
    }

    for (const provider of providers || []) {
      this.results.total += (provider.avatar_url?.startsWith('data:') ? 1 : 0);
      this.results.total += (provider.cover_image_url?.startsWith('data:') ? 1 : 0);

      try {
        const updates: any = {};

        // Migrate avatar
        if (provider.avatar_url?.startsWith('data:')) {
          const buffer = this.base64ToBuffer(provider.avatar_url);
          const format = this.detectImageFormat(provider.avatar_url);
          const key = `${provider.id}/avatar-${Date.now()}.${format}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(key, buffer, {
              contentType: `image/${format}`,
              upsert: false
            });

          if (uploadError) throw uploadError;

          updates.avatar_url = `${process.env.SUPABASE_URL}/storage/v1/object/public/avatars/${key}`;
          this.results.migrated++;
        }

        // Migrate cover image
        if (provider.cover_image_url?.startsWith('data:')) {
          const buffer = this.base64ToBuffer(provider.cover_image_url);
          const format = this.detectImageFormat(provider.cover_image_url);
          const key = `${provider.id}/cover-${Date.now()}.${format}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(key, buffer, {
              contentType: `image/${format}`,
              upsert: false
            });

          if (uploadError) throw uploadError;

          updates.cover_image_url = `${process.env.SUPABASE_URL}/storage/v1/object/public/avatars/${key}`;
          this.results.migrated++;
        }

        // Update database
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('providers')
            .update(updates)
            .eq('id', provider.id);

          if (updateError) throw updateError;
          console.log(`✓ Migrated images for provider ${provider.id}`);
        }
      } catch (error) {
        this.results.failed++;
        this.results.errors.push({
          id: provider.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`✗ Failed to migrate provider ${provider.id}:`, error);
      }
    }
  }

  /**
   * Migrate user avatars
   */
  async migrateUserImages(): Promise<void> {
    console.log('Migrating user avatars...');
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, avatar_url')
      .like('avatar_url', 'data:image%');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    for (const user of users || []) {
      this.results.total++;

      try {
        if (user.avatar_url?.startsWith('data:')) {
          const buffer = this.base64ToBuffer(user.avatar_url);
          const format = this.detectImageFormat(user.avatar_url);
          const key = `${user.id}/avatar-${Date.now()}.${format}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(key, buffer, {
              contentType: `image/${format}`,
              upsert: false
            });

          if (uploadError) throw uploadError;

          const newUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/avatars/${key}`;

          const { error: updateError } = await supabase
            .from('users')
            .update({ avatar_url: newUrl })
            .eq('id', user.id);

          if (updateError) throw updateError;

          this.results.migrated++;
          console.log(`✓ Migrated avatar for user ${user.id}`);
        }
      } catch (error) {
        this.results.failed++;
        this.results.errors.push({
          id: user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`✗ Failed to migrate user ${user.id}:`, error);
      }
    }
  }

  /**
   * Create backup of current base64 data
   */
  async createBackup(): Promise<void> {
    console.log('Creating backup of base64 images...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', `image-migration-${timestamp}`);
    
    await fs.mkdir(backupDir, { recursive: true });

    // Backup providers
    const { data: providers } = await supabase
      .from('providers')
      .select('id, avatar_url, cover_image_url')
      .or('avatar_url.like.data:image%,cover_image_url.like.data:image%');

    if (providers) {
      await fs.writeFile(
        path.join(backupDir, 'providers-backup.json'),
        JSON.stringify(providers, null, 2)
      );
    }

    // Backup users
    const { data: users } = await supabase
      .from('users')
      .select('id, avatar_url')
      .like('avatar_url', 'data:image%');

    if (users) {
      await fs.writeFile(
        path.join(backupDir, 'users-backup.json'),
        JSON.stringify(users, null, 2)
      );
    }

    console.log(`✓ Backup created at ${backupDir}`);
  }

  /**
   * Run the migration
   */
  async run(): Promise<void> {
    console.log('Starting image migration...\n');

    // Create backup first
    await this.createBackup();

    // Run migrations
    await this.migrateProviderImages();
    await this.migrateUserImages();

    // Print results
    console.log('\n=== Migration Results ===');
    console.log(`Total images: ${this.results.total}`);
    console.log(`Successfully migrated: ${this.results.migrated}`);
    console.log(`Failed: ${this.results.failed}`);

    if (this.results.errors.length > 0) {
      console.log('\nErrors:');
      this.results.errors.forEach(err => {
        console.log(`- ${err.id}: ${err.error}`);
      });
    }

    console.log('\nMigration complete!');
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new ImageMigration();
  migration.run()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default ImageMigration;