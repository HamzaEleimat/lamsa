/**
 * SMS Notification Service
 * Handles SMS sending functionality with multiple provider support and fallbacks
 */

import { supabase } from '../config/supabase';
import { getEnvironmentConfig } from '../utils/environment-validation';
import { logger } from '../utils/logger';
import { NotificationRecipient } from './notification.service';

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

      // Primary: Send via Supabase/Twilio
      const primaryResult = await this.sendSMSViaSupabase(recipient.phone, message, notificationId);
      
      if (primaryResult.success) {
        return primaryResult;
      }

      logger.warn(`Primary SMS failed for ${notificationId}: ${primaryResult.error}`);

      // Fallback 1: Direct Twilio API (if configured)
      const envConfig = this.getEnvConfig();
      if (envConfig.TWILIO_ACCOUNT_SID && envConfig.TWILIO_AUTH_TOKEN) {
        const twilioResult = await this.sendSMSViaTwilioDirect(recipient.phone, message, notificationId);
        
        if (twilioResult.success) {
          logger.info(`SMS sent via direct Twilio fallback for ${notificationId}`);
          return twilioResult;
        }
        
        logger.warn(`Direct Twilio fallback failed for ${notificationId}: ${twilioResult.error}`);
      }

      // Fallback 2: Alternative SMS provider (placeholder)
      // const altProviderResult = await this.sendSMSViaAlternativeProvider(recipient.phone, message, notificationId);

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
   * Send SMS via direct Twilio API (fallback)
   */
  private async sendSMSViaTwilioDirect(
    phone: string,
    message: string,
    notificationId: string
  ): Promise<SMSSendResult> {
    try {
      // TODO: Implement direct Twilio API call
      // const twilio = require('twilio')(envConfig.TWILIO_ACCOUNT_SID, envConfig.TWILIO_AUTH_TOKEN);
      // const messageResponse = await twilio.messages.create({
      //   body: message,
      //   from: envConfig.TWILIO_PHONE_NUMBER,
      //   to: phone
      // });
      
      // For now, simulate success/failure
      logger.info(`Direct Twilio SMS would be sent to ${phone}: ${message}`);
      
      return {
        success: false, // Set to false until implemented
        error: 'Direct Twilio integration not implemented yet'
      };

    } catch (error) {
      return {
        success: false,
        error: `Direct Twilio: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Send SMS via alternative provider (placeholder)
   */
  private async sendSMSViaAlternativeProvider(
    phone: string,
    message: string,
    notificationId: string
  ): Promise<SMSSendResult> {
    try {
      // TODO: Implement alternative SMS provider (e.g., AWS SNS, MessageBird, etc.)
      logger.info(`Alternative SMS provider would send to ${phone}: ${message}`);
      
      return {
        success: false, // Set to false until implemented
        error: 'Alternative SMS provider not implemented yet'
      };

    } catch (error) {
      return {
        success: false,
        error: `Alternative provider: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    const providers: string[] = ['supabase'];
    
    if (envConfig.TWILIO_ACCOUNT_SID && envConfig.TWILIO_AUTH_TOKEN) {
      providers.push('twilio-direct');
    }

    return {
      available: providers.length > 0,
      providers
    };
  }
}

// Export singleton instance
export const smsNotificationService = SMSNotificationService.getInstance();