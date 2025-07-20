/**
 * Comprehensive Bilingual Push Notification Testing
 * Tests push notification delivery, templates, and localization for mobile app
 */

const { describe, it, expect, beforeEach, afterEach } = require('jest');
const NotificationService = require('../../src/services/notification.service');
const NotificationTemplatesService = require('../../src/services/notification-templates.service');

// Mock Expo Push Notification Service
class MockExpoPushService {
  constructor() {
    this.sentNotifications = [];
    this.failureRate = 0;
    this.deliveryDelay = 0;
  }

  async sendPushNotification(tokens, message) {
    // Simulate network delay
    if (this.deliveryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.deliveryDelay));
    }

    // Simulate failures
    if (Math.random() < this.failureRate) {
      throw new Error('Push notification delivery failed');
    }

    // Store sent notification
    this.sentNotifications.push({
      tokens: Array.isArray(tokens) ? tokens : [tokens],
      title: message.title,
      body: message.body,
      data: message.data || {},
      sound: message.sound || 'default',
      badge: message.badge || 0,
      timestamp: new Date().toISOString(),
      language: message.data?.language || 'en'
    });

    return {
      success: true,
      receipts: tokens.map(token => ({
        token,
        status: 'ok',
        id: `receipt_${Math.random().toString(36).substr(2, 9)}`
      }))
    };
  }

  getSentNotifications() {
    return this.sentNotifications;
  }

  clearNotifications() {
    this.sentNotifications = [];
  }

  setFailureRate(rate) {
    this.failureRate = rate;
  }

  setDeliveryDelay(delay) {
    this.deliveryDelay = delay;
  }
}

describe('Bilingual Push Notification Testing', () => {
  let notificationService;
  let templatesService;
  let mockPushService;

  beforeEach(() => {
    // Initialize services
    notificationService = new NotificationService();
    templatesService = new NotificationTemplatesService();
    mockPushService = new MockExpoPushService();
    
    // Set up mock push service
    notificationService.setPushService(mockPushService);
    
    // Clear any existing notifications
    mockPushService.clearNotifications();
  });

  afterEach(() => {
    mockPushService.clearNotifications();
  });

  describe('Arabic Push Notification Testing', () => {
    it('should send Arabic booking confirmation push notification', async () => {
      const user = {
        id: 'user123',
        expoPushToken: 'ExponentPushToken[test_token_123]',
        preferredLanguage: 'ar',
        name: 'أحمد محمد'
      };

      const booking = {
        id: 'B12345',
        serviceName: 'قص شعر',
        providerName: 'صالون الجمال',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500
      };

      const result = await notificationService.sendPushNotification(
        user.expoPushToken,
        'booking_confirmed',
        booking,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      expect(result.language).toBe('ar');
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.tokens).toContain(user.expoPushToken);
      expect(sentNotification.title).toBe('تم تأكيد الحجز');
      expect(sentNotification.body).toContain('تم تأكيد حجزك');
      expect(sentNotification.body).toContain('قص شعر');
      expect(sentNotification.body).toContain('صالون الجمال');
      expect(sentNotification.data.bookingId).toBe('B12345');
      expect(sentNotification.data.language).toBe('ar');
      expect(sentNotification.sound).toBe('default');
    });

    it('should send Arabic appointment reminder push notification', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[test_token_456]',
        preferredLanguage: 'ar',
        name: 'فاطمة علي'
      };

      const reminder = {
        bookingId: 'B67890',
        serviceName: 'تدليك استرخاء',
        providerName: 'مركز العناية',
        date: '2025-07-17',
        time: '10:00',
        hoursUntil: 2
      };

      const result = await notificationService.sendPushNotification(
        user.expoPushToken,
        'appointment_reminder',
        reminder,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.title).toBe('تذكير بالموعد');
      expect(sentNotification.body).toContain('موعدك خلال ٢ ساعات');
      expect(sentNotification.body).toContain('تدليك استرخاء');
      expect(sentNotification.body).toContain('مركز العناية');
      expect(sentNotification.data.bookingId).toBe('B67890');
      expect(sentNotification.data.type).toBe('reminder');
    });

    it('should send Arabic payment notification with proper formatting', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[test_token_789]',
        preferredLanguage: 'ar'
      };

      const payment = {
        bookingId: 'B11111',
        amount: 45.750,
        method: 'بطاقة ائتمان',
        status: 'success'
      };

      const result = await notificationService.sendPushNotification(
        user.expoPushToken,
        'payment_processed',
        payment,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.title).toBe('تم الدفع');
      expect(sentNotification.body).toContain('٤٥٫٧٥٠ د.أ');
      expect(sentNotification.body).toContain('بطاقة ائتمان');
      expect(sentNotification.data.amount).toBe(45.750);
      expect(sentNotification.data.currency).toBe('JOD');
    });

    it('should handle Arabic rich notifications correctly', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[test_token_rich]',
        preferredLanguage: 'ar'
      };

      const promotion = {
        title: 'عرض خاص',
        description: 'خصم ٢٥٪ على جميع خدمات العناية بالبشرة',
        validUntil: '2025-07-31',
        imageUrl: 'https://example.com/promo.jpg',
        actionUrl: 'beautycort://promotions/summer2025'
      };

      const result = await notificationService.sendPushNotification(
        user.expoPushToken,
        'promotion_alert',
        promotion,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.title).toBe('عرض خاص');
      expect(sentNotification.body).toContain('خصم ٢٥٪');
      expect(sentNotification.body).toContain('خدمات العناية بالبشرة');
      expect(sentNotification.data.imageUrl).toBe(promotion.imageUrl);
      expect(sentNotification.data.actionUrl).toBe(promotion.actionUrl);
    });
  });

  describe('English Push Notification Testing', () => {
    it('should send English booking confirmation push notification', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[test_token_en_123]',
        preferredLanguage: 'en',
        name: 'John Smith'
      };

      const booking = {
        id: 'B12345',
        serviceName: 'Hair Cut',
        providerName: 'Beauty Salon',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500
      };

      const result = await notificationService.sendPushNotification(
        user.expoPushToken,
        'booking_confirmed',
        booking,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      expect(result.language).toBe('en');
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.title).toBe('Booking Confirmed');
      expect(sentNotification.body).toContain('Your booking has been confirmed');
      expect(sentNotification.body).toContain('Hair Cut');
      expect(sentNotification.body).toContain('Beauty Salon');
      expect(sentNotification.data.bookingId).toBe('B12345');
      expect(sentNotification.data.language).toBe('en');
    });

    it('should send English appointment reminder push notification', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[test_token_en_456]',
        preferredLanguage: 'en',
        name: 'Sarah Johnson'
      };

      const reminder = {
        bookingId: 'B67890',
        serviceName: 'Relaxation Massage',
        providerName: 'Wellness Center',
        date: '2025-07-17',
        time: '10:00',
        hoursUntil: 2
      };

      const result = await notificationService.sendPushNotification(
        user.expoPushToken,
        'appointment_reminder',
        reminder,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.title).toBe('Appointment Reminder');
      expect(sentNotification.body).toContain('Your appointment is in 2 hours');
      expect(sentNotification.body).toContain('Relaxation Massage');
      expect(sentNotification.body).toContain('Wellness Center');
      expect(sentNotification.data.bookingId).toBe('B67890');
    });

    it('should send English payment notification with proper formatting', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[test_token_en_789]',
        preferredLanguage: 'en'
      };

      const payment = {
        bookingId: 'B11111',
        amount: 45.750,
        method: 'Credit Card',
        status: 'success'
      };

      const result = await notificationService.sendPushNotification(
        user.expoPushToken,
        'payment_processed',
        payment,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.title).toBe('Payment Processed');
      expect(sentNotification.body).toContain('JOD 45.750');
      expect(sentNotification.body).toContain('Credit Card');
      expect(sentNotification.data.amount).toBe(45.750);
      expect(sentNotification.data.currency).toBe('JOD');
    });
  });

  describe('Cross-Language Push Notification Testing', () => {
    it('should handle batch notifications in multiple languages', async () => {
      const users = [
        {
          expoPushToken: 'ExponentPushToken[ar_user_1]',
          preferredLanguage: 'ar',
          name: 'أحمد محمد'
        },
        {
          expoPushToken: 'ExponentPushToken[en_user_1]',
          preferredLanguage: 'en',
          name: 'John Smith'
        },
        {
          expoPushToken: 'ExponentPushToken[ar_user_2]',
          preferredLanguage: 'ar',
          name: 'فاطمة علي'
        }
      ];

      const promotion = {
        title: 'Special Offer',
        description: '25% discount on all services',
        validUntil: '2025-07-31'
      };

      const result = await notificationService.sendBatchPushNotifications(
        users,
        'promotion_alert',
        promotion
      );

      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(3);
      
      const sentNotifications = mockPushService.getSentNotifications();
      expect(sentNotifications).toHaveLength(3);
      
      // Check Arabic notifications
      const arabicNotifications = sentNotifications.filter(n => n.language === 'ar');
      expect(arabicNotifications).toHaveLength(2);
      arabicNotifications.forEach(notification => {
        expect(notification.title).toBe('عرض خاص');
        expect(notification.body).toContain('خصم ٢٥٪');
      });
      
      // Check English notifications
      const englishNotifications = sentNotifications.filter(n => n.language === 'en');
      expect(englishNotifications).toHaveLength(1);
      expect(englishNotifications[0].title).toBe('Special Offer');
      expect(englishNotifications[0].body).toContain('25% discount');
    });

    it('should maintain consistency across languages', async () => {
      const booking = {
        id: 'B12345',
        serviceName: 'Hair Cut',
        providerName: 'Beauty Salon',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500
      };

      // Send Arabic notification
      await notificationService.sendPushNotification(
        'ExponentPushToken[ar_token]',
        'booking_confirmed',
        booking,
        'ar'
      );

      // Send English notification
      await notificationService.sendPushNotification(
        'ExponentPushToken[en_token]',
        'booking_confirmed',
        booking,
        'en'
      );

      const sentNotifications = mockPushService.getSentNotifications();
      expect(sentNotifications).toHaveLength(2);
      
      // Both should have same booking ID in data
      expect(sentNotifications[0].data.bookingId).toBe('B12345');
      expect(sentNotifications[1].data.bookingId).toBe('B12345');
      
      // Both should have same amount
      expect(sentNotifications[0].data.amount).toBe(25.500);
      expect(sentNotifications[1].data.amount).toBe(25.500);
      
      // Arabic should have Arabic numerals in body
      const arabicNotification = sentNotifications.find(n => n.language === 'ar');
      expect(arabicNotification.body).toContain('٢٥٫٥٠٠ د.أ');
      
      // English should have Western numerals in body
      const englishNotification = sentNotifications.find(n => n.language === 'en');
      expect(englishNotification.body).toContain('JOD 25.500');
    });

    it('should handle language fallback correctly', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[fallback_test]',
        preferredLanguage: 'fr' // Unsupported language
      };

      const booking = {
        id: 'B12345',
        serviceName: 'Hair Cut'
      };

      const result = await notificationService.sendPushNotification(
        user.expoPushToken,
        'booking_confirmed',
        booking,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      expect(result.language).toBe('en'); // Should fallback to English
      expect(result.fallbackUsed).toBe(true);
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.title).toBe('Booking Confirmed');
      expect(sentNotification.body).toContain('Your booking has been confirmed');
    });
  });

  describe('Rich Push Notification Testing', () => {
    it('should handle image attachments in Arabic notifications', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[rich_ar]',
        preferredLanguage: 'ar'
      };

      const serviceUpdate = {
        title: 'خدمة جديدة متاحة',
        description: 'تقدم صالونات الجمال الآن خدمة العناية بالأظافر',
        imageUrl: 'https://example.com/nail-service.jpg',
        actionUrl: 'beautycort://services/nail-care'
      };

      const result = await notificationService.sendRichPushNotification(
        user.expoPushToken,
        'service_update',
        serviceUpdate,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.title).toBe('خدمة جديدة متاحة');
      expect(sentNotification.body).toContain('تقدم صالونات الجمال');
      expect(sentNotification.data.imageUrl).toBe(serviceUpdate.imageUrl);
      expect(sentNotification.data.actionUrl).toBe(serviceUpdate.actionUrl);
    });

    it('should handle action buttons in notifications', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[action_test]',
        preferredLanguage: 'ar'
      };

      const reminder = {
        bookingId: 'B12345',
        serviceName: 'قص شعر',
        providerName: 'صالون الجمال',
        time: '14:30',
        actions: [
          { id: 'confirm', title: 'تأكيد الحضور' },
          { id: 'reschedule', title: 'إعادة جدولة' },
          { id: 'cancel', title: 'إلغاء' }
        ]
      };

      const result = await notificationService.sendActionablePushNotification(
        user.expoPushToken,
        'appointment_reminder',
        reminder,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.data.actions).toHaveLength(3);
      expect(sentNotification.data.actions[0].title).toBe('تأكيد الحضور');
      expect(sentNotification.data.actions[1].title).toBe('إعادة جدولة');
      expect(sentNotification.data.actions[2].title).toBe('إلغاء');
    });
  });

  describe('Push Notification Scheduling', () => {
    it('should schedule Arabic notifications correctly', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[schedule_ar]',
        preferredLanguage: 'ar'
      };

      const reminder = {
        bookingId: 'B12345',
        serviceName: 'قص شعر',
        providerName: 'صالون الجمال',
        appointmentTime: '2025-07-16T14:30:00Z'
      };

      const scheduleTime = new Date('2025-07-16T12:30:00Z'); // 2 hours before

      const result = await notificationService.scheduleNotification(
        user.expoPushToken,
        'appointment_reminder',
        reminder,
        user.preferredLanguage,
        scheduleTime
      );

      expect(result.success).toBe(true);
      expect(result.scheduled).toBe(true);
      expect(result.scheduledFor).toBe(scheduleTime.toISOString());
    });

    it('should handle timezone-aware scheduling', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[timezone_test]',
        preferredLanguage: 'ar',
        timezone: 'Asia/Amman'
      };

      const reminder = {
        bookingId: 'B12345',
        serviceName: 'قص شعر',
        appointmentTime: '2025-07-16T14:30:00+03:00' // Amman time
      };

      const result = await notificationService.scheduleReminderNotification(
        user,
        reminder,
        '2_hours_before'
      );

      expect(result.success).toBe(true);
      expect(result.scheduled).toBe(true);
      
      // Should calculate correct time in user's timezone
      const expectedTime = new Date('2025-07-16T12:30:00+03:00');
      expect(new Date(result.scheduledFor)).toEqual(expectedTime);
    });
  });

  describe('Push Notification Analytics', () => {
    it('should track notification delivery metrics', async () => {
      const users = [
        { expoPushToken: 'Token1', preferredLanguage: 'ar' },
        { expoPushToken: 'Token2', preferredLanguage: 'en' },
        { expoPushToken: 'Token3', preferredLanguage: 'ar' }
      ];

      const promotion = {
        title: 'Special Offer',
        description: 'Limited time offer'
      };

      const result = await notificationService.sendBatchPushNotifications(
        users,
        'promotion_alert',
        promotion
      );

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalSent).toBe(3);
      expect(result.metrics.byLanguage.ar).toBe(2);
      expect(result.metrics.byLanguage.en).toBe(1);
      expect(result.metrics.deliveryRate).toBe(1.0);
    });

    it('should track notification engagement', async () => {
      const user = {
        expoPushToken: 'ExponentPushToken[engagement_test]',
        preferredLanguage: 'ar'
      };

      const booking = {
        id: 'B12345',
        serviceName: 'قص شعر'
      };

      const result = await notificationService.sendPushNotification(
        user.expoPushToken,
        'booking_confirmed',
        booking,
        user.preferredLanguage,
        { trackEngagement: true }
      );

      expect(result.success).toBe(true);
      expect(result.trackingId).toBeDefined();
      
      const sentNotification = mockPushService.getSentNotifications()[0];
      expect(sentNotification.data.trackingId).toBe(result.trackingId);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle invalid push tokens gracefully', async () => {
      const result = await notificationService.sendPushNotification(
        'invalid_token',
        'booking_confirmed',
        { id: 'B12345' },
        'ar'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid push token');
      expect(result.errorCode).toBe('INVALID_TOKEN');
    });

    it('should retry failed push notifications', async () => {
      mockPushService.setFailureRate(0.7); // 70% failure rate

      const result = await notificationService.sendPushNotification(
        'ExponentPushToken[retry_test]',
        'booking_confirmed',
        { id: 'B12345' },
        'ar'
      );

      // Should eventually succeed with retry
      expect(result.success).toBe(true);
      expect(result.retryCount).toBeGreaterThan(0);
    });

    it('should handle rate limiting gracefully', async () => {
      const tokens = Array.from({ length: 1000 }, (_, i) => `Token${i}`);
      
      const result = await notificationService.sendBatchPushNotifications(
        tokens.map(token => ({ expoPushToken: token, preferredLanguage: 'ar' })),
        'promotion_alert',
        { title: 'Test', description: 'Test' }
      );

      expect(result.success).toBe(true);
      expect(result.rateLimited).toBe(true);
      expect(result.batchedRequests).toBeGreaterThan(1);
    });
  });
});

// Test utilities for push notifications
const PushTestUtils = {
  generateTestUsers: (count = 10, languageRatio = 0.5) => {
    const users = [];
    for (let i = 0; i < count; i++) {
      const isArabic = i < count * languageRatio;
      users.push({
        expoPushToken: `ExponentPushToken[test_${i}]`,
        preferredLanguage: isArabic ? 'ar' : 'en',
        name: isArabic ? `مستخدم ${i}` : `User ${i}`
      });
    }
    return users;
  },

  validateArabicPushNotification: (notification) => {
    expect(notification.title).toMatch(/[\u0600-\u06FF]/); // Contains Arabic
    expect(notification.body).toMatch(/[\u0600-\u06FF]/); // Contains Arabic
    expect(notification.language).toBe('ar');
    expect(notification.data.language).toBe('ar');
  },

  validateEnglishPushNotification: (notification) => {
    expect(notification.title).not.toMatch(/[\u0600-\u06FF]/); // No Arabic
    expect(notification.body).not.toMatch(/[\u0600-\u06FF]/); // No Arabic
    expect(notification.language).toBe('en');
    expect(notification.data.language).toBe('en');
  },

  measureNotificationPerformance: async (testFunction) => {
    const startTime = Date.now();
    const result = await testFunction();
    const endTime = Date.now();
    
    return {
      ...result,
      performance: {
        duration: endTime - startTime,
        throughput: result.totalSent / ((endTime - startTime) / 1000)
      }
    };
  }
};

module.exports = {
  MockExpoPushService,
  PushTestUtils
};