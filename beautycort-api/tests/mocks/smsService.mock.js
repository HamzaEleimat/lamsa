/**
 * Mock SMS Service
 * Simulates SMS/notification service for testing
 */

class MockSMSService {
  constructor() {
    this.sentMessages = [];
    this.failureRate = 0;
    this.latency = 50;
    this.deliveryRate = 0.95; // 95% delivery rate by default
  }

  /**
   * Set failure rate for testing error scenarios
   */
  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Set delivery rate for testing scenarios
   */
  setDeliveryRate(rate) {
    this.deliveryRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Set mock latency
   */
  setLatency(ms) {
    this.latency = Math.max(0, ms);
  }

  /**
   * Send SMS message
   */
  async sendSMS(to, message, options = {}) {
    await this.simulateLatency();

    // Validate phone number format
    if (!this.validatePhoneNumber(to)) {
      throw new SMSError('Invalid phone number format', 'INVALID_PHONE');
    }

    // Simulate sending failures
    if (Math.random() < this.failureRate) {
      throw new SMSError('Failed to send SMS', 'SEND_FAILED');
    }

    const smsRecord = {
      id: this.generateMessageId(),
      to: to,
      message: message,
      status: 'sent',
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      type: options.type || 'notification',
      priority: options.priority || 'normal',
      cost: this.calculateCost(message, to),
      metadata: options.metadata || {}
    };

    this.sentMessages.push(smsRecord);

    // Simulate delivery with some delay
    setTimeout(() => {
      this.simulateDelivery(smsRecord.id);
    }, this.latency * 2);

    return {
      messageId: smsRecord.id,
      status: 'sent',
      cost: smsRecord.cost
    };
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(recipients, message, options = {}) {
    await this.simulateLatency();

    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS(recipient, message, options);
        results.push({
          recipient,
          success: true,
          messageId: result.messageId,
          cost: result.cost
        });
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: error.message,
          code: error.code
        });
      }
    }

    return {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results,
      totalCost: results.reduce((sum, r) => sum + (r.cost || 0), 0)
    };
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId) {
    await this.simulateLatency();

    const message = this.sentMessages.find(m => m.id === messageId);
    if (!message) {
      throw new SMSError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    return {
      id: message.id,
      status: message.status,
      sentAt: message.sentAt,
      deliveredAt: message.deliveredAt,
      to: message.to
    };
  }

  /**
   * Send booking notification
   */
  async sendBookingNotification(phone, bookingData, notificationType) {
    const templates = this.getNotificationTemplates();
    const template = templates[notificationType];
    
    if (!template) {
      throw new SMSError('Invalid notification type', 'INVALID_TEMPLATE');
    }

    const message = this.formatMessage(template, bookingData);
    
    return await this.sendSMS(phone, message, {
      type: 'booking_notification',
      priority: notificationType.includes('reminder') ? 'high' : 'normal',
      metadata: {
        bookingId: bookingData.id,
        notificationType: notificationType
      }
    });
  }

  /**
   * Send OTP code
   */
  async sendOTP(phone, code, expiryMinutes = 5) {
    const message = `Your BeautyCort verification code is: ${code}. Valid for ${expiryMinutes} minutes. Do not share this code.`;
    
    return await this.sendSMS(phone, message, {
      type: 'otp',
      priority: 'high',
      metadata: {
        code: code,
        expiryMinutes: expiryMinutes
      }
    });
  }

  /**
   * Validate Jordanian phone number
   */
  validatePhoneNumber(phone) {
    const jordanianPhonePattern = /^\+962[789]\d{8}$/;
    return jordanianPhonePattern.test(phone);
  }

  /**
   * Calculate SMS cost
   */
  calculateCost(message, phone) {
    const baseRate = 0.05; // 0.05 JOD per SMS
    const segments = Math.ceil(message.length / 160);
    
    // International numbers cost more
    const isInternational = !phone.startsWith('+962');
    const multiplier = isInternational ? 3 : 1;
    
    return segments * baseRate * multiplier;
  }

  /**
   * Get notification message templates
   */
  getNotificationTemplates() {
    return {
      booking_created: {
        ar: 'تم إنشاء حجزك لخدمة {serviceName} في {providerName} بتاريخ {date} الساعة {time}. رقم الحجز: {bookingId}',
        en: 'Your booking for {serviceName} at {providerName} on {date} at {time} has been created. Booking ID: {bookingId}'
      },
      booking_confirmed: {
        ar: 'تم تأكيد حجزك لخدمة {serviceName} في {providerName} بتاريخ {date} الساعة {time}',
        en: 'Your booking for {serviceName} at {providerName} on {date} at {time} has been confirmed'
      },
      booking_cancelled: {
        ar: 'تم إلغاء حجزك لخدمة {serviceName} في {providerName}. {reason}',
        en: 'Your booking for {serviceName} at {providerName} has been cancelled. {reason}'
      },
      reminder_24h: {
        ar: 'تذكير: لديك موعد غداً الساعة {time} لخدمة {serviceName} في {providerName}',
        en: 'Reminder: You have an appointment tomorrow at {time} for {serviceName} at {providerName}'
      },
      reminder_2h: {
        ar: 'تذكير: لديك موعد خلال ساعتين لخدمة {serviceName} في {providerName}',
        en: 'Reminder: You have an appointment in 2 hours for {serviceName} at {providerName}'
      },
      payment_failed: {
        ar: 'فشل في معالجة الدفع للحجز {bookingId}. يرجى المحاولة مرة أخرى',
        en: 'Payment failed for booking {bookingId}. Please try again'
      }
    };
  }

  /**
   * Format message with booking data
   */
  formatMessage(template, bookingData) {
    const language = bookingData.userLanguage || 'ar';
    let message = template[language] || template.en || template.ar;

    // Replace placeholders
    const replacements = {
      serviceName: bookingData.serviceName || '',
      providerName: bookingData.providerName || '',
      date: bookingData.bookingDate || '',
      time: bookingData.startTime || '',
      bookingId: bookingData.id || '',
      reason: bookingData.reason || '',
      customerName: bookingData.customerName || ''
    };

    Object.entries(replacements).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    return message;
  }

  /**
   * Simulate message delivery
   */
  simulateDelivery(messageId) {
    const message = this.sentMessages.find(m => m.id === messageId);
    if (message && message.status === 'sent') {
      // Simulate delivery based on delivery rate
      if (Math.random() < this.deliveryRate) {
        message.status = 'delivered';
        message.deliveredAt = new Date().toISOString();
      } else {
        message.status = 'failed';
      }
    }
  }

  /**
   * Generate message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simulate network latency
   */
  async simulateLatency() {
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }
  }

  /**
   * Reset mock state
   */
  reset() {
    this.sentMessages = [];
    this.failureRate = 0;
    this.latency = 50;
    this.deliveryRate = 0.95;
  }

  /**
   * Get all sent messages (for testing)
   */
  getAllMessages() {
    return [...this.sentMessages];
  }

  /**
   * Get messages by type
   */
  getMessagesByType(type) {
    return this.sentMessages.filter(m => m.type === type);
  }

  /**
   * Get messages by recipient
   */
  getMessagesByRecipient(phone) {
    return this.sentMessages.filter(m => m.to === phone);
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats() {
    const total = this.sentMessages.length;
    const delivered = this.sentMessages.filter(m => m.status === 'delivered').length;
    const failed = this.sentMessages.filter(m => m.status === 'failed').length;
    const pending = this.sentMessages.filter(m => m.status === 'sent').length;

    return {
      total,
      delivered,
      failed,
      pending,
      deliveryRate: total > 0 ? delivered / total : 0,
      failureRate: total > 0 ? failed / total : 0
    };
  }
}

class SMSError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'SMSError';
  }
}

// Export singleton instance
const mockSMSService = new MockSMSService();

// Mock different SMS scenarios
mockSMSService.scenarios = {
  /**
   * High delivery rate scenario
   */
  highDelivery: () => {
    mockSMSService.setFailureRate(0);
    mockSMSService.setDeliveryRate(0.98);
    mockSMSService.setLatency(50);
  },

  /**
   * Poor network scenario
   */
  poorNetwork: () => {
    mockSMSService.setFailureRate(0.2);
    mockSMSService.setDeliveryRate(0.7);
    mockSMSService.setLatency(2000);
  },

  /**
   * Service outage scenario
   */
  outage: () => {
    mockSMSService.setFailureRate(1);
    mockSMSService.setDeliveryRate(0);
    mockSMSService.setLatency(100);
  },

  /**
   * Normal operation scenario
   */
  normal: () => {
    mockSMSService.setFailureRate(0.02);
    mockSMSService.setDeliveryRate(0.95);
    mockSMSService.setLatency(100);
  },

  /**
   * Reset to default scenario
   */
  reset: () => {
    mockSMSService.reset();
  }
};

module.exports = {
  MockSMSService,
  SMSError,
  mockSMSService
};