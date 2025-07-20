/**
 * @file mfa.service.ts
 * @description Multi-Factor Authentication service using TOTP
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 * @copyright Lamsa 2025
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../config/supabase';
import { encryptionService } from './encryption.service';

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

  /**
   * Generate MFA secret for a provider
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
      const { error: updateError } = await supabaseAdmin
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
      console.error('Error generating MFA secret:', error);
      throw new Error('Failed to setup MFA');
    }
  }

  /**
   * Verify MFA token and enable MFA if first time
   */
  async verifyToken(
    providerId: string,
    token: string,
    isSetup: boolean = false
  ): Promise<MFAVerificationResult> {
    try {
      // Get provider MFA data
      const { data: provider, error } = await supabaseAdmin
        .from('providers')
        .select('mfa_secret, mfa_enabled, mfa_backup_codes')
        .eq('id', providerId)
        .single();

      if (error || !provider || !provider.mfa_secret) {
        return { verified: false, error: 'MFA not configured' };
      }

      const secret = this.decryptSecret(provider.mfa_secret);

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: MFAService.TOKEN_WINDOW,
      });

      if (verified) {
        // If this is the setup verification, enable MFA
        if (isSetup && !provider.mfa_enabled) {
          await supabaseAdmin
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

      // Check if it's a backup code
      if (provider.mfa_backup_codes) {
        const backupCodes = this.decryptBackupCodes(provider.mfa_backup_codes);
        const codeIndex = backupCodes.indexOf(token);

        if (codeIndex !== -1) {
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          
          await supabaseAdmin
            .from('providers')
            .update({
              mfa_backup_codes: this.encryptBackupCodes(backupCodes),
            })
            .eq('id', providerId);

          await this.logMFAEvent(providerId, 'backup_code_used', { remaining: backupCodes.length });

          return { verified: true };
        }
      }

      // Log failed attempt
      await this.logMFAEvent(providerId, 'mfa_failed', { token: token.substring(0, 3) + '***' });

      return { verified: false, error: 'Invalid code' };
    } catch (error) {
      console.error('Error verifying MFA token:', error);
      return { verified: false, error: 'Verification failed' };
    }
  }

  /**
   * Disable MFA for a provider
   */
  async disableMFA(providerId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('providers')
        .update({
          mfa_enabled: false,
          mfa_secret: null,
          mfa_backup_codes: null,
          mfa_disabled_at: new Date().toISOString(),
        })
        .eq('id', providerId);

      await this.logMFAEvent(providerId, 'mfa_disabled', {});
    } catch (error) {
      console.error('Error disabling MFA:', error);
      throw new Error('Failed to disable MFA');
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(providerId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();

      await supabaseAdmin
        .from('providers')
        .update({
          mfa_backup_codes: this.encryptBackupCodes(backupCodes),
        })
        .eq('id', providerId);

      await this.logMFAEvent(providerId, 'backup_codes_regenerated', {});

      return backupCodes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }

  /**
   * Check if provider has MFA enabled
   */
  async isMFAEnabled(providerId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('providers')
        .select('mfa_enabled')
        .eq('id', providerId)
        .single();

      return data?.mfa_enabled || false;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }

  /**
   * Get MFA status for provider
   */
  async getMFAStatus(providerId: string): Promise<{
    enabled: boolean;
    setupAt?: string;
    lastUsed?: string;
    backupCodesRemaining?: number;
  }> {
    try {
      const { data, error } = await supabaseAdmin
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
      const { data: lastEvent } = await supabaseAdmin
        .from('mfa_events')
        .select('created_at')
        .eq('provider_id', providerId)
        .eq('event_type', 'mfa_success')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        enabled: data.mfa_enabled || false,
        setupAt: data.mfa_setup_at,
        lastUsed: lastEvent?.created_at,
        backupCodesRemaining,
      };
    } catch (error) {
      console.error('Error getting MFA status:', error);
      return { enabled: false };
    }
  }

  /**
   * Generate backup codes
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
   * Encrypt secret using proper encryption
   */
  private encryptSecret(secret: string): string {
    const encrypted = encryptionService.encrypt(secret, 'mfa_secret');
    if (!encrypted) {
      throw new Error('Failed to encrypt MFA secret');
    }
    return encrypted;
  }

  /**
   * Decrypt secret
   */
  private decryptSecret(encryptedSecret: string): string {
    const decrypted = encryptionService.decrypt(encryptedSecret, 'mfa_secret');
    if (!decrypted) {
      throw new Error('Failed to decrypt MFA secret');
    }
    return decrypted;
  }

  /**
   * Encrypt backup codes
   */
  private encryptBackupCodes(codes: string[]): string {
    const encrypted = encryptionService.encrypt(JSON.stringify(codes), 'mfa_backup_codes');
    if (!encrypted) {
      throw new Error('Failed to encrypt MFA backup codes');
    }
    return encrypted;
  }

  /**
   * Decrypt backup codes
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
   * Log MFA events for audit trail
   */
  private async logMFAEvent(
    providerId: string,
    eventType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await supabaseAdmin.from('mfa_events').insert({
        provider_id: providerId,
        event_type: eventType,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging MFA event:', error);
      // Don't throw - logging should not break the flow
    }
  }
}

// Export singleton instance
export const mfaService = new MFAService();