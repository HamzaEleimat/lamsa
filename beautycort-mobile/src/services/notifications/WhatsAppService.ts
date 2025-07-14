import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { 
  NotificationData, 
  NotificationDeliveryResult, 
  NotificationChannel,
  WhatsAppMessage,
  WhatsAppTemplate,
  WhatsAppTemplateLanguage
} from './types';

export class WhatsAppService {
  private static instance: WhatsAppService;
  private baseURL: string = 'https://api.whatsapp.com/v1';
  private businessPhoneNumber: string = '';
  private accessToken: string = '';
  
  // Template IDs for different notification types
  private templates: Map<string, WhatsAppTemplate> = new Map([
    ['new_booking', {
      id: 'new_booking_notification',
      name: 'new_booking_notification',
      language: 'ar',
      components: [
        {
          type: 'header',
          parameters: [
            { type: 'text', text: 'حجز جديد' }
          ]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: '{{1}}' }, // Customer name
            { type: 'text', text: '{{2}}' }, // Service name
            { type: 'text', text: '{{3}}' }, // Date
            { type: 'text', text: '{{4}}' }  // Time
          ]
        }
      ]
    }],
    ['booking_reminder', {
      id: 'booking_reminder',
      name: 'booking_reminder',
      language: 'ar',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: '{{1}}' }, // Time until appointment
            { type: 'text', text: '{{2}}' }, // Customer name
            { type: 'text', text: '{{3}}' }  // Service name
          ]
        }
      ]
    }],
    ['payment_received', {
      id: 'payment_confirmation',
      name: 'payment_confirmation',
      language: 'ar',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: '{{1}}' }, // Amount
            { type: 'text', text: '{{2}}' }, // Customer name
            { type: 'text', text: '{{3}}' }  // Service name
          ]
        }
      ]
    }]
  ]);
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }
  
  private initialize() {
    // TODO: Load credentials from environment
    // this.businessPhoneNumber = process.env.WHATSAPP_BUSINESS_NUMBER;
    // this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  }
  
  async sendNotification(
    notification: NotificationData,
    phoneNumber: string
  ): Promise<NotificationDeliveryResult> {
    try {
      // For development, use WhatsApp URL scheme
      if (__DEV__ || !this.isConfigured()) {
        return await this.sendViaURLScheme(notification, phoneNumber);
      }
      
      // For production, use WhatsApp Business API
      return await this.sendViaBusinessAPI(notification, phoneNumber);
    } catch (error) {
      return {
        notificationId: notification.id,
        channel: NotificationChannel.WHATSAPP,
        status: 'failed',
        error: error.message,
      };
    }
  }
  
  private isConfigured(): boolean {
    return !!(this.businessPhoneNumber && this.accessToken);
  }
  
  private async sendViaURLScheme(
    notification: NotificationData,
    phoneNumber: string
  ): Promise<NotificationDeliveryResult> {
    // Format phone number for WhatsApp (remove + and spaces)
    const formattedPhone = phoneNumber.replace(/[\s+]/g, '');
    
    // Prepare message
    const message = this.formatMessage(notification);
    
    // Create WhatsApp URL
    const whatsappURL = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    
    // Check if WhatsApp is installed
    const canOpen = await Linking.canOpenURL(whatsappURL);
    
    if (!canOpen) {
      // Fallback to web WhatsApp
      const webURL = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      await Linking.openURL(webURL);
    } else {
      await Linking.openURL(whatsappURL);
    }
    
    return {
      notificationId: notification.id,
      channel: NotificationChannel.WHATSAPP,
      status: 'sent',
      sentAt: new Date(),
      cost: 0,
    };
  }
  
  private async sendViaBusinessAPI(
    notification: NotificationData,
    phoneNumber: string
  ): Promise<NotificationDeliveryResult> {
    // Format phone number (ensure it starts with country code)
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    
    // Get appropriate template
    const template = this.getTemplate(notification);
    
    if (!template) {
      // Fallback to text message
      return await this.sendTextMessage(notification, formattedPhone);
    }
    
    // Send template message
    const response = await this.sendTemplateMessage(
      formattedPhone,
      template,
      notification
    );
    
    return {
      notificationId: notification.id,
      channel: NotificationChannel.WHATSAPP,
      status: response.success ? 'sent' : 'failed',
      sentAt: new Date(),
      cost: 0, // Within free tier (1000 messages/month)
      messageId: response.messageId,
    };
  }
  
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add Jordan country code if not present
    if (!cleaned.startsWith('962')) {
      // Remove leading 0 if present
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '962' + cleaned;
    }
    
    return cleaned;
  }
  
  private formatMessage(notification: NotificationData): string {
    const isArabic = notification.bodyAr != null;
    const title = isArabic ? notification.titleAr || notification.title : notification.title;
    const body = isArabic ? notification.bodyAr || notification.body : notification.body;
    
    let message = `*${title}*\n\n${body}`;
    
    // Add action buttons as text
    if (notification.actions && notification.actions.length > 0) {
      message += '\n\n';
      notification.actions.forEach(action => {
        const actionTitle = isArabic ? action.titleAr || action.title : action.title;
        message += `• ${actionTitle}\n`;
      });
    }
    
    return message;
  }
  
  private getTemplate(notification: NotificationData): WhatsAppTemplate | null {
    // Map notification type to template
    const templateMap: Record<string, string> = {
      'NEW_BOOKING': 'new_booking',
      'BOOKING_REMINDER': 'booking_reminder',
      'PAYMENT_RECEIVED': 'payment_received',
    };
    
    const templateKey = templateMap[notification.type];
    return templateKey ? this.templates.get(templateKey) || null : null;
  }
  
  private async sendTextMessage(
    notification: NotificationData,
    phoneNumber: string
  ): Promise<any> {
    const message = this.formatMessage(notification);
    
    // TODO: Implement actual API call
    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: {
        body: message
      }
    };
    
    console.log('Sending WhatsApp text message:', payload);
    
    // Simulate success for now
    return {
      success: true,
      messageId: `mock_${Date.now()}`,
    };
  }
  
  private async sendTemplateMessage(
    phoneNumber: string,
    template: WhatsAppTemplate,
    notification: NotificationData
  ): Promise<any> {
    // Extract parameters from notification data
    const parameters = this.extractTemplateParameters(template, notification);
    
    // TODO: Implement actual API call
    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: template.name,
        language: {
          code: template.language
        },
        components: parameters
      }
    };
    
    console.log('Sending WhatsApp template message:', payload);
    
    // Simulate success for now
    return {
      success: true,
      messageId: `mock_template_${Date.now()}`,
    };
  }
  
  private extractTemplateParameters(
    template: WhatsAppTemplate,
    notification: NotificationData
  ): any[] {
    // This would be customized based on notification type and data
    const { data } = notification;
    
    if (notification.type === 'NEW_BOOKING' && data) {
      return [
        {
          type: 'header',
          parameters: [{ type: 'text', text: 'حجز جديد' }]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.customerName || 'عميل' },
            { type: 'text', text: data.serviceName || 'خدمة' },
            { type: 'text', text: data.date || 'اليوم' },
            { type: 'text', text: data.time || 'الآن' }
          ]
        }
      ];
    }
    
    // Default parameters
    return template.components;
  }
  
  // Utility method to check if a number is registered on WhatsApp
  async checkNumberStatus(phoneNumber: string): Promise<boolean> {
    // TODO: Implement WhatsApp Business API check
    // For now, assume all Jordan mobile numbers are on WhatsApp
    const cleaned = phoneNumber.replace(/\D/g, '');
    const jordanMobilePattern = /^(962)?(77|78|79)\d{7}$/;
    return jordanMobilePattern.test(cleaned);
  }
  
  // Get delivery status of a message
  async getMessageStatus(messageId: string): Promise<string> {
    // TODO: Implement webhook handling for message status
    return 'delivered';
  }
}