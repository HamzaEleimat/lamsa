/**
 * @file encryption.service.ts
 * @description Service for encrypting and decrypting PII data
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * EncryptionService handles PII encryption/decryption
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits
  
  // Master key should be stored in environment variable or KMS
  private masterKey: Buffer;
  
  constructor() {
    // In production, this should come from AWS KMS, Azure Key Vault, or similar
    const envKey = process.env.PII_ENCRYPTION_KEY;
    
    if (!envKey) {
      logger.warn('PII_ENCRYPTION_KEY not set, using development key');
      // Development only - DO NOT use in production
      this.masterKey = crypto.scryptSync('development-key-do-not-use', 'salt', this.keyLength);
    } else {
      // Validate key format (should be base64)
      try {
        this.masterKey = Buffer.from(envKey, 'base64');
        if (this.masterKey.length !== this.keyLength) {
          throw new Error(`Invalid key length: ${this.masterKey.length} bytes (expected ${this.keyLength})`);
        }
      } catch (error) {
        logger.error('Invalid PII_ENCRYPTION_KEY format', error);
        throw new Error('Invalid encryption key configuration');
      }
    }
  }
  
  /**
   * Derive a field-specific key from master key
   * This allows for key rotation on a per-field basis
   */
  private deriveKey(fieldName: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.masterKey,
      Buffer.concat([salt, Buffer.from(fieldName)]),
      10000,
      this.keyLength,
      'sha256'
    );
  }
  
  /**
   * Encrypt a string value
   * Returns base64 encoded string containing: salt + iv + tag + encrypted data
   */
  encrypt(plaintext: string | null | undefined, fieldName: string = 'default'): string | null {
    if (!plaintext) return null;
    
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive field-specific key
      const key = this.deriveKey(fieldName, salt);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([salt, iv, tag, encrypted]);
      
      // Return base64 encoded
      return combined.toString('base64');
    } catch (error) {
      logger.error('Encryption error', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt a string value
   * Expects base64 encoded string containing: salt + iv + tag + encrypted data
   */
  decrypt(encryptedData: string | null | undefined, fieldName: string = 'default'): string | null {
    if (!encryptedData) return null;
    
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
      const tag = combined.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = combined.subarray(this.saltLength + this.ivLength + this.tagLength);
      
      // Derive field-specific key
      const key = this.deriveKey(fieldName, salt);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Decryption error', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Encrypt an object's PII fields
   */
  encryptObject<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[]
  ): T {
    const encrypted = { ...obj };
    
    for (const field of fieldsToEncrypt) {
      if (obj[field] !== null && obj[field] !== undefined) {
        encrypted[field] = this.encrypt(String(obj[field]), String(field)) as any;
      }
    }
    
    return encrypted;
  }
  
  /**
   * Decrypt an object's PII fields
   */
  decryptObject<T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: (keyof T)[]
  ): T {
    const decrypted = { ...obj };
    
    for (const field of fieldsToDecrypt) {
      if (obj[field] !== null && obj[field] !== undefined) {
        try {
          decrypted[field] = this.decrypt(String(obj[field]), String(field)) as any;
        } catch (error) {
          logger.warn(`Failed to decrypt field ${String(field)}, keeping encrypted value`);
        }
      }
    }
    
    return decrypted;
  }
  
  /**
   * Generate a new encryption key (for key rotation)
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }
  
  /**
   * Hash a value for searching (one-way, non-reversible)
   * Used for creating searchable indexes of encrypted data
   * Now uses HMAC-SHA256 for better security
   */
  hash(value: string, salt?: string): string {
    const actualSalt = salt || process.env.PII_HASH_SALT || 'default-salt';
    
    // Use HMAC-SHA256 with the master key for better security
    // This prevents rainbow table attacks and provides authentication
    return crypto
      .createHmac('sha256', this.masterKey)
      .update(value + actualSalt)
      .digest('hex');
  }
  
  /**
   * Create a masked version of PII for display
   */
  static mask(value: string, type: 'email' | 'phone' | 'name' | 'custom' = 'custom'): string {
    if (!value) return '';
    
    switch (type) {
      case 'email': {
        const [local, domain] = value.split('@');
        if (!domain) return '***';
        const maskedLocal = local.length > 2 
          ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
          : '***';
        return `${maskedLocal}@${domain}`;
      }
      
      case 'phone': {
        // Show only last 4 digits
        if (value.length < 4) return '***';
        return '*'.repeat(value.length - 4) + value.slice(-4);
      }
      
      case 'name': {
        // Show first letter only
        return value[0] + '*'.repeat(Math.max(3, value.length - 1));
      }
      
      case 'custom':
      default: {
        // Show first and last character
        if (value.length <= 2) return '***';
        return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
      }
    }
  }
}

// Export types for PII fields
export interface PIIFields {
  users: ('name' | 'email')[];
  providers: ('owner_name' | 'email' | 'phone' | 'address' | 'bank_account_number')[];
  bookings: ('customer_notes' | 'provider_notes')[];
  reviews: ('comment')[];
  payments: ('card_last_four' | 'receipt_url')[];
}

// Export singleton instance
export const encryptionService = new EncryptionService();