/**
 * OTP Service
 * Handles OTP generation, storage, and verification
 * Uses in-memory storage with automatic expiration
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface OTPData {
  code: string;
  phone: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  verified: boolean;
}

export interface OTPGenerateResult {
  success: boolean;
  code?: string;
  expiresAt?: Date;
  error?: string;
}

export interface OTPVerifyResult {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
}

export class OTPService {
  private static instance: OTPService;
  private otpStore: Map<string, OTPData> = new Map();
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup timer
    this.startCleanupTimer();
  }

  static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService();
    }
    return OTPService.instance;
  }

  /**
   * Generate a new OTP for a phone number
   */
  generateOTP(phone: string): OTPGenerateResult {
    try {
      // Clean up any existing OTP for this phone
      this.otpStore.delete(phone);

      // Generate secure random OTP
      const code = this.generateSecureOTP();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY_MINUTES * 60000);

      // Store OTP data
      const otpData: OTPData = {
        code,
        phone,
        attempts: 0,
        expiresAt,
        createdAt: now,
        verified: false
      };

      this.otpStore.set(phone, otpData);

      logger.info('OTP generated', {
        phone: this.maskPhone(phone),
        fullPhone: phone,
        code: code,
        expiresAt: expiresAt.toISOString()
      });

      return {
        success: true,
        code,
        expiresAt
      };
    } catch (error) {
      logger.error('Failed to generate OTP', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phone: this.maskPhone(phone)
      });

      return {
        success: false,
        error: 'Failed to generate OTP'
      };
    }
  }

  /**
   * Verify an OTP
   */
  verifyOTP(phone: string, code: string): OTPVerifyResult {
    try {
      // Debug: Log all stored phone numbers
      logger.info('OTP Store contents:', {
        storedPhones: Array.from(this.otpStore.keys()),
        lookingFor: phone
      });
      
      const otpData = this.otpStore.get(phone);

      // Check if OTP exists
      if (!otpData) {
        logger.warn('OTP verification attempted for non-existent OTP', {
          phone: this.maskPhone(phone),
          fullPhone: phone,
          availableKeys: Array.from(this.otpStore.keys())
        });
        return {
          success: false,
          error: 'Invalid or expired OTP'
        };
      }

      // Check if already verified
      if (otpData.verified) {
        logger.warn('OTP already verified', {
          phone: this.maskPhone(phone)
        });
        return {
          success: false,
          error: 'OTP already used'
        };
      }

      // Check expiration
      if (new Date() > otpData.expiresAt) {
        this.otpStore.delete(phone);
        logger.warn('Expired OTP verification attempted', {
          phone: this.maskPhone(phone)
        });
        return {
          success: false,
          error: 'OTP has expired'
        };
      }

      // Check max attempts
      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        this.otpStore.delete(phone);
        logger.warn('Max OTP attempts exceeded', {
          phone: this.maskPhone(phone)
        });
        return {
          success: false,
          error: 'Maximum verification attempts exceeded'
        };
      }

      // Increment attempts
      otpData.attempts++;

      // Verify code
      if (otpData.code !== code) {
        const attemptsRemaining = this.MAX_ATTEMPTS - otpData.attempts;
        
        if (attemptsRemaining === 0) {
          this.otpStore.delete(phone);
        }

        logger.warn('Invalid OTP code', {
          phone: this.maskPhone(phone),
          attemptsRemaining
        });

        return {
          success: false,
          error: `Invalid OTP. ${attemptsRemaining} attempts remaining`,
          attemptsRemaining
        };
      }

      // Mark as verified
      otpData.verified = true;
      
      // Keep the OTP data for a short time after verification
      // to prevent replay attacks
      setTimeout(() => {
        this.otpStore.delete(phone);
      }, 60000); // Delete after 1 minute

      logger.info('OTP verified successfully', {
        phone: this.maskPhone(phone)
      });

      return {
        success: true
      };
    } catch (error) {
      logger.error('OTP verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phone: this.maskPhone(phone)
      });

      return {
        success: false,
        error: 'Verification failed'
      };
    }
  }

  /**
   * Check if an OTP exists and is valid
   */
  hasValidOTP(phone: string): boolean {
    const otpData = this.otpStore.get(phone);
    
    if (!otpData) {
      return false;
    }

    // Check if expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(phone);
      return false;
    }

    // Check if already verified
    if (otpData.verified) {
      return false;
    }

    // Check if max attempts exceeded
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(phone);
      return false;
    }

    return true;
  }

  /**
   * Get remaining time for an OTP (in seconds)
   */
  getRemainingTime(phone: string): number {
    const otpData = this.otpStore.get(phone);
    
    if (!otpData) {
      return 0;
    }

    const now = new Date();
    const remaining = Math.max(0, otpData.expiresAt.getTime() - now.getTime());
    
    return Math.floor(remaining / 1000);
  }

  /**
   * Clear an OTP
   */
  clearOTP(phone: string): void {
    this.otpStore.delete(phone);
    logger.info('OTP cleared', {
      phone: this.maskPhone(phone)
    });
  }

  /**
   * Generate a secure random OTP
   */
  private generateSecureOTP(): string {
    // Generate cryptographically secure random number
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    const range = max - min;
    
    // Use crypto for better randomness
    const randomBytes = crypto.randomBytes(4);
    const randomNum = randomBytes.readUInt32BE(0);
    const otp = min + (randomNum % range);
    
    return otp.toString().padStart(this.OTP_LENGTH, '0');
  }

  /**
   * Mask phone number for logging
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 8) {
      return '***';
    }
    return phone.substring(0, 6) + '***' + phone.substring(phone.length - 2);
  }

  /**
   * Start cleanup timer to remove expired OTPs
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredOTPs();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up expired OTPs
   */
  private cleanupExpiredOTPs(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [phone, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(phone);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired OTPs`);
    }
  }

  /**
   * Get statistics about OTP usage
   */
  getStats(): {
    totalActive: number;
    totalPending: number;
    totalVerified: number;
  } {
    let pending = 0;
    let verified = 0;

    for (const otpData of this.otpStore.values()) {
      if (otpData.verified) {
        verified++;
      } else {
        pending++;
      }
    }

    return {
      totalActive: this.otpStore.size,
      totalPending: pending,
      totalVerified: verified
    };
  }

  /**
   * Destroy the service (cleanup)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.otpStore.clear();
  }
}

// Export singleton instance
export const otpService = OTPService.getInstance();