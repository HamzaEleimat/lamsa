/**
 * Comprehensive Bilingual SMS Notification Testing
 * Tests SMS delivery, templates, and localization across Arabic and English
 */

const { describe, it, expect, beforeEach, afterEach } = require('jest');
const NotificationService = require('../../src/services/notification.service');
const NotificationTemplatesService = require('../../src/services/notification-templates.service');
const NotificationQueueService = require('../../src/services/notification-queue.service');
const MockSMSService = require('../mocks/smsService.mock');

describe('Bilingual SMS Notification Testing', () => {
  let notificationService;
  let templatesService;
  let queueService;
  let mockSMSService;

  beforeEach(() => {
    // Initialize services
    notificationService = new NotificationService();
    templatesService = new NotificationTemplatesService();
    queueService = new NotificationQueueService();
    mockSMSService = new MockSMSService();
    
    // Set up mock SMS service
    notificationService.setSMSService(mockSMSService);
    
    // Clear any existing queue
    queueService.clearQueue();
    mockSMSService.clearLogs();
  });

  afterEach(() => {
    // Clean up after each test
    queueService.clearQueue();
    mockSMSService.clearLogs();
  });

  describe('Arabic SMS Template Testing', () => {
    it('should render Arabic booking confirmation correctly', async () => {
      const user = {
        id: 'user123',
        phoneNumber: '+962791234567',
        preferredLanguage: 'ar',
        name: 'أحمد محمد'
      };

      const booking = {
        id: 'B12345',
        serviceName: 'قص شعر',
        providerName: 'صالون الجمال',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500,
        duration: 60
      };

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'booking_confirmed',
        booking,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      expect(result.language).toBe('ar');
      
      const sentMessage = mockSMSService.getSentMessages()[0];
      expect(sentMessage.to).toBe(user.phoneNumber);
      expect(sentMessage.body).toContain('تم تأكيد حجزك');
      expect(sentMessage.body).toContain('B١٢٣٤٥');
      expect(sentMessage.body).toContain('قص شعر');
      expect(sentMessage.body).toContain('صالون الجمال');
      expect(sentMessage.body).toContain('٢٥٫٥٠٠ د.أ');
      expect(sentMessage.body).toContain('١٦ تموز ٢٠٢٥');
      expect(sentMessage.body).toContain('٢:٣٠ مساءً');
    });

    it('should render Arabic payment notification correctly', async () => {
      const user = {
        phoneNumber: '+962781234567',
        preferredLanguage: 'ar',
        name: 'فاطمة أحمد'
      };

      const payment = {
        bookingId: 'B67890',
        amount: 45.750,
        method: 'بطاقة ائتمان',
        transactionId: 'TXN123456789'
      };

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'payment_processed',
        payment,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentMessage = mockSMSService.getSentMessages()[0];
      expect(sentMessage.body).toContain('تم معالجة الدفع');
      expect(sentMessage.body).toContain('B٦٧٨٩٠');
      expect(sentMessage.body).toContain('٤٥٫٧٥٠ د.أ');
      expect(sentMessage.body).toContain('بطاقة ائتمان');
      expect(sentMessage.body).toContain('TXN١٢٣٤٥٦٧٨٩');
    });

    it('should render Arabic reminder notification correctly', async () => {
      const user = {
        phoneNumber: '+962771234567',
        preferredLanguage: 'ar',
        name: 'سارة علي'
      };

      const reminder = {
        bookingId: 'B11111',
        serviceName: 'تدليك استرخاء',
        providerName: 'مركز العناية',
        date: '2025-07-17',
        time: '10:00',
        hoursUntil: 2
      };

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'appointment_reminder',
        reminder,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentMessage = mockSMSService.getSentMessages()[0];
      expect(sentMessage.body).toContain('تذكير بموعدك');
      expect(sentMessage.body).toContain('B١١١١١');
      expect(sentMessage.body).toContain('تدليك استرخاء');
      expect(sentMessage.body).toContain('مركز العناية');
      expect(sentMessage.body).toContain('٢ ساعات');
      expect(sentMessage.body).toContain('١٠:٠٠ صباحاً');
    });

    it('should handle Arabic text character encoding correctly', async () => {
      const user = {
        phoneNumber: '+962791234567',
        preferredLanguage: 'ar'
      };

      const data = {
        serviceName: 'عناية بالبشرة والوجه',
        providerName: 'مركز الجمال والعناية الصحية',
        specialInstructions: 'يُرجى الوصول مبكراً بـ ١٥ دقيقة لإجراءات التسجيل'
      };

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'booking_confirmed',
        data,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentMessage = mockSMSService.getSentMessages()[0];
      
      // Verify complex Arabic text is preserved
      expect(sentMessage.body).toContain('عناية بالبشرة والوجه');
      expect(sentMessage.body).toContain('مركز الجمال والعناية الصحية');
      expect(sentMessage.body).toContain('يُرجى الوصول مبكراً بـ ١٥ دقيقة');
      
      // Verify character encoding
      expect(sentMessage.encoding).toBe('UCS2');
      expect(sentMessage.body.length).toBeLessThan(70); // UCS2 SMS limit
    });

    it('should handle Arabic SMS length calculation correctly', async () => {
      const user = {
        phoneNumber: '+962791234567',
        preferredLanguage: 'ar'
      };

      // Long Arabic message that should be split
      const longData = {
        serviceName: 'خدمة شاملة للعناية بالبشرة والوجه والشعر والأظافر',
        providerName: 'مركز الجمال والعناية الصحية المتخصص',
        notes: 'يُرجى الوصول مبكراً بـ ١٥ دقيقة لإجراءات التسجيل والاستشارة الأولية. نوصي بعدم استخدام أي منتجات تجميل قبل الموعد بيوم واحد.',
        specialInstructions: 'الرجاء إحضار بطاقة الهوية وأي تقارير طبية ذات صلة بالبشرة'
      };

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'booking_confirmed',
        longData,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentMessage = mockSMSService.getSentMessages()[0];
      
      // Check if message was split properly
      expect(sentMessage.segmentCount).toBeGreaterThan(1);
      expect(sentMessage.totalLength).toBeGreaterThan(67); // UCS2 single SMS limit
      
      // Verify content is still complete
      expect(sentMessage.body).toContain('خدمة شاملة للعناية');
      expect(sentMessage.body).toContain('مركز الجمال والعناية');
      expect(sentMessage.body).toContain('يُرجى الوصول مبكراً');
    });
  });

  describe('English SMS Template Testing', () => {
    it('should render English booking confirmation correctly', async () => {
      const user = {
        phoneNumber: '+962791234567',
        preferredLanguage: 'en',
        name: 'John Smith'
      };

      const booking = {
        id: 'B12345',
        serviceName: 'Hair Cut',
        providerName: 'Beauty Salon',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500,
        duration: 60
      };

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'booking_confirmed',
        booking,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      expect(result.language).toBe('en');
      
      const sentMessage = mockSMSService.getSentMessages()[0];
      expect(sentMessage.to).toBe(user.phoneNumber);
      expect(sentMessage.body).toContain('booking confirmed');
      expect(sentMessage.body).toContain('B12345');
      expect(sentMessage.body).toContain('Hair Cut');
      expect(sentMessage.body).toContain('Beauty Salon');
      expect(sentMessage.body).toContain('JOD 25.500');
      expect(sentMessage.body).toContain('July 16, 2025');
      expect(sentMessage.body).toContain('2:30 PM');
    });

    it('should render English payment notification correctly', async () => {
      const user = {
        phoneNumber: '+962781234567',
        preferredLanguage: 'en',
        name: 'Sarah Johnson'
      };

      const payment = {
        bookingId: 'B67890',
        amount: 45.750,
        method: 'Credit Card',
        transactionId: 'TXN123456789'
      };

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'payment_processed',
        payment,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentMessage = mockSMSService.getSentMessages()[0];
      expect(sentMessage.body).toContain('payment processed');
      expect(sentMessage.body).toContain('B67890');
      expect(sentMessage.body).toContain('JOD 45.750');
      expect(sentMessage.body).toContain('Credit Card');
      expect(sentMessage.body).toContain('TXN123456789');
    });

    it('should handle English SMS length calculation correctly', async () => {
      const user = {
        phoneNumber: '+962791234567',
        preferredLanguage: 'en'
      };

      // Long English message
      const longData = {
        serviceName: 'Comprehensive Beauty Treatment Package',
        providerName: 'Premium Beauty and Wellness Center',
        notes: 'Please arrive 15 minutes early for registration and initial consultation. We recommend not using any beauty products one day before your appointment.',
        specialInstructions: 'Please bring your ID and any relevant medical reports related to skin conditions'
      };

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'booking_confirmed',
        longData,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentMessage = mockSMSService.getSentMessages()[0];
      
      // English uses GSM encoding, so longer messages allowed
      expect(sentMessage.encoding).toBe('GSM');
      expect(sentMessage.body.length).toBeGreaterThan(160); // Standard SMS limit
      
      // Verify content is complete
      expect(sentMessage.body).toContain('Comprehensive Beauty Treatment');
      expect(sentMessage.body).toContain('Premium Beauty and Wellness');
      expect(sentMessage.body).toContain('Please arrive 15 minutes early');
    });
  });

  describe('Cross-Language Testing', () => {
    it('should handle language switching correctly', async () => {
      const user = {
        phoneNumber: '+962791234567',
        preferredLanguage: 'ar'
      };

      const booking = {
        id: 'B12345',
        serviceName: 'قص شعر',
        providerName: 'صالون الجمال'
      };

      // Send Arabic message first
      await notificationService.sendSMS(
        user.phoneNumber,
        'booking_confirmed',
        booking,
        'ar'
      );

      // Then send English message
      await notificationService.sendSMS(
        user.phoneNumber,
        'booking_confirmed',
        booking,
        'en'
      );

      const sentMessages = mockSMSService.getSentMessages();
      expect(sentMessages).toHaveLength(2);
      
      // First message should be Arabic
      expect(sentMessages[0].body).toContain('تم تأكيد حجزك');
      expect(sentMessages[0].encoding).toBe('UCS2');
      
      // Second message should be English
      expect(sentMessages[1].body).toContain('booking confirmed');
      expect(sentMessages[1].encoding).toBe('GSM');
    });

    it('should maintain consistency across languages', async () => {
      const phoneNumber = '+962791234567';
      const booking = {
        id: 'B12345',
        serviceName: 'Hair Cut / قص شعر',
        providerName: 'Beauty Salon / صالون الجمال',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500
      };

      // Send same data in both languages
      await notificationService.sendSMS(
        phoneNumber,
        'booking_confirmed',
        booking,
        'ar'
      );

      await notificationService.sendSMS(
        phoneNumber,
        'booking_confirmed',
        booking,
        'en'
      );

      const sentMessages = mockSMSService.getSentMessages();
      expect(sentMessages).toHaveLength(2);
      
      // Both messages should contain the booking ID
      expect(sentMessages[0].body).toContain('B١٢٣٤٥'); // Arabic numerals
      expect(sentMessages[1].body).toContain('B12345'); // Western numerals
      
      // Both should contain the amount in proper format
      expect(sentMessages[0].body).toContain('٢٥٫٥٠٠ د.أ');
      expect(sentMessages[1].body).toContain('JOD 25.500');
      
      // Both should contain the date in proper format
      expect(sentMessages[0].body).toContain('١٦ تموز ٢٠٢٥');
      expect(sentMessages[1].body).toContain('July 16, 2025');
    });

    it('should handle mixed language content correctly', async () => {
      const user = {
        phoneNumber: '+962791234567',
        preferredLanguage: 'ar'
      };

      const booking = {
        id: 'B12345',
        serviceName: 'Hair Cut - قص شعر',
        providerName: 'Beauty Salon - صالون الجمال',
        customerNotes: 'Special request: قص قصير مع تسريحة عصرية'
      };

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'booking_confirmed',
        booking,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      
      const sentMessage = mockSMSService.getSentMessages()[0];
      
      // Should handle mixed content correctly
      expect(sentMessage.body).toContain('Hair Cut - قص شعر');
      expect(sentMessage.body).toContain('Beauty Salon - صالون الجمال');
      expect(sentMessage.body).toContain('Special request: قص قصير مع تسريحة عصرية');
      
      // Should use UCS2 encoding for mixed content
      expect(sentMessage.encoding).toBe('UCS2');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle invalid phone numbers gracefully', async () => {
      const result = await notificationService.sendSMS(
        'invalid-phone',
        'booking_confirmed',
        {},
        'ar'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number');
      expect(result.errorCode).toBe('INVALID_PHONE');
    });

    it('should handle missing template gracefully', async () => {
      const result = await notificationService.sendSMS(
        '+962791234567',
        'non_existent_template',
        {},
        'ar'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
      expect(result.errorCode).toBe('TEMPLATE_NOT_FOUND');
    });

    it('should fallback to default language when template missing', async () => {
      // Mock a scenario where Arabic template is missing
      mockSMSService.setTemplateAvailability('booking_confirmed', 'ar', false);

      const result = await notificationService.sendSMS(
        '+962791234567',
        'booking_confirmed',
        { id: 'B12345' },
        'ar'
      );

      expect(result.success).toBe(true);
      expect(result.language).toBe('en'); // Fallback to English
      expect(result.fallbackUsed).toBe(true);
      
      const sentMessage = mockSMSService.getSentMessages()[0];
      expect(sentMessage.body).toContain('booking confirmed'); // English template
    });

    it('should retry failed SMS delivery', async () => {
      // Mock SMS service to fail first attempt
      mockSMSService.setFailureRate(0.5);

      const result = await notificationService.sendSMS(
        '+962791234567',
        'booking_confirmed',
        { id: 'B12345' },
        'ar'
      );

      // Should eventually succeed with retry
      expect(result.success).toBe(true);
      expect(result.retryCount).toBeGreaterThan(0);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high volume of bilingual messages', async () => {
      const startTime = Date.now();
      const messageCount = 100;
      const promises = [];

      for (let i = 0; i < messageCount; i++) {
        const language = i % 2 === 0 ? 'ar' : 'en';
        const booking = {
          id: `B${i.toString().padStart(5, '0')}`,
          serviceName: language === 'ar' ? 'قص شعر' : 'Hair Cut',
          providerName: language === 'ar' ? 'صالون الجمال' : 'Beauty Salon'
        };

        promises.push(
          notificationService.sendSMS(
            '+962791234567',
            'booking_confirmed',
            booking,
            language
          )
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All messages should be sent successfully
      expect(results.every(r => r.success)).toBe(true);
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
      
      // Should have sent all messages
      expect(mockSMSService.getSentMessages()).toHaveLength(messageCount);
      
      // Should maintain proper language distribution
      const sentMessages = mockSMSService.getSentMessages();
      const arabicMessages = sentMessages.filter(m => m.body.includes('تم تأكيد حجزك'));
      const englishMessages = sentMessages.filter(m => m.body.includes('booking confirmed'));
      
      expect(arabicMessages).toHaveLength(messageCount / 2);
      expect(englishMessages).toHaveLength(messageCount / 2);
    });

    it('should handle queue processing efficiently', async () => {
      const messageCount = 50;
      const promises = [];

      // Queue many messages
      for (let i = 0; i < messageCount; i++) {
        const language = i % 2 === 0 ? 'ar' : 'en';
        promises.push(
          queueService.addToQueue({
            type: 'sms',
            phoneNumber: '+962791234567',
            template: 'booking_confirmed',
            data: { id: `B${i}` },
            language: language,
            priority: 'normal'
          })
        );
      }

      await Promise.all(promises);

      // Process queue
      const startTime = Date.now();
      await queueService.processQueue();
      const endTime = Date.now();

      // Should process efficiently
      expect(endTime - startTime).toBeLessThan(3000); // 3 seconds
      
      // Queue should be empty
      expect(queueService.getQueueSize()).toBe(0);
      
      // All messages should be sent
      expect(mockSMSService.getSentMessages()).toHaveLength(messageCount);
    });
  });

  describe('Integration Testing', () => {
    it('should integrate with user preferences correctly', async () => {
      const user = {
        id: 'user123',
        phoneNumber: '+962791234567',
        preferredLanguage: 'ar',
        notificationSettings: {
          smsEnabled: true,
          quietHours: { start: '22:00', end: '08:00' }
        }
      };

      // Mock current time to be within quiet hours
      const originalDate = Date;
      global.Date = jest.fn(() => new originalDate('2025-07-16T23:00:00Z'));

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'booking_confirmed',
        { id: 'B12345' },
        user.preferredLanguage,
        { respectQuietHours: true }
      );

      // Should be queued instead of sent immediately
      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
      expect(result.reason).toBe('quiet_hours');

      // Restore original Date
      global.Date = originalDate;
    });

    it('should handle notification preferences correctly', async () => {
      const user = {
        phoneNumber: '+962791234567',
        preferredLanguage: 'ar',
        notificationSettings: {
          smsEnabled: false,
          pushEnabled: true
        }
      };

      const result = await notificationService.sendSMS(
        user.phoneNumber,
        'booking_confirmed',
        { id: 'B12345' },
        user.preferredLanguage,
        { checkPreferences: true }
      );

      // Should respect user preferences
      expect(result.success).toBe(false);
      expect(result.reason).toBe('sms_disabled');
      expect(result.alternativeSent).toBe(true); // Should try push notification
    });
  });
});

// Test utilities
const TestUtils = {
  // Generate test data
  generateTestBooking: (language = 'ar') => ({
    id: 'B12345',
    serviceName: language === 'ar' ? 'قص شعر' : 'Hair Cut',
    providerName: language === 'ar' ? 'صالون الجمال' : 'Beauty Salon',
    date: '2025-07-16',
    time: '14:30',
    totalAmount: 25.500,
    duration: 60
  }),

  generateTestUser: (language = 'ar') => ({
    id: 'user123',
    phoneNumber: '+962791234567',
    preferredLanguage: language,
    name: language === 'ar' ? 'أحمد محمد' : 'John Smith'
  }),

  // Validate SMS content
  validateArabicSMS: (message) => {
    expect(message.encoding).toBe('UCS2');
    expect(message.body).toMatch(/[\u0600-\u06FF]/); // Contains Arabic characters
    expect(message.body).toMatch(/[٠-٩]/); // Contains Arabic numerals
  },

  validateEnglishSMS: (message) => {
    expect(message.encoding).toBe('GSM');
    expect(message.body).toMatch(/[0-9]/); // Contains Western numerals
    expect(message.body).not.toMatch(/[\u0600-\u06FF]/); // No Arabic characters
  }
};

module.exports = {
  TestUtils
};