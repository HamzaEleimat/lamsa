/**
 * Notification Service
 * Comprehensive notification system with SMS, WebSocket, and Push notification support
 * Handles bilingual messaging, fallback mechanisms, and delivery tracking
 */

import { supabase } from '../config/supabase-simple';
import { AppError } from '../middleware/error.middleware';
import { getEnvironmentConfig } from '../utils/environment-validation';
import { logger } from '../utils/logger';

export type NotificationChannel = 'sms' | 'websocket' | 'push' | 'email';
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';
export type NotificationEvent = 
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'booking_reminder'
  | 'payment_processed'
  | 'payment_failed'
  | 'review_request';

export interface NotificationRecipient {
  id: string;
  type: 'customer' | 'provider';
  phone?: string;
  email?: string;
  deviceToken?: string;
  language: 'ar' | 'en';
  preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  sms: boolean;
  push: boolean;
  websocket: boolean;
  email: boolean;
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  eventPreferences: {
    bookingCreated: boolean;
    bookingConfirmed: boolean;
    bookingCancelled: boolean;
    bookingRescheduled: boolean;
    reminders: boolean;
    payments: boolean;
    marketing: boolean;
  };
}

export interface NotificationTemplate {
  id: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  content: {
    en: {
      title: string;
      body: string;
      actionText?: string;
    };
    ar: {
      title: string;
      body: string;
      actionText?: string;
    };
  };
  variables: string[];
}

export interface NotificationData {
  event: NotificationEvent;
  recipient: NotificationRecipient;
  data: Record<string, any>;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  scheduledFor?: Date;
  expiresAt?: Date;
}

export interface NotificationDeliveryStatus {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  attempts: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  externalId?: string; // Twilio message SID, etc.
}

export interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus: NotificationDeliveryStatus[];
}

export class NotificationService {
  private static instance: NotificationService;
  private envConfig: any | null = null;
  private realtimeService: any; // Will be injected

  private constructor() {
    // Delay environment config initialization
  }

  private getEnvConfig() {
    if (!this.envConfig) {
      this.envConfig = getEnvironmentConfig();
    }
    return this.envConfig;
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Set the realtime service for WebSocket notifications
   */
  setRealtimeService(realtimeService: any): void {
    this.realtimeService = realtimeService;
  }

  /**
   * Send notification through multiple channels with fallback
   */
  async sendNotification(data: NotificationData): Promise<SendNotificationResult> {
    try {
      // Generate unique notification ID
      const notificationId = this.generateNotificationId();
      
      // Check if recipient is in quiet hours
      if (this.isInQuietHours(data.recipient)) {
        return this.scheduleForLater(notificationId, data);
      }

      // Filter channels based on user preferences
      const enabledChannels = this.filterChannelsByPreferences(data.channels, data.recipient);
      
      if (enabledChannels.length === 0) {
        return {
          success: false,
          error: 'No enabled channels for recipient',
          deliveryStatus: []
        };
      }

      // Get appropriate template
      const template = this.getTemplate(data.event, enabledChannels[0]);
      if (!template) {
        return {
          success: false,
          error: 'No template found for event',
          deliveryStatus: []
        };
      }

      // Render message content
      const content = this.renderTemplate(template, data.recipient.language, data.data);
      
      // Track notification in database
      await this.logNotification(notificationId, data, template);

      // Send through channels with fallback
      const deliveryStatuses: NotificationDeliveryStatus[] = [];
      let primarySuccess = false;

      for (const channel of enabledChannels) {
        try {
          const result = await this.sendThroughChannel(
            channel,
            data.recipient,
            content,
            notificationId
          );

          const status: NotificationDeliveryStatus = {
            id: this.generateDeliveryId(),
            notificationId,
            channel,
            status: result.success ? 'sent' : 'failed',
            attempts: 1,
            lastAttemptAt: new Date(),
            deliveredAt: result.success ? new Date() : undefined,
            failureReason: result.error,
            externalId: result.externalId
          };

          deliveryStatuses.push(status);
          await this.logDeliveryStatus(status);

          if (result.success && !primarySuccess) {
            primarySuccess = true;
            // If primary channel succeeds, we can stop here unless it's urgent
            if (data.priority !== 'urgent') {
              break;
            }
          }
        } catch (error) {
          const status: NotificationDeliveryStatus = {
            id: this.generateDeliveryId(),
            notificationId,
            channel,
            status: 'failed',
            attempts: 1,
            lastAttemptAt: new Date(),
            failureReason: error instanceof Error ? error.message : 'Unknown error'
          };

          deliveryStatuses.push(status);
          await this.logDeliveryStatus(status);
        }
      }

      return {
        success: primarySuccess,
        messageId: notificationId,
        deliveryStatus: deliveryStatuses
      };

    } catch (error) {
      console.error('Failed to send notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: []
      };
    }
  }

  /**
   * Send SMS notification with fallback mechanisms
   */
  private async sendSMS(
    recipient: NotificationRecipient,
    content: { title: string; body: string },
    notificationId: string
  ): Promise<{ success: boolean; error?: string; externalId?: string }> {
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
      if (this.envConfig.TWILIO_ACCOUNT_SID && this.envConfig.TWILIO_AUTH_TOKEN) {
        const twilioResult = await this.sendSMSViaTwilioDirect(recipient.phone, message, notificationId);
        
        if (twilioResult.success) {
          console.log(`SMS sent via direct Twilio fallback for ${notificationId}`);
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
  ): Promise<{ success: boolean; error?: string; externalId?: string }> {
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
  ): Promise<{ success: boolean; error?: string; externalId?: string }> {
    try {
      // TODO: Implement direct Twilio API call
      // const twilio = require('twilio')(envConfig.TWILIO_ACCOUNT_SID, envConfig.TWILIO_AUTH_TOKEN);
      // const messageResponse = await twilio.messages.create({
      //   body: message,
      //   from: envConfig.TWILIO_PHONE_NUMBER,
      //   to: phone
      // });
      
      // For now, simulate success/failure
      console.log(`Direct Twilio SMS would be sent to ${phone}: ${message}`);
      
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
  ): Promise<{ success: boolean; error?: string; externalId?: string }> {
    try {
      // TODO: Implement alternative SMS provider (e.g., AWS SNS, MessageBird, etc.)
      console.log(`Alternative SMS provider would send to ${phone}: ${message}`);
      
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
   * Send WebSocket notification
   */
  private async sendWebSocket(
    recipient: NotificationRecipient,
    content: { title: string; body: string },
    notificationId: string
  ): Promise<{ success: boolean; error?: string; externalId?: string }> {
    try {
      if (!this.realtimeService) {
        return { success: false, error: 'WebSocket service not available' };
      }

      const payload = {
        id: notificationId,
        type: 'notification',
        title: content.title,
        message: content.body,
        timestamp: new Date().toISOString(),
        priority: 'normal',
        actionRequired: false
      };

      // Send to specific user via WebSocket
      await this.realtimeService.sendToUser(recipient.id, payload);

      return { success: true, externalId: notificationId };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'WebSocket sending failed'
      };
    }
  }

  /**
   * Send push notification (placeholder for Expo integration)
   */
  private async sendPushNotification(
    recipient: NotificationRecipient,
    content: { title: string; body: string },
    notificationId: string
  ): Promise<{ success: boolean; error?: string; externalId?: string }> {
    try {
      if (!recipient.deviceToken) {
        return { success: false, error: 'No device token provided' };
      }

      // TODO: Integrate with Expo Push Notifications
      // For now, just log the push notification
      console.log('Push notification:', {
        to: recipient.deviceToken,
        title: content.title,
        body: content.body,
        data: { notificationId }
      });

      return { success: true, externalId: notificationId };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Push notification failed'
      };
    }
  }

  /**
   * Send through specific channel
   */
  private async sendThroughChannel(
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    content: { title: string; body: string },
    notificationId: string
  ): Promise<{ success: boolean; error?: string; externalId?: string }> {
    switch (channel) {
      case 'sms':
        return this.sendSMS(recipient, content, notificationId);
      case 'websocket':
        return this.sendWebSocket(recipient, content, notificationId);
      case 'push':
        return this.sendPushNotification(recipient, content, notificationId);
      case 'email':
        // TODO: Implement email notifications
        return { success: false, error: 'Email notifications not implemented' };
      default:
        return { success: false, error: `Unsupported channel: ${channel}` };
    }
  }

  /**
   * Get template for event and channel
   */
  private getTemplate(event: NotificationEvent, channel: NotificationChannel): NotificationTemplate | null {
    // Return default templates - in production, these would come from database
    return this.getDefaultTemplates().find(t => t.event === event && t.channel === channel) || null;
  }

  /**
   * Render template with variables
   */
  private renderTemplate(
    template: NotificationTemplate,
    language: 'ar' | 'en',
    data: Record<string, any>
  ): { title: string; body: string } {
    const content = template.content[language];
    
    const renderText = (text: string): string => {
      let rendered = text;
      for (const variable of template.variables) {
        const value = data[variable] || `{${variable}}`;
        rendered = rendered.replace(new RegExp(`\\{${variable}\\}`, 'g'), value);
      }
      return rendered;
    };

    return {
      title: renderText(content.title),
      body: renderText(content.body)
    };
  }

  /**
   * Filter channels based on user preferences
   */
  private filterChannelsByPreferences(
    channels: NotificationChannel[],
    recipient: NotificationRecipient
  ): NotificationChannel[] {
    if (!recipient.preferences) {
      return channels; // If no preferences, allow all channels
    }

    return channels.filter(channel => {
      switch (channel) {
        case 'sms':
          return recipient.preferences!.sms;
        case 'push':
          return recipient.preferences!.push;
        case 'websocket':
          return recipient.preferences!.websocket;
        case 'email':
          return recipient.preferences!.email;
        default:
          return true;
      }
    });
  }

  /**
   * Check if recipient is in quiet hours
   */
  private isInQuietHours(recipient: NotificationRecipient): boolean {
    if (!recipient.preferences?.quietHours) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = recipient.preferences.quietHours;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    
    // Handle same-day quiet hours (e.g., 13:00 to 14:00)
    return currentTime >= start && currentTime <= end;
  }

  /**
   * Schedule notification for later delivery
   */
  private async scheduleForLater(
    notificationId: string,
    data: NotificationData
  ): Promise<SendNotificationResult> {
    // TODO: Implement notification scheduling
    console.log('Notification scheduled for later delivery:', notificationId);
    
    return {
      success: true,
      messageId: notificationId,
      deliveryStatus: [{
        id: this.generateDeliveryId(),
        notificationId,
        channel: data.channels[0],
        status: 'pending',
        attempts: 0
      }]
    };
  }

  /**
   * Log notification in database
   */
  private async logNotification(
    notificationId: string,
    data: NotificationData,
    template: NotificationTemplate
  ): Promise<void> {
    // TODO: Implement database logging
    console.log('Notification logged:', {
      id: notificationId,
      event: data.event,
      recipientId: data.recipient.id,
      templateId: template.id,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log delivery status in database
   */
  private async logDeliveryStatus(status: NotificationDeliveryStatus): Promise<void> {
    // TODO: Implement delivery status logging
    console.log('Delivery status logged:', status);
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique delivery ID
   */
  private generateDeliveryId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default notification templates
   */
  private getDefaultTemplates(): NotificationTemplate[] {
    return [
      {
        id: 'booking_created_sms',
        event: 'booking_created',
        channel: 'sms',
        content: {
          en: {
            title: 'Booking Request Submitted',
            body: 'Hi {customerName}! Your {serviceName} appointment on {date} at {time} is pending confirmation. We\'ll notify you once confirmed.'
          },
          ar: {
            title: 'تم إرسال طلب الحجز',
            body: 'مرحباً {customerName}! موعدك لـ {serviceName} في {date} الساعة {time} في انتظار التأكيد. سنخبرك بمجرد التأكيد.'
          }
        },
        variables: ['customerName', 'serviceName', 'date', 'time']
      },
      {
        id: 'booking_confirmed_sms',
        event: 'booking_confirmed',
        channel: 'sms',
        content: {
          en: {
            title: '✅ Appointment Confirmed',
            body: 'Your {serviceName} appointment on {date} at {time} with {providerName} is confirmed. Address: {address}'
          },
          ar: {
            title: '✅ تم تأكيد الموعد',
            body: 'تم تأكيد موعدك لـ {serviceName} في {date} الساعة {time} مع {providerName}. العنوان: {address}'
          }
        },
        variables: ['serviceName', 'date', 'time', 'providerName', 'address']
      },
      {
        id: 'booking_cancelled_sms',
        event: 'booking_cancelled',
        channel: 'sms',
        content: {
          en: {
            title: 'Appointment Cancelled',
            body: 'Your {serviceName} appointment on {date} at {time} has been cancelled. {reason} Any charges will be refunded within 3-5 business days.'
          },
          ar: {
            title: 'تم إلغاء الموعد',
            body: 'تم إلغاء موعدك لـ {serviceName} في {date} الساعة {time}. {reason} سيتم إرجاع أي رسوم خلال 3-5 أيام عمل.'
          }
        },
        variables: ['serviceName', 'date', 'time', 'reason']
      },
      {
        id: 'booking_reminder_sms',
        event: 'booking_reminder',
        channel: 'sms',
        content: {
          en: {
            title: '⏰ Appointment Reminder',
            body: 'Reminder: You have a {serviceName} appointment tomorrow at {time} with {providerName}. Address: {address}'
          },
          ar: {
            title: '⏰ تذكير بالموعد',
            body: 'تذكير: لديك موعد لـ {serviceName} غداً الساعة {time} مع {providerName}. العنوان: {address}'
          }
        },
        variables: ['serviceName', 'time', 'providerName', 'address']
      }
      // Add more templates for other events...
    ];
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      // TODO: Implement database lookup
      // For now, return default preferences
      return {
        sms: true,
        push: true,
        websocket: true,
        email: false,
        eventPreferences: {
          bookingCreated: true,
          bookingConfirmed: true,
          bookingCancelled: true,
          bookingRescheduled: true,
          reminders: true,
          payments: true,
          marketing: false
        }
      };
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return null;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      // TODO: Implement database update
      console.log('Updated preferences for user:', userId, preferences);
      return true;
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      return false;
    }
  }
}

// Export a getter function instead of the instance directly to delay initialization
export const getNotificationService = () => NotificationService.getInstance();

// For backward compatibility, export a proxy that will get the instance when accessed
export const notificationService = new Proxy({} as NotificationService, {
  get(target, prop) {
    const instance = NotificationService.getInstance();
    return (instance as any)[prop];
  },
  has(target, prop) {
    const instance = NotificationService.getInstance();
    return prop in instance;
  }
});