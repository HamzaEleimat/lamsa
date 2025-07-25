/**
 * @file encrypted-db.service.ts
 * @description Database service wrapper that handles PII encryption/decryption
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import { db, supabaseAdmin } from '../config/supabase-simple';
import { encryptionService, EncryptionService, PIIFields } from './encryption.service';
import { logger } from '../utils/logger';

// Define which fields contain PII for each table
const PII_FIELDS: PIIFields = {
  users: ['name', 'email'],
  providers: ['owner_name', 'email', 'phone', 'address', 'bank_account_number'],
  bookings: ['customer_notes', 'provider_notes'],
  reviews: ['comment'],
  payments: ['card_last_four', 'receipt_url'],
};

/**
 * Encrypted database service that automatically handles PII encryption/decryption
 */
export class EncryptedDatabaseService {
  /**
   * Create a user with encrypted PII
   */
  async createUser(userData: any) {
    try {
      // Extract fields that need encryption
      const encryptedData = encryptionService.encryptObject(
        userData,
        PII_FIELDS.users
      );
      
      // Add search hashes for encrypted fields
      if (userData.email) {
        encryptedData.email_hash = encryptionService.hash(userData.email);
      }
      if (userData.phone) {
        encryptedData.phone_hash = encryptionService.hash(userData.phone);
      }
      
      // Create user with encrypted data
      const result = await db.users.create(encryptedData);
      
      // Decrypt PII before returning
      if (result.data) {
        result.data = encryptionService.decryptObject(
          result.data,
          PII_FIELDS.users as (keyof typeof result.data)[]
        );
      }
      
      return result;
    } catch (error) {
      logger.error('Error creating encrypted user', error);
      throw error;
    }
  }
  
  /**
   * Find user by phone with hash lookup
   */
  async findUserByPhone(phone: string) {
    try {
      const phoneHash = encryptionService.hash(phone);
      
      // First, try to find by hash
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not configured');
      }
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('phone_hash', phoneHash)
        .single();
      
      if (error || !data) {
        return { data: null, error };
      }
      
      // Decrypt PII fields
      const decryptedUser = encryptionService.decryptObject(
        data,
        PII_FIELDS.users
      );
      
      // Verify the decrypted phone matches (in case of hash collision)
      if (decryptedUser.phone === phone) {
        return { data: decryptedUser, error: null };
      }
      
      return { data: null, error: null };
    } catch (error) {
      logger.error('Error finding user by phone', error);
      return { data: null, error };
    }
  }
  
  /**
   * Find provider by email with hash lookup
   */
  async findProviderByEmail(email: string) {
    try {
      const emailHash = encryptionService.hash(email);
      
      // First, try to find by hash
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not configured');
      }
      
      const { data, error } = await supabaseAdmin
        .from('providers')
        .select('*')
        .eq('email_hash', emailHash)
        .single();
      
      if (error || !data) {
        return { data: null, error };
      }
      
      // Decrypt PII fields
      const decryptedProvider = encryptionService.decryptObject(
        data,
        PII_FIELDS.providers
      );
      
      // Verify the decrypted email matches
      if (decryptedProvider.email === email) {
        return { data: decryptedProvider, error: null };
      }
      
      return { data: null, error: null };
    } catch (error) {
      logger.error('Error finding provider by email', error);
      return { data: null, error };
    }
  }
  
  /**
   * Find provider by phone with hash lookup
   */
  async findProviderByPhone(phone: string) {
    try {
      const phoneHash = encryptionService.hash(phone);
      
      // First, try to find by hash
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not configured');
      }
      
      const { data, error } = await supabaseAdmin
        .from('providers')
        .select('*')
        .eq('phone_hash', phoneHash)
        .single();
      
      if (error || !data) {
        return { data: null, error };
      }
      
      // Decrypt PII fields
      const decryptedProvider = encryptionService.decryptObject(
        data,
        PII_FIELDS.providers
      );
      
      // Verify the decrypted phone matches (in case of hash collision)
      if (decryptedProvider.phone === phone) {
        return { data: decryptedProvider, error: null };
      }
      
      return { data: null, error: null };
    } catch (error) {
      logger.error('Error finding provider by phone', error);
      return { data: null, error };
    }
  }
  
  /**
   * Update user with encrypted PII
   */
  async updateUser(userId: string, updates: any) {
    try {
      // Encrypt PII fields in updates
      const encryptedUpdates = { ...updates };
      
      for (const field of PII_FIELDS.users) {
        if (field in updates && updates[field] !== null) {
          encryptedUpdates[field] = encryptionService.encrypt(
            updates[field],
            field
          );
          
          // Update search hash
          if (field === 'email') {
            encryptedUpdates.email_hash = encryptionService.hash(updates.email);
          }
        }
      }
      
      // Update with encrypted data
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not configured');
      }
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(encryptedUpdates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error || !data) {
        return { data: null, error };
      }
      
      // Decrypt before returning
      const decryptedUser = encryptionService.decryptObject(
        data,
        PII_FIELDS.users
      );
      
      return { data: decryptedUser, error: null };
    } catch (error) {
      logger.error('Error updating encrypted user', error);
      return { data: null, error };
    }
  }
  
  /**
   * Get bookings with decrypted PII
   */
  async getBookings(filters: any = {}) {
    try {
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not configured');
      }
      
      let query = supabaseAdmin.from('bookings').select('*');
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query;
      
      if (error || !data) {
        return { data: null, error };
      }
      
      // Decrypt PII in each booking
      const decryptedBookings = data.map(booking => 
        encryptionService.decryptObject(booking, PII_FIELDS.bookings)
      );
      
      return { data: decryptedBookings, error: null };
    } catch (error) {
      logger.error('Error getting encrypted bookings', error);
      return { data: null, error };
    }
  }
  
  /**
   * Create review with encrypted comment
   */
  async createReview(reviewData: any) {
    try {
      // Encrypt comment if present
      const encryptedData = encryptionService.encryptObject(
        reviewData,
        PII_FIELDS.reviews
      );
      
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not configured');
      }
      
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .insert(encryptedData)
        .select()
        .single();
      
      if (error || !data) {
        return { data: null, error };
      }
      
      // Decrypt before returning
      const decryptedReview = encryptionService.decryptObject(
        data,
        PII_FIELDS.reviews
      );
      
      return { data: decryptedReview, error: null };
    } catch (error) {
      logger.error('Error creating encrypted review', error);
      return { data: null, error };
    }
  }
  
  /**
   * Get provider profile with decrypted PII (for authorized users only)
   */
  async getProviderProfile(providerId: string, requesterId?: string) {
    try {
      const { data, error } = await db.providers.findById(providerId);
      
      if (error || !data) {
        return { data: null, error };
      }
      
      // Check if requester is authorized to see full PII
      const isOwner = requesterId === providerId;
      const isAdmin = requesterId && await this.isAdmin(requesterId);
      
      if (isOwner || isAdmin) {
        // Return fully decrypted data
        const decryptedProvider = encryptionService.decryptObject(
          data,
          PII_FIELDS.providers as (keyof typeof data)[]
        );
        return { data: decryptedProvider, error: null };
      } else {
        // Return masked PII for public view
        const maskedProvider = { ...(data as Record<string, any>) };
        
        // Mask sensitive fields
        if ((data as any).email) {
          (maskedProvider as any).email = EncryptionService.mask(
            encryptionService.decrypt((data as any).email, 'email') || '',
            'email'
          );
        }
        if ((data as any).phone) {
          (maskedProvider as any).phone = EncryptionService.mask(
            encryptionService.decrypt((data as any).phone, 'phone') || '',
            'phone'
          );
        }
        if ((data as any).owner_name) {
          (maskedProvider as any).owner_name = EncryptionService.mask(
            encryptionService.decrypt((data as any).owner_name, 'owner_name') || '',
            'name'
          );
        }
        
        // Remove sensitive fields
        delete maskedProvider.address;
        delete maskedProvider.bank_account_number;
        
        return { data: maskedProvider, error: null };
      }
    } catch (error) {
      logger.error('Error getting provider profile', error);
      return { data: null, error };
    }
  }
  
  /**
   * Check if user is admin
   */
  private async isAdmin(userId: string): Promise<boolean> {
    try {
      const { data } = await db.providers.findById(userId);
      return (data as any)?.role === 'admin' || (data as any)?.role === 'super_admin';
    } catch {
      return false;
    }
  }
  
  /**
   * Create provider with encrypted PII
   */
  async createProvider(providerData: any) {
    try {
      // Extract fields that need encryption
      const encryptedData = encryptionService.encryptObject(
        providerData,
        PII_FIELDS.providers
      );
      
      // Add search hashes for encrypted fields
      if (providerData.email) {
        encryptedData.email_hash = encryptionService.hash(providerData.email);
      }
      if (providerData.phone) {
        encryptedData.phone_hash = encryptionService.hash(providerData.phone);
      }
      
      // Mark as encrypted
      encryptedData.pii_encrypted = true;
      encryptedData.pii_encrypted_at = new Date().toISOString();
      
      // Create provider with encrypted data
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not configured');
      }
      
      const { data, error } = await supabaseAdmin
        .from('providers')
        .insert(encryptedData)
        .select()
        .single();
      
      if (error || !data) {
        return { data: null, error };
      }
      
      // Decrypt PII before returning
      const decryptedProvider = encryptionService.decryptObject(
        data,
        PII_FIELDS.providers
      );
      
      return { data: decryptedProvider, error: null };
    } catch (error) {
      logger.error('Error creating encrypted provider', error);
      return { data: null, error };
    }
  }
  
  /**
   * Update provider with encrypted PII
   */
  async updateProvider(providerId: string, updates: any) {
    try {
      // Encrypt PII fields in updates
      const encryptedUpdates = { ...updates };
      
      for (const field of PII_FIELDS.providers) {
        if (field in updates && updates[field] !== null && updates[field] !== undefined) {
          encryptedUpdates[field] = encryptionService.encrypt(
            updates[field],
            field
          );
          
          // Update search hash
          if (field === 'email') {
            encryptedUpdates.email_hash = encryptionService.hash(updates.email);
          }
          if (field === 'phone') {
            encryptedUpdates.phone_hash = encryptionService.hash(updates.phone);
          }
        }
      }
      
      // Update encrypted timestamp if PII was modified
      const piiFieldsUpdated = PII_FIELDS.providers.some(field => field in updates);
      if (piiFieldsUpdated) {
        encryptedUpdates.pii_encrypted = true;
        encryptedUpdates.pii_encrypted_at = new Date().toISOString();
      }
      
      // Update with encrypted data
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not configured');
      }
      
      const { data, error } = await supabaseAdmin
        .from('providers')
        .update(encryptedUpdates)
        .eq('id', providerId)
        .select()
        .single();
      
      if (error || !data) {
        return { data: null, error };
      }
      
      // Decrypt before returning
      const decryptedProvider = encryptionService.decryptObject(
        data,
        PII_FIELDS.providers
      );
      
      return { data: decryptedProvider, error: null };
    } catch (error) {
      logger.error('Error updating encrypted provider', error);
      return { data: null, error };
    }
  }
  
  /**
   * Migrate existing unencrypted data
   */
  async migrateUnencryptedData(
    tableName: keyof PIIFields,
    batchSize: number = 100
  ): Promise<{ migrated: number; errors: number }> {
    let migrated = 0;
    let errors = 0;
    let lastId: string | null = null;
    
    try {
      while (true) {
        // Get batch of records
        if (!supabaseAdmin) {
          throw new Error('Supabase admin client not configured');
        }
        
        let query = supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(batchSize)
          .order('id');
        
        if (lastId) {
          query = query.gt('id', lastId);
        }
        
        const { data: records, error } = await query;
        
        if (error || !records || records.length === 0) {
          break;
        }
        
        // Process each record
        for (const record of records) {
          try {
            // Check if already encrypted (by trying to decrypt)
            const isEncrypted = PII_FIELDS[tableName].some(field => {
              if (!record[field]) return false;
              try {
                encryptionService.decrypt(record[field], field);
                return true;
              } catch {
                return false;
              }
            });
            
            if (!isEncrypted) {
              // Encrypt PII fields
              const encrypted = encryptionService.encryptObject(
                record,
                PII_FIELDS[tableName] as any
              );
              
              // Add search hashes
              if (tableName === 'users' || tableName === 'providers') {
                if (record.email) {
                  encrypted.email_hash = encryptionService.hash(record.email);
                }
                if (record.phone) {
                  encrypted.phone_hash = encryptionService.hash(record.phone);
                }
              }
              
              // Update record
              const { error: updateError } = await supabaseAdmin
                .from(tableName)
                .update(encrypted)
                .eq('id', record.id);
              
              if (updateError) {
                errors++;
                logger.error(`Failed to encrypt record ${record.id} in ${tableName}`, updateError);
              } else {
                migrated++;
              }
            }
          } catch (error) {
            errors++;
            logger.error(`Error processing record ${record.id} in ${tableName}`, error);
          }
        }
        
        lastId = records[records.length - 1].id;
        
        // Log progress
        logger.info(`Migration progress for ${tableName}: ${migrated} migrated, ${errors} errors`);
      }
      
      return { migrated, errors };
    } catch (error) {
      logger.error(`Migration failed for ${tableName}`, error);
      return { migrated, errors };
    }
  }
}

// Export singleton instance
export const encryptedDb = new EncryptedDatabaseService();