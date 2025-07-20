import { 
  NotificationData, 
  NotificationDeliveryResult, 
  NotificationChannel,
  NotificationPreferences,
  NOTIFICATION_COSTS,
} from './types';

interface SMSConfig {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  testMode: boolean;
}

interface SMSMessage {
  to: string;
  body: string;
  from?: string;
  statusCallback?: string;
}

export class SMSService {
  private static instance: SMSService;
  private config: SMSConfig = {
    testMode: true, // Default to test mode
  };
  private twilioClient: any = null;
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }
  
  private initialize() {
    // TODO: Load Twilio credentials from environment
    // this.config.accountSid = process.env.TWILIO_ACCOUNT_SID;
    // this.config.authToken = process.env.TWILIO_AUTH_TOKEN;
    // this.config.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (this.isConfigured()) {
      // Initialize Twilio client
      // this.twilioClient = new Twilio(this.config.accountSid, this.config.authToken);
    }
  }
  
  private isConfigured(): boolean {
    return !!(this.config.accountSid && this.config.authToken && this.config.fromNumber);
  }
  
  async sendSMS(
    notification: NotificationData,
    phoneNumber: string,
    preferences: NotificationPreferences
  ): Promise<NotificationDeliveryResult> {
    try {
      // Validate phone number
      const validatedPhone = this.validatePhoneNumber(phoneNumber);
      if (!validatedPhone) {
        throw new Error('Invalid phone number');
      }
      
      // Check if we should send based on preferences
      if (!this.shouldSendSMS(notification, preferences)) {
        return {
          notificationId: notification.id,
          channel: NotificationChannel.SMS,
          status: 'skipped',
          error: 'SMS disabled by user preferences',
        };
      }
      
      // Prepare message
      const message = this.formatSMSMessage(notification, preferences);
      
      // Send SMS
      let result;
      if (this.config.testMode || !this.isConfigured()) {
        result = await this.sendTestSMS(validatedPhone, message);
      } else {
        result = await this.sendTwilioSMS(validatedPhone, message);
      }
      
      return {
        notificationId: notification.id,
        channel: NotificationChannel.SMS,
        status: 'sent',
        sentAt: new Date(),
        cost: NOTIFICATION_COSTS.SMS.basePrice,
        messageId: result.sid,
      };
    } catch (error) {
      return {
        notificationId: notification.id,
        channel: NotificationChannel.SMS,
        status: 'failed',
        error: error.message,
      };
    }
  }
  
  private validatePhoneNumber(phone: string): string | null {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a Jordan mobile number
    const jordanMobilePattern = /^(962)?(77|78|79)\d{7}$/;
    
    if (!jordanMobilePattern.test(cleaned)) {
      return null;
    }
    
    // Ensure it has country code
    if (!cleaned.startsWith('962')) {
      // Remove leading 0 if present
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '962' + cleaned;
    }
    
    return '+' + cleaned;
  }
  
  private shouldSendSMS(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): boolean {
    // Check if SMS is enabled
    if (!preferences.channels[NotificationChannel.SMS]) {
      return false;
    }
    
    // Check if critical only mode
    if (preferences.smsSettings.criticalOnly) {
      return notification.priority === 'CRITICAL';
    }
    
    // Check monthly quota
    if (preferences.smsSettings.currentUsage >= preferences.smsSettings.monthlyLimit) {
      return false;
    }
    
    return true;
  }
  
  formatSMSMessage(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): string {
    const isArabic = preferences.language === 'ar';
    const title = isArabic ? notification.titleAr || notification.title : notification.title;
    const body = isArabic ? notification.bodyAr || notification.body : notification.body;
    
    // SMS character limit considerations
    // Arabic: 70 chars per segment
    // English: 160 chars per segment
    const charLimit = isArabic ? 70 : 160;
    
    let message = `${title}\n${body}`;
    
    // Add action links if critical
    if (notification.priority === 'CRITICAL' && notification.actions && notification.actions.length > 0) {
      const action = notification.actions[0];
      const actionText = isArabic ? action.titleAr || action.title : action.title;
      message += `\n${actionText}`;
    }
    
    // Truncate if too long
    if (message.length > charLimit) {
      message = message.substring(0, charLimit - 3) + '...';
    }
    
    return message;
  }
  
  private async sendTestSMS(to: string, body: string): Promise<any> {
    console.log('Test SMS:', {
      to,
      body,
      from: this.config.fromNumber || '+962791234567',
    });
    
    // Simulate SMS sending
    return {
      sid: `test_${Date.now()}`,
      status: 'sent',
      to,
      from: this.config.fromNumber || '+962791234567',
      body,
    };
  }
  
  private async sendTwilioSMS(to: string, body: string): Promise<any> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }
    
    const message: SMSMessage = {
      to,
      body,
      from: this.config.fromNumber!,
      // statusCallback: 'https://api.lamsa.com/webhooks/twilio/status',
    };
    
    // TODO: Implement actual Twilio API call
    // return await this.twilioClient.messages.create(message);
    
    // For now, simulate
    return this.sendTestSMS(to, body);
  }
  
  // Get SMS delivery status
  async getMessageStatus(messageSid: string): Promise<string> {
    if (this.config.testMode || !this.isConfigured()) {
      return 'delivered';
    }
    
    // TODO: Implement Twilio status check
    // const message = await this.twilioClient.messages(messageSid).fetch();
    // return message.status;
    
    return 'delivered';
  }
  
  // Calculate SMS segments for a message
  calculateSegments(message: string, isArabic: boolean = false): number {
    const singleSegmentLimit = isArabic ? 70 : 160;
    const multiSegmentLimit = isArabic ? 67 : 153;
    
    if (message.length <= singleSegmentLimit) {
      return 1;
    }
    
    return Math.ceil(message.length / multiSegmentLimit);
  }
  
  // Calculate cost for a message
  calculateCost(message: string, isArabic: boolean = false): number {
    const segments = this.calculateSegments(message, isArabic);
    return segments * NOTIFICATION_COSTS.SMS.basePrice;
  }
}