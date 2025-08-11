import crypto from 'crypto';
import { AppError } from '../utils/errors';

/**
 * PII Encryption Service
 * Handles encryption and decryption of personally identifiable information
 * Uses AES-256-GCM for authenticated encryption
 */
class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits
  private readonly iterations = 100000; // PBKDF2 iterations
  
  private encryptionKey: Buffer | undefined;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the encryption service with keys from environment
   */
  private initialize(): void {
    const masterKey = process.env.PII_ENCRYPTION_KEY;
    
    if (!masterKey) {
      console.warn('PII_ENCRYPTION_KEY not set. PII encryption disabled.');
      return;
    }

    if (masterKey.length < 32) {
      throw new Error('PII_ENCRYPTION_KEY must be at least 32 characters');
    }

    // Derive encryption key from master key using PBKDF2
    const salt = process.env.PII_ENCRYPTION_SALT || 'lamsa-pii-encryption-salt-2024';
    this.encryptionKey = crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    );

    this.isInitialized = true;
  }

  /**
   * Encrypt a string value
   * @param plaintext - The text to encrypt
   * @returns Encrypted text in format: iv:authTag:ciphertext (base64)
   */
  encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;
    
    if (!this.isInitialized) {
      console.warn('Encryption service not initialized. Returning plaintext.');
      return plaintext;
    }

    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey!, iv);
      
      // Encrypt the plaintext
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and ciphertext
      const combined = Buffer.concat([iv, authTag, encrypted]);
      
      // Return as base64
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new AppError('Failed to encrypt data', 500);
    }
  }

  /**
   * Decrypt a string value
   * @param ciphertext - The encrypted text (base64)
   * @returns Decrypted plaintext
   */
  decrypt(ciphertext: string | null | undefined): string | null {
    if (!ciphertext) return null;
    
    if (!this.isInitialized) {
      console.warn('Encryption service not initialized. Returning ciphertext.');
      return ciphertext;
    }

    try {
      // Decode from base64
      const combined = Buffer.from(ciphertext, 'base64');
      
      // Extract components
      const iv = combined.slice(0, this.ivLength);
      const authTag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey!, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      // Return null instead of throwing to handle legacy unencrypted data
      return null;
    }
  }

  /**
   * Encrypt multiple fields in an object
   * @param data - Object with fields to encrypt
   * @param fields - Array of field names to encrypt
   * @returns Object with encrypted fields
   */
  encryptFields<T extends Record<string, any>>(data: T, fields: string[]): T {
    if (!this.isInitialized) return data;

    const encrypted: any = { ...data };
    
    for (const field of fields) {
      if (field in encrypted && encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    }
    
    return encrypted as T;
  }

  /**
   * Decrypt multiple fields in an object
   * @param data - Object with fields to decrypt
   * @param fields - Array of field names to decrypt
   * @returns Object with decrypted fields
   */
  decryptFields<T extends Record<string, any>>(data: T, fields: string[]): T {
    if (!this.isInitialized) return data;

    const decrypted: any = { ...data };
    
    for (const field of fields) {
      if (field in decrypted && decrypted[field]) {
        const plaintext = this.decrypt(decrypted[field]);
        if (plaintext !== null) {
          decrypted[field] = plaintext;
        }
      }
    }
    
    return decrypted as T;
  }

  /**
   * Hash a value using SHA-256 (for searching encrypted fields)
   * @param value - Value to hash
   * @returns Hashed value
   */
  hash(value: string | null | undefined): string | null {
    if (!value) return null;
    
    return crypto
      .createHash('sha256')
      .update(value)
      .digest('hex');
  }

  /**
   * Encrypt provider PII data
   * @param provider - Provider data
   * @returns Provider with encrypted PII
   */
  encryptProviderPII(provider: any): any {
    if (!this.isInitialized) return provider;

    const encrypted = { ...provider };
    
    // Encrypt sensitive fields
    if (encrypted.phone) {
      encrypted.phone_encrypted = this.encrypt(encrypted.phone);
      encrypted.phone_hash = this.hash(encrypted.phone);
      delete encrypted.phone; // Remove plaintext
    }
    
    if (encrypted.email) {
      encrypted.email_encrypted = this.encrypt(encrypted.email);
      encrypted.email_hash = this.hash(encrypted.email);
      delete encrypted.email; // Remove plaintext
    }
    
    if (encrypted.owner_name) {
      encrypted.owner_name_encrypted = this.encrypt(encrypted.owner_name);
      delete encrypted.owner_name; // Remove plaintext
    }
    
    // Mark as encrypted
    encrypted.pii_encrypted = true;
    encrypted.pii_encrypted_at = new Date().toISOString();
    
    return encrypted;
  }

  /**
   * Decrypt provider PII data
   * @param provider - Provider data with encrypted PII
   * @returns Provider with decrypted PII
   */
  decryptProviderPII(provider: any): any {
    if (!this.isInitialized || !provider.pii_encrypted) return provider;

    const decrypted = { ...provider };
    
    // Decrypt sensitive fields
    if (decrypted.phone_encrypted) {
      decrypted.phone = this.decrypt(decrypted.phone_encrypted) || decrypted.phone_encrypted;
      delete decrypted.phone_encrypted;
      delete decrypted.phone_hash;
    }
    
    if (decrypted.email_encrypted) {
      decrypted.email = this.decrypt(decrypted.email_encrypted) || decrypted.email_encrypted;
      delete decrypted.email_encrypted;
      delete decrypted.email_hash;
    }
    
    if (decrypted.owner_name_encrypted) {
      decrypted.owner_name = this.decrypt(decrypted.owner_name_encrypted) || decrypted.owner_name_encrypted;
      delete decrypted.owner_name_encrypted;
    }
    
    // Remove encryption markers for response
    delete decrypted.pii_encrypted;
    delete decrypted.pii_encrypted_at;
    
    return decrypted;
  }

  /**
   * Check if encryption is enabled
   */
  isEnabled(): boolean {
    return this.isInitialized;
  }

  /**
   * Generate a secure random key for encryption
   * @returns Base64 encoded key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Generate a secure random salt
   * @returns Base64 encoded salt
   */
  static generateSalt(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();

// Export class for testing
export { EncryptionService };