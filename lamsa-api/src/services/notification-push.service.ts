/**
 * Push Notification Service
 * Handles push notifications via Expo and other push notification providers
 */

import { getEnvironmentConfig } from '../utils/environment-validation';
import { logger } from '../utils/logger';
import { NotificationRecipient } from './notification.service';

export interface PushSendResult {
  success: boolean;
  error?: string;
  externalId?: string;
}

export interface ExpoPushMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
  expiration?: number;
  channelId?: string;
}

export interface BulkPushResult {
  successful: number;
  failed: number;
  results: PushSendResult[];
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private envConfig: any | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private getEnvConfig() {
    if (!this.envConfig) {
      this.envConfig = getEnvironmentConfig();
    }
    return this.envConfig;
  }

  /**
   * Send push notification to a single recipient
   */
  async sendPushNotification(
    recipient: NotificationRecipient,
    content: { title: string; body: string },
    notificationId: string,
    additionalData?: Record<string, any>
  ): Promise<PushSendResult> {
    try {
      if (!recipient.deviceToken) {
        return { success: false, error: 'No device token provided' };
      }

      const message: ExpoPushMessage = {
        to: recipient.deviceToken,
        title: content.title,
        body: content.body,
        data: {
          notificationId,
          recipientId: recipient.id,
          recipientType: recipient.type,
          ...additionalData
        },
        sound: 'default',
        priority: 'high'
      };

      // Primary: Send via Expo Push API
      const expoResult = await this.sendViaExpo([message]);
      
      if (expoResult.successful > 0) {
        logger.info(`Push notification sent successfully to ${recipient.id}: ${notificationId}`);
        return { 
          success: true, 
          externalId: expoResult.results[0]?.externalId || notificationId 
        };
      }

      // If Expo fails, try alternative providers
      const altResult = await this.sendViaAlternativeProvider(recipient, content, notificationId);
      
      return altResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Push notification failed';
      logger.error(`Push notification failed for ${recipient.id}:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send push notifications to multiple recipients in bulk
   */
  async sendBulkPushNotifications(
    notifications: Array<{
      recipient: NotificationRecipient;
      content: { title: string; body: string };
      notificationId: string;
      additionalData?: Record<string, any>;
    }>
  ): Promise<BulkPushResult> {
    try {
      const messages: ExpoPushMessage[] = notifications
        .filter(notif => notif.recipient.deviceToken)
        .map(notif => ({
          to: notif.recipient.deviceToken!,
          title: notif.content.title,
          body: notif.content.body,
          data: {
            notificationId: notif.notificationId,
            recipientId: notif.recipient.id,
            recipientType: notif.recipient.type,
            ...notif.additionalData
          },
          sound: 'default',
          priority: 'high'
        }));

      if (messages.length === 0) {
        return {
          successful: 0,
          failed: notifications.length,
          results: notifications.map(() => ({ 
            success: false, 
            error: 'No device token provided' 
          }))
        };
      }

      const result = await this.sendViaExpo(messages);
      
      logger.info(`Bulk push notifications sent: ${result.successful} successful, ${result.failed} failed`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk push notifications failed';
      logger.error('Bulk push notification error:', errorMessage);
      
      return {
        successful: 0,
        failed: notifications.length,
        results: notifications.map(() => ({ success: false, error: errorMessage }))
      };
    }
  }

  /**
   * Send push notifications via Expo Push API
   */
  private async sendViaExpo(messages: ExpoPushMessage[]): Promise<BulkPushResult> {
    try {
      // TODO: Implement actual Expo Push API integration
      // For now, simulate the API call
      
      const envConfig = this.getEnvConfig();
      if (!envConfig.EXPO_ACCESS_TOKEN) {
        logger.warn('Expo access token not configured');
        return {
          successful: 0,
          failed: messages.length,
          results: messages.map(() => ({ 
            success: false, 
            error: 'Expo access token not configured' 
          }))
        };
      }

      // Simulate API call with some success/failure
      const results: PushSendResult[] = [];
      let successful = 0;
      let failed = 0;

      for (const message of messages) {
        // Simulate 90% success rate
        const isSuccess = Math.random() > 0.1;
        
        if (isSuccess) {
          results.push({
            success: true,
            externalId: `expo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
          successful++;
          
          // Log for development
          logger.info('Push notification (simulated):', {
            to: message.to,
            title: message.title,
            body: message.body,
            data: message.data
          });
        } else {
          results.push({
            success: false,
            error: 'Simulated Expo push notification failure'
          });
          failed++;
        }
      }

      return { successful, failed, results };

      /* TODO: Replace simulation with actual Expo API call
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${envConfig.EXPO_ACCESS_TOKEN}`
        },
        body: JSON.stringify(messages)
      });

      const data = await response.json();
      
      const results: PushSendResult[] = data.data.map((result: any, index: number) => ({
        success: result.status === 'ok',
        error: result.status === 'error' ? result.message : undefined,
        externalId: result.id
      }));

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      return { successful, failed, results };
      */

    } catch (error) {
      logger.error('Expo push notification error:', error);
      
      return {
        successful: 0,
        failed: messages.length,
        results: messages.map(() => ({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Expo API error' 
        }))
      };
    }
  }

  /**
   * Send push notification via alternative provider (FCM, APNS, etc.)
   */
  private async sendViaAlternativeProvider(
    recipient: NotificationRecipient,
    content: { title: string; body: string },
    notificationId: string
  ): Promise<PushSendResult> {
    try {
      // TODO: Implement alternative push notification providers
      // For now, just log the attempt
      
      logger.info('Alternative push notification (placeholder):', {
        recipientId: recipient.id,
        deviceToken: recipient.deviceToken,
        title: content.title,
        body: content.body,
        notificationId
      });

      return {
        success: false,
        error: 'Alternative push notification providers not implemented yet'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Alternative provider error'
      };
    }
  }

  /**
   * Validate device token format
   */
  validateDeviceToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Expo push token format
    const expoTokenPattern = /^Expo(nent)?PushToken\[.+\]$/;
    if (expoTokenPattern.test(token)) {
      return true;
    }

    // FCM token format (basic validation)
    const fcmTokenPattern = /^[a-zA-Z0-9_-]{140,}$/;
    if (fcmTokenPattern.test(token)) {
      return true;
    }

    // APNS token format (basic validation)
    const apnsTokenPattern = /^[a-f0-9]{64}$/i;
    if (apnsTokenPattern.test(token)) {
      return true;
    }

    return false;
  }

  /**
   * Get push notification service status
   */
  getServiceStatus(): { 
    available: boolean; 
    expoConfigured: boolean; 
    alternativeProviders: string[] 
  } {
    const envConfig = this.getEnvConfig();
    
    return {
      available: true,
      expoConfigured: !!envConfig.EXPO_ACCESS_TOKEN,
      alternativeProviders: [] // Add when implemented
    };
  }

  /**
   * Schedule push notification for later delivery
   */
  async schedulePushNotification(
    recipient: NotificationRecipient,
    content: { title: string; body: string },
    notificationId: string,
    scheduleTime: Date,
    additionalData?: Record<string, any>
  ): Promise<PushSendResult> {
    try {
      // TODO: Implement push notification scheduling
      logger.info('Push notification scheduled (placeholder):', {
        recipientId: recipient.id,
        notificationId,
        scheduleTime: scheduleTime.toISOString(),
        title: content.title
      });

      return {
        success: true,
        externalId: `scheduled_${notificationId}`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scheduling failed'
      };
    }
  }

  /**
   * Cancel scheduled push notification
   */
  async cancelScheduledPushNotification(notificationId: string): Promise<boolean> {
    try {
      // TODO: Implement scheduled notification cancellation
      logger.info(`Scheduled push notification cancelled (placeholder): ${notificationId}`);
      return true;

    } catch (error) {
      logger.error(`Failed to cancel scheduled push notification ${notificationId}:`, error);
      return false;
    }
  }

  /**
   * Get push notification delivery receipt (for Expo)
   */
  async getDeliveryReceipt(receiptId: string): Promise<{
    status: 'ok' | 'error';
    error?: string;
  } | null> {
    try {
      // TODO: Implement Expo receipt checking
      logger.info(`Checking push notification receipt (placeholder): ${receiptId}`);
      
      return {
        status: 'ok'
      };

    } catch (error) {
      logger.error(`Failed to get push notification receipt ${receiptId}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();