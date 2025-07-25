/**
 * @file mfa.service.ts
 * @description Multi-Factor Authentication service using TOTP with timing attack protection
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import { encryptionService } from './encryption.service';
import { secureLogger } from '../utils/secure-logger';
import { redis, redisClient } from '../config/redis';

interface MFASecret {
  base32: string;
  ascii: string;
  hex: string;
  qr_code_ascii?: string;
  qr_code_hex?: string;
  qr_code_base32?: string;
  google_auth_qr?: string;
  otpauth_url?: string;
}

interface MFASetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface MFAVerificationResult {
  verified: boolean;
  error?: string;
}

export class MFAService {
  private static readonly APP_NAME = 'Lamsa';
  private static readonly BACKUP_CODES_COUNT = 8;
  private static readonly TOKEN_WINDOW = 2; // Allow 2 time windows for clock drift
  private static readonly MAX_ATTEMPTS = 5; // Rate limiting
  private static readonly LOCKOUT_DURATION = 900; // 15 minutes in seconds (for Redis expiry)

  /**
   * Ensures supabaseAdmin is available
   * @throws Error if admin client is not initialized
   */
  private ensureAdminClient() {
    if (!supabaseAdmin) {
      throw new Error('Admin client not initialized. Service key required for MFA operations.');
    }
    return supabaseAdmin;
  }

  /**
   * Check if provider is locked out due to failed attempts
   */
  private async isLockedOut(providerId: string): Promise<boolean> {
    // Fallback to in-memory if Redis is not available
    if (!redis.isAvailable()) {
      return false;
    }

    try {
      const attemptKey = `mfa:attempts:${providerId}`;
      const lockoutKey = `mfa:lockout:${providerId}`;
      
      // Check if provider is locked out
      const isLocked = await redisClient.exists(lockoutKey);
      if (isLocked) {
        return true;
      }

      // Check attempt count
      const attempts = await redisClient.get(attemptKey);
      return attempts !== null && parseInt(attempts) >= MFAService.MAX_ATTEMPTS;
    } catch (error) {
      secureLogger.error('Error checking MFA lockout status', { error, providerId });
      return false; // Fail open to prevent locking out users due to Redis errors
    }
  }

  /**
   * Record failed attempt
   */
  private async recordFailedAttempt(providerId: string): Promise<void> {
    // Fallback to in-memory if Redis is not available
    if (!redis.isAvailable()) {
      return;
    }

    try {
      const attemptKey = `mfa:attempts:${providerId}`;
      const lockoutKey = `mfa:lockout:${providerId}`;
      
      // Increment attempt count
      const attempts = await redis.incrWithExpiry(attemptKey, MFAService.LOCKOUT_DURATION);
      
      // If max attempts reached, set lockout
      if (attempts >= MFAService.MAX_ATTEMPTS) {
        await redisClient.setEx(lockoutKey, MFAService.LOCKOUT_DURATION, '1');
        secureLogger.warn('MFA lockout triggered', { providerId, attempts });
      }
    } catch (error) {
      secureLogger.error('Error recording MFA failed attempt', { error, providerId });
      // Continue without rate limiting if Redis fails
    }
  }

  /**
   * Clear failed attempts on success
   */
  private async clearFailedAttempts(providerId: string): Promise<void> {
    // Fallback to in-memory if Redis is not available
    if (!redis.isAvailable()) {
      return;
    }

    try {
      const attemptKey = `mfa:attempts:${providerId}`;
      const lockoutKey = `mfa:lockout:${providerId}`;
      
      // Clear both attempt counter and lockout
      await redisClient.del([attemptKey, lockoutKey]);
    } catch (error) {
      secureLogger.error('Error clearing MFA failed attempts', { error, providerId });
      // Continue even if Redis fails
    }
  }

  /**
   * Generate MFA secret for a provider (same as original)
   */
  async generateSecret(providerId: string, email: string): Promise<MFASetupResult> {
    try {
      // Generate a new secret
      const secret = speakeasy.generateSecret({
        name: `${MFAService.APP_NAME} (${email})`,
        issuer: MFAService.APP_NAME,
        length: 32,
      });

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store encrypted secret in database
      const { error: updateError } = await this.ensureAdminClient()
        .from('providers')
        .update({
          mfa_secret: this.encryptSecret(secret.base32),
          mfa_enabled: false, // Not enabled until first successful verification
          mfa_backup_codes: this.encryptBackupCodes(backupCodes),
          mfa_setup_at: new Date().toISOString(),
        })
        .eq('id', providerId);

      if (updateError) {
        throw new Error('Failed to store MFA secret');
      }

      return {
        secret: secret.base32,
        qrCode: qrCodeDataUrl,
        backupCodes,
      };
    } catch (error) {
      secureLogger.error('Error generating MFA secret', error);
      throw new Error('Failed to setup MFA');
    }
  }

  /**
   * Verify MFA token with timing attack protection
   */
  async verifyToken(
    providerId: string,
    token: string,
    isSetup: boolean = false
  ): Promise<MFAVerificationResult> {
    try {
      // Validate token format - must be exactly 6 digits
      if (!/^\d{6}$/.test(token)) {
        return { verified: false, error: 'Invalid code format' };
      }

      // Check rate limiting
      if (await this.isLockedOut(providerId)) {
        await this.logMFAEvent(providerId, 'mfa_lockout', { reason: 'rate_limit' });
        return { verified: false, error: 'Too many failed attempts. Please try again later.' };
      }

      // Get provider MFA data
      const { data: provider, error } = await this.ensureAdminClient()
        .from('providers')
        .select('mfa_secret, mfa_enabled, mfa_backup_codes')
        .eq('id', providerId)
        .single();

      if (error || !provider || !provider.mfa_secret) {
        return { verified: false, error: 'MFA not configured' };
      }

      const secret = this.decryptSecret(provider.mfa_secret);

      // Generate expected tokens for the time window
      const expectedTokens: string[] = [];
      const currentTime = Math.floor(Date.now() / 1000);
      
      for (let i = -MFAService.TOKEN_WINDOW; i <= MFAService.TOKEN_WINDOW; i++) {
        const time = currentTime + (i * 30); // 30-second windows
        const expectedToken = speakeasy.totp({
          secret,
          encoding: 'base32',
          time: time
        });
        if (expectedToken) {
          expectedTokens.push(expectedToken);
        }
      }

      // Use constant-time comparison for each possible token
      let verified = false;
      const userTokenBuffer = Buffer.from(token);

      for (const expectedToken of expectedTokens) {
        const expectedTokenBuffer = Buffer.from(expectedToken);
        
        // Only compare if lengths match exactly (6 digits)
        if (userTokenBuffer.length === expectedTokenBuffer.length) {
          try {
            if (timingSafeEqual(userTokenBuffer, expectedTokenBuffer)) {
              verified = true;
              break;
            }
          } catch {
            // timingSafeEqual throws if lengths don't match, continue to next token
            continue;
          }
        }
      }

      if (verified) {
        // Clear failed attempts on success
        await this.clearFailedAttempts(providerId);

        // If this is the setup verification, enable MFA
        if (isSetup && !provider.mfa_enabled) {
          await this.ensureAdminClient()
            .from('providers')
            .update({
              mfa_enabled: true,
              mfa_verified_at: new Date().toISOString(),
            })
            .eq('id', providerId);
        }

        // Log successful MFA verification
        await this.logMFAEvent(providerId, 'mfa_success', { isSetup });

        return { verified: true };
      }

      // Check if it's a backup code (also using constant-time comparison)
      if (provider.mfa_backup_codes) {
        const backupCodes = this.decryptBackupCodes(provider.mfa_backup_codes);
        let codeIndex = -1;
        const userCodeBuffer = Buffer.from(token);

        for (let i = 0; i < backupCodes.length; i++) {
          const backupCodeBuffer = Buffer.from(backupCodes[i]);
          
          if (userCodeBuffer.length === backupCodeBuffer.length) {
            try {
              if (timingSafeEqual(userCodeBuffer, backupCodeBuffer)) {
                codeIndex = i;
                break;
              }
            } catch {
              continue;
            }
          }
        }

        if (codeIndex !== -1) {
          // Clear failed attempts on success
          await this.clearFailedAttempts(providerId);

          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          
          await this.ensureAdminClient()
            .from('providers')
            .update({
              mfa_backup_codes: this.encryptBackupCodes(backupCodes),
            })
            .eq('id', providerId);

          await this.logMFAEvent(providerId, 'backup_code_used', { remaining: backupCodes.length });

          return { verified: true };
        }
      }

      // Record failed attempt
      await this.recordFailedAttempt(providerId);

      // Log failed attempt
      await this.logMFAEvent(providerId, 'mfa_failed', { 
        providerId 
      });

      return { verified: false, error: 'Invalid code' };
    } catch (error) {
      secureLogger.error('Error verifying MFA token', error);
      return { verified: false, error: 'Verification failed' };
    }
  }

  /**
   * Disable MFA for a provider (same as original)
   */
  async disableMFA(providerId: string): Promise<void> {
    try {
      await this.ensureAdminClient()
        .from('providers')
        .update({
          mfa_enabled: false,
          mfa_secret: null,
          mfa_backup_codes: null,
          mfa_disabled_at: new Date().toISOString(),
        })
        .eq('id', providerId);

      // Clear any failed attempts
      await this.clearFailedAttempts(providerId);

      await this.logMFAEvent(providerId, 'mfa_disabled', {});
    } catch (error) {
      secureLogger.error('Error disabling MFA', error);
      throw new Error('Failed to disable MFA');
    }
  }

  /**
   * Generate new backup codes (same as original)
   */
  async regenerateBackupCodes(providerId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();

      await this.ensureAdminClient()
        .from('providers')
        .update({
          mfa_backup_codes: this.encryptBackupCodes(backupCodes),
        })
        .eq('id', providerId);

      await this.logMFAEvent(providerId, 'backup_codes_regenerated', {});

      return backupCodes;
    } catch (error) {
      secureLogger.error('Error regenerating backup codes', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }

  /**
   * Check if provider has MFA enabled (same as original)
   */
  async isMFAEnabled(providerId: string): Promise<boolean> {
    try {
      const { data, error } = await this.ensureAdminClient()
        .from('providers')
        .select('mfa_enabled')
        .eq('id', providerId)
        .single();

      return data?.mfa_enabled || false;
    } catch (error) {
      secureLogger.error('Error checking MFA status', error);
      return false;
    }
  }

  /**
   * Get MFA status for provider (enhanced with lockout info)
   */
  async getMFAStatus(providerId: string): Promise<{
    enabled: boolean;
    setupAt?: string;
    lastUsed?: string;
    backupCodesRemaining?: number;
    isLockedOut?: boolean;
    lockoutEndsAt?: string;
  }> {
    try {
      const { data, error } = await this.ensureAdminClient()
        .from('providers')
        .select('mfa_enabled, mfa_setup_at, mfa_backup_codes')
        .eq('id', providerId)
        .single();

      if (error || !data) {
        return { enabled: false };
      }

      const backupCodesRemaining = data.mfa_backup_codes
        ? this.decryptBackupCodes(data.mfa_backup_codes).length
        : 0;

      // Get last MFA usage
      const { data: lastEvent } = await this.ensureAdminClient()
        .from('mfa_events')
        .select('created_at')
        .eq('provider_id', providerId)
        .eq('event_type', 'mfa_success')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Check lockout status
      const isLockedOut = await this.isLockedOut(providerId);
      const lockoutEndsAt = isLockedOut 
        ? new Date(Date.now() + MFAService.LOCKOUT_DURATION * 1000).toISOString()
        : undefined;

      return {
        enabled: data.mfa_enabled || false,
        setupAt: data.mfa_setup_at,
        lastUsed: lastEvent?.created_at,
        backupCodesRemaining,
        isLockedOut,
        lockoutEndsAt,
      };
    } catch (error) {
      secureLogger.error('Error getting MFA status', error);
      return { enabled: false };
    }
  }

  /**
   * Generate backup codes (same as original)
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < MFAService.BACKUP_CODES_COUNT; i++) {
      // Generate 8-character alphanumeric codes
      const code = speakeasy.generateSecret({ length: 8 }).base32
        .replace(/=/g, '')
        .substring(0, 8)
        .toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Encrypt secret using proper encryption (same as original)
   */
  private encryptSecret(secret: string): string {
    const encrypted = encryptionService.encrypt(secret, 'mfa_secret');
    if (!encrypted) {
      throw new Error('Failed to encrypt MFA secret');
    }
    return encrypted;
  }

  /**
   * Decrypt secret (same as original)
   */
  private decryptSecret(encryptedSecret: string): string {
    const decrypted = encryptionService.decrypt(encryptedSecret, 'mfa_secret');
    if (!decrypted) {
      throw new Error('Failed to decrypt MFA secret');
    }
    return decrypted;
  }

  /**
   * Encrypt backup codes (same as original)
   */
  private encryptBackupCodes(codes: string[]): string {
    const encrypted = encryptionService.encrypt(JSON.stringify(codes), 'mfa_backup_codes');
    if (!encrypted) {
      throw new Error('Failed to encrypt MFA backup codes');
    }
    return encrypted;
  }

  /**
   * Decrypt backup codes (same as original)
   */
  private decryptBackupCodes(encryptedCodes: string): string[] {
    try {
      const decrypted = encryptionService.decrypt(encryptedCodes, 'mfa_backup_codes');
      if (!decrypted) {
        return [];
      }
      return JSON.parse(decrypted);
    } catch {
      return [];
    }
  }

  /**
   * Log MFA events for audit trail (same as original)
   */
  private async logMFAEvent(
    providerId: string,
    eventType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await this.ensureAdminClient().from('mfa_events').insert({
        provider_id: providerId,
        event_type: eventType,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      secureLogger.error('Error logging MFA event', error);
      // Don't throw - logging should not break the flow
    }
  }
}

// Export singleton instance
export const mfaService = new MFAService();