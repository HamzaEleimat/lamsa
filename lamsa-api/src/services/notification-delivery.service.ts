/**
 * Notification Delivery Service
 * Handles delivery tracking, retry logic, and delivery status management
 */

import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { 
  NotificationChannel, 
  NotificationDeliveryStatus,
  NotificationRecipient,
  NotificationData 
} from './notification.service';
import { smsNotificationService } from './notification-sms.service';
import { websocketNotificationService } from './notification-websocket.service';
import { pushNotificationService } from './notification-push.service';

export interface DeliveryRetryConfig {
  maxRetries: number;
  retryDelays: number[]; // in milliseconds
  exponentialBackoff: boolean;
}

export interface DeliveryStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  expired: number;
}

export class NotificationDeliveryService {
  private static instance: NotificationDeliveryService;
  
  private readonly defaultRetryConfig: DeliveryRetryConfig = {
    maxRetries: 3,
    retryDelays: [5000, 15000, 60000], // 5s, 15s, 1m
    exponentialBackoff: false
  };

  private retrySchedulerInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Private constructor for singleton
    this.startRetryScheduler();
  }

  static getInstance(): NotificationDeliveryService {
    if (!NotificationDeliveryService.instance) {
      NotificationDeliveryService.instance = new NotificationDeliveryService();
    }
    return NotificationDeliveryService.instance;
  }

  /**
   * Track delivery attempt for a notification
   */
  async trackDelivery(
    notificationId: string,
    channel: NotificationChannel,
    status: NotificationDeliveryStatus['status'] = 'pending',
    externalId?: string
  ): Promise<string> {
    try {
      const deliveryId = this.generateDeliveryId();
      
      const deliveryStatus: Omit<NotificationDeliveryStatus, 'id'> = {
        notificationId,
        channel,
        status,
        attempts: status === 'pending' ? 0 : 1,
        lastAttemptAt: status === 'pending' ? undefined : new Date(),
        deliveredAt: status === 'delivered' ? new Date() : undefined,
        externalId
      };

      const { error } = await supabase
        .from('notification_delivery_status')
        .insert({
          id: deliveryId,
          ...deliveryStatus
        });

      if (error) {
        logger.error('Failed to track delivery:', error);
        throw new Error(`Failed to track delivery: ${error.message}`);
      }

      logger.info(`Delivery tracked: ${deliveryId} for notification ${notificationId} via ${channel}`);
      return deliveryId;

    } catch (error) {
      logger.error('Error tracking delivery:', error);
      throw error;
    }
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: NotificationDeliveryStatus['status'],
    errorMessage?: string,
    externalId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        last_attempt_at: new Date().toISOString()
      };

      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      } else if (status === 'failed' && errorMessage) {
        updateData.failure_reason = errorMessage;
      }

      if (externalId) {
        updateData.external_id = externalId;
      }

      // Increment attempts for failed deliveries
      if (status === 'failed') {
        const { error: incrementError } = await supabase
          .rpc('increment_delivery_attempts', { delivery_id: deliveryId });

        if (incrementError) {
          logger.warn(`Failed to increment attempts for ${deliveryId}:`, incrementError);
        }
      }

      const { error } = await supabase
        .from('notification_delivery_status')
        .update(updateData)
        .eq('id', deliveryId);

      if (error) {
        logger.error(`Failed to update delivery status for ${deliveryId}:`, error);
        throw new Error(`Failed to update delivery status: ${error.message}`);
      }

      logger.info(`Delivery status updated: ${deliveryId} -> ${status}`);

    } catch (error) {
      logger.error('Error updating delivery status:', error);
      throw error;
    }
  }

  /**
   * Get delivery statistics for a notification
   */
  async getDeliveryStats(notificationId: string): Promise<DeliveryStats> {
    try {
      const { data, error } = await supabase
        .from('notification_delivery_status')
        .select('status')
        .eq('notification_id', notificationId);

      if (error) {
        logger.error(`Failed to get delivery stats for ${notificationId}:`, error);
        return { total: 0, pending: 0, sent: 0, delivered: 0, failed: 0, expired: 0 };
      }

      const stats: DeliveryStats = {
        total: data?.length || 0,
        pending: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        expired: 0
      };

      data?.forEach(delivery => {
        stats[delivery.status as keyof DeliveryStats]++;
      });

      return stats;

    } catch (error) {
      logger.error('Error getting delivery stats:', error);
      return { total: 0, pending: 0, sent: 0, delivered: 0, failed: 0, expired: 0 };
    }
  }

  /**
   * Get all delivery statuses for a notification
   */
  async getDeliveryStatuses(notificationId: string): Promise<NotificationDeliveryStatus[]> {
    try {
      const { data, error } = await supabase
        .from('notification_delivery_status')
        .select('*')
        .eq('notification_id', notificationId)
        .order('last_attempt_at', { ascending: false });

      if (error) {
        logger.error(`Failed to get delivery statuses for ${notificationId}:`, error);
        return [];
      }

      return data?.map(row => ({
        id: row.id,
        notificationId: row.notification_id,
        channel: row.channel,
        status: row.status,
        attempts: row.attempts || 0,
        lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : undefined,
        deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
        failureReason: row.failure_reason,
        externalId: row.external_id
      })) || [];

    } catch (error) {
      logger.error('Error getting delivery statuses:', error);
      return [];
    }
  }

  /**
   * Retry failed deliveries
   */
  async retryFailedDeliveries(config?: Partial<DeliveryRetryConfig>): Promise<{
    attempted: number;
    successful: number;
    failed: number;
  }> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    
    try {
      // Get failed deliveries that haven't exceeded max retries
      const { data: failedDeliveries, error } = await supabase
        .from('notification_delivery_status')
        .select(`
          *,
          notifications (
            event,
            recipient_id,
            recipient_type,
            data
          )
        `)
        .eq('status', 'failed')
        .lt('attempts', retryConfig.maxRetries);

      if (error) {
        logger.error('Failed to get failed deliveries:', error);
        return { attempted: 0, successful: 0, failed: 0 };
      }

      if (!failedDeliveries?.length) {
        return { attempted: 0, successful: 0, failed: 0 };
      }

      let attempted = 0;
      let successful = 0;
      let failed = 0;

      for (const delivery of failedDeliveries) {
        try {
          // Check if enough time has passed since last attempt
          const lastAttempt = delivery.last_attempt_at ? new Date(delivery.last_attempt_at) : new Date(0);
          const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
          
          const retryDelay = retryConfig.exponentialBackoff
            ? retryConfig.retryDelays[0] * Math.pow(2, delivery.attempts)
            : retryConfig.retryDelays[Math.min(delivery.attempts, retryConfig.retryDelays.length - 1)];

          if (timeSinceLastAttempt < retryDelay) {
            continue; // Not enough time has passed
          }

          attempted++;
          
          const retryResult = await this.retryDelivery(delivery);
          
          if (retryResult.success) {
            successful++;
            await this.updateDeliveryStatus(delivery.id, 'sent', undefined, retryResult.externalId);
          } else {
            failed++;
            await this.updateDeliveryStatus(delivery.id, 'failed', retryResult.error);
          }

        } catch (error) {
          failed++;
          logger.error(`Error retrying delivery ${delivery.id}:`, error);
        }
      }

      logger.info(`Retry completed: ${attempted} attempted, ${successful} successful, ${failed} failed`);
      return { attempted, successful, failed };

    } catch (error) {
      logger.error('Error in retry failed deliveries:', error);
      return { attempted: 0, successful: 0, failed: 0 };
    }
  }

  /**
   * Retry a specific delivery
   */
  private async retryDelivery(delivery: any): Promise<{
    success: boolean;
    error?: string;
    externalId?: string;
  }> {
    try {
      if (!delivery.notifications) {
        return { success: false, error: 'No notification data found' };
      }

      const notification = delivery.notifications;
      
      // Reconstruct recipient from notification data
      const recipient: NotificationRecipient = {
        id: notification.recipient_id,
        type: notification.recipient_type,
        language: notification.data?.language || 'ar',
        // Additional recipient data would need to be fetched if required
      };

      // Get content from notification data
      const content = {
        title: notification.data?.title || 'Notification',
        body: notification.data?.body || 'You have a new notification'
      };

      // Retry based on channel
      switch (delivery.channel) {
        case 'sms':
          if (!recipient.phone) {
            // Fetch phone number from user data
            const { data: userData } = await supabase
              .from('users')
              .select('phone')
              .eq('id', recipient.id)
              .single();
            
            if (userData?.phone) {
              recipient.phone = userData.phone;
            } else {
              return { success: false, error: 'No phone number found' };
            }
          }
          return await smsNotificationService.sendSMS(recipient, content, delivery.notification_id);

        case 'push':
          if (!recipient.deviceToken) {
            // Fetch device token from user data
            const { data: tokenData } = await supabase
              .from('user_device_tokens')
              .select('token')
              .eq('user_id', recipient.id)
              .eq('active', true)
              .limit(1)
              .single();
            
            if (tokenData?.token) {
              recipient.deviceToken = tokenData.token;
            } else {
              return { success: false, error: 'No device token found' };
            }
          }
          return await pushNotificationService.sendPushNotification(
            recipient, 
            content, 
            delivery.notification_id
          );

        case 'websocket':
          return await websocketNotificationService.sendToUser(
            recipient,
            content,
            delivery.notification_id
          );

        default:
          return { success: false, error: `Unsupported channel for retry: ${delivery.channel}` };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during retry'
      };
    }
  }

  /**
   * Mark expired deliveries
   */
  async markExpiredDeliveries(): Promise<number> {
    try {
      // Mark deliveries as expired if they've been pending for too long
      const expirationThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const { data, error } = await supabase
        .from('notification_delivery_status')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('created_at', expirationThreshold.toISOString())
        .select('id');

      if (error) {
        logger.error('Failed to mark expired deliveries:', error);
        return 0;
      }

      const expiredCount = data?.length || 0;
      if (expiredCount > 0) {
        logger.info(`Marked ${expiredCount} deliveries as expired`);
      }

      return expiredCount;

    } catch (error) {
      logger.error('Error marking expired deliveries:', error);
      return 0;
    }
  }

  /**
   * Start the retry scheduler
   */
  private startRetryScheduler(): void {
    // Run retry logic every 5 minutes
    this.retrySchedulerInterval = setInterval(async () => {
      try {
        await this.retryFailedDeliveries();
        await this.markExpiredDeliveries();
      } catch (error) {
        logger.error('Retry scheduler error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    logger.info('Notification delivery retry scheduler started');
  }

  /**
   * Stop the retry scheduler
   */
  stopRetryScheduler(): void {
    if (this.retrySchedulerInterval) {
      clearInterval(this.retrySchedulerInterval);
      this.retrySchedulerInterval = null;
      logger.info('Notification delivery retry scheduler stopped');
    }
  }

  /**
   * Generate unique delivery ID
   */
  private generateDeliveryId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get delivery service statistics
   */
  async getServiceStats(days: number = 7): Promise<{
    totalDeliveries: number;
    deliveriesByStatus: Record<string, number>;
    deliveriesByChannel: Record<string, number>;
    averageRetries: number;
  }> {
    try {
      const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('notification_delivery_status')
        .select('status, channel, attempts')
        .gte('created_at', dateThreshold.toISOString());

      if (error) {
        logger.error('Failed to get service stats:', error);
        return {
          totalDeliveries: 0,
          deliveriesByStatus: {},
          deliveriesByChannel: {},
          averageRetries: 0
        };
      }

      const stats = {
        totalDeliveries: data?.length || 0,
        deliveriesByStatus: {} as Record<string, number>,
        deliveriesByChannel: {} as Record<string, number>,
        averageRetries: 0
      };

      let totalAttempts = 0;

      data?.forEach(delivery => {
        // By status
        stats.deliveriesByStatus[delivery.status] = 
          (stats.deliveriesByStatus[delivery.status] || 0) + 1;

        // By channel
        stats.deliveriesByChannel[delivery.channel] = 
          (stats.deliveriesByChannel[delivery.channel] || 0) + 1;

        // Total attempts for average calculation
        totalAttempts += delivery.attempts || 0;
      });

      stats.averageRetries = stats.totalDeliveries > 0 
        ? totalAttempts / stats.totalDeliveries 
        : 0;

      return stats;

    } catch (error) {
      logger.error('Error getting service stats:', error);
      return {
        totalDeliveries: 0,
        deliveriesByStatus: {},
        deliveriesByChannel: {},
        averageRetries: 0
      };
    }
  }
}

// Export singleton instance
export const deliveryService = NotificationDeliveryService.getInstance();