/**
 * SMS Notification Service
 * Handles SMS sending functionality with Blunet SMS Gateway for Jordan
 */

import { supabase } from '../config/supabase';
import { getEnvironmentConfig } from '../utils/environment-validation';
import { logger } from '../utils/logger';
import { NotificationRecipient } from './notification.service';
import { blunetSMSService } from './blunet-sms.service';

export interface SMSSendResult {
  success: boolean;
  error?: string;
  externalId?: string;
}

export class SMSNotificationService {
  private static instance: SMSNotificationService;
  private envConfig: any | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SMSNotificationService {
    if (!SMSNotificationService.instance) {
      SMSNotificationService.instance = new SMSNotificationService();
    }
    return SMSNotificationService.instance;
  }

  private getEnvConfig() {
    if (!this.envConfig) {
      this.envConfig = getEnvironmentConfig();
    }
    return this.envConfig;
  }

  /**
   * Send SMS notification with fallback mechanisms
   */
  async sendSMS(
    recipient: NotificationRecipient,
    content: { title: string; body: string },
    notificationId: string
  ): Promise<SMSSendResult> {
    try {
      if (!recipient.phone) {
        return { success: false, error: 'No phone number provided' };
      }

      // Combine title and body for SMS
      const message = content.title 
        ? `${content.title}\n\n${content.body}` 
        : content.body;

      // Primary: Send via Blunet SMS Gateway
      const primaryResult = await this.sendSMSViaBlunet(recipient.phone, message, notificationId);
      
      if (primaryResult.success) {
        return primaryResult;
      }

      logger.warn(`Primary SMS failed for ${notificationId}: ${primaryResult.error}`);

      // Fallback: Try Supabase OTP (if configured)
      const envConfig = this.getEnvConfig();
      if (envConfig.ENABLE_MOCK_OTP) {
        const supabaseResult = await this.sendSMSViaSupabase(recipient.phone, message, notificationId);
        
        if (supabaseResult.success) {
          logger.info(`SMS sent via Supabase mock OTP for ${notificationId}`);
          return supabaseResult;
        }
        
        logger.warn(`Supabase fallback failed for ${notificationId}: ${supabaseResult.error}`);
      }

      // Final fallback: Return primary error
      return primaryResult;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS sending failed'
      };
    }
  }

  /**
   * Send SMS via Supabase/Twilio integration
   */
  private async sendSMSViaSupabase(
    phone: string,
    message: string,
    notificationId: string
  ): Promise<SMSSendResult> {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms',
          data: {
            message,
            notificationId,
            isNotification: true
          }
        }
      });

      if (error) {
        return { success: false, error: `Supabase SMS: ${error.message}` };
      }

      return {
        success: true,
        externalId: data.messageId || notificationId
      };

    } catch (error) {
      return {
        success: false,
        error: `Supabase SMS exception: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Send SMS via Blunet SMS Gateway
   */
  private async sendSMSViaBlunet(
    phone: string,
    message: string,
    notificationId: string
  ): Promise<SMSSendResult> {
    try {
      // Check if Blunet is configured
      if (!blunetSMSService.isConfigured()) {
        logger.warn('Blunet SMS service not configured');
        return {
          success: false,
          error: 'SMS service not configured'
        };
      }

      // Send SMS via Blunet
      const result = await blunetSMSService.sendSMS(phone, message);
      
      if (result.success) {
        logger.info(`SMS sent successfully via Blunet for ${notificationId}`, {
          messageId: result.messageId,
          phone
        });
        
        return {
          success: true,
          externalId: result.messageId || notificationId
        };
      }
      
      logger.error(`Blunet SMS failed for ${notificationId}`, {
        error: result.error,
        errorCode: result.errorCode,
        phone
      });
      
      return {
        success: false,
        error: result.error || 'SMS sending failed'
      };

    } catch (error) {
      logger.error(`Blunet SMS exception for ${notificationId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        phone
      });
      
      return {
        success: false,
        error: `Blunet SMS: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check SMS delivery status via Blunet
   */
  async checkSMSStatus(messageId: string): Promise<{
    status: string;
    description: string;
  }> {
    try {
      return await blunetSMSService.checkStatus(messageId);
    } catch (error) {
      logger.error('Error checking SMS status', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        status: 'ERROR',
        description: 'Failed to check status'
      };
    }
  }

  /**
   * Check SMS balance via Blunet
   */
  async checkSMSBalance(): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      return await blunetSMSService.checkBalance();
    } catch (error) {
      logger.error('Error checking SMS balance', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Balance check failed'
      };
    }
  }

  /**
   * Validate phone number format (Jordan specific)
   */
  validatePhoneNumber(phone: string): boolean {
    // Jordan phone number pattern: +962 followed by 77, 78, or 79, then 7 digits
    const jordanPattern = /^\+962(77|78|79)\d{7}$/;
    return jordanPattern.test(phone);
  }

  /**
   * Get SMS service status
   */
  getServiceStatus(): { available: boolean; providers: string[] } {
    const envConfig = this.getEnvConfig();
    const providers: string[] = [];
    
    // Check Blunet configuration
    if (blunetSMSService.isConfigured()) {
      providers.push('blunet');
    }
    
    // Check mock OTP for development
    if (envConfig.ENABLE_MOCK_OTP) {
      providers.push('mock-otp');
    }

    return {
      available: providers.length > 0,
      providers
    };
  }
}

// Export singleton instance
export const smsNotificationService = SMSNotificationService.getInstance();