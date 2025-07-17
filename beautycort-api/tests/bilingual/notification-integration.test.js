/**
 * Bilingual Notification Integration Testing
 * Tests the complete notification system integration across SMS, Push, and WebSocket
 */

const { describe, it, expect, beforeEach, afterEach } = require('jest');
const NotificationService = require('../../src/services/notification.service');
const NotificationQueueService = require('../../src/services/notification-queue.service');
const MockSMSService = require('../mocks/smsService.mock');
const { MockExpoPushService } = require('./push-notification.test');

// Mock WebSocket Service for real-time notifications
class MockWebSocketService {
  constructor() {
    this.connectedUsers = new Map();
    this.sentMessages = [];
  }

  addConnection(userId, socket) {
    this.connectedUsers.set(userId, socket);
  }

  removeConnection(userId) {
    this.connectedUsers.delete(userId);
  }

  async sendToUser(userId, message) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      this.sentMessages.push({
        userId,
        message,
        timestamp: new Date().toISOString()
      });
      // Simulate socket emit
      socket.emit('notification', message);
      return { success: true, delivered: true };
    }
    return { success: false, reason: 'user_not_connected' };
  }

  getSentMessages() {
    return this.sentMessages;
  }

  clearMessages() {
    this.sentMessages = [];
  }

  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
}

// Mock socket object
class MockSocket {
  constructor() {
    this.emittedEvents = [];
  }

  emit(event, data) {
    this.emittedEvents.push({ event, data, timestamp: new Date().toISOString() });
  }

  getEmittedEvents() {
    return this.emittedEvents;
  }
}

describe('Bilingual Notification Integration Testing', () => {
  let notificationService;
  let queueService;
  let mockSMSService;
  let mockPushService;
  let mockWebSocketService;

  beforeEach(() => {
    // Initialize all services
    notificationService = new NotificationService();
    queueService = new NotificationQueueService();
    mockSMSService = new MockSMSService();
    mockPushService = new MockExpoPushService();
    mockWebSocketService = new MockWebSocketService();
    
    // Set up mock services
    notificationService.setSMSService(mockSMSService);
    notificationService.setPushService(mockPushService);
    notificationService.setWebSocketService(mockWebSocketService);
    
    // Clear all queues and logs
    queueService.clearQueue();
    mockSMSService.clearLogs();
    mockPushService.clearNotifications();
    mockWebSocketService.clearMessages();
  });

  afterEach(() => {
    // Clean up after each test
    queueService.clearQueue();
    mockSMSService.clearLogs();
    mockPushService.clearNotifications();
    mockWebSocketService.clearMessages();
  });

  describe('Multi-Channel Notification Delivery', () => {
    it('should send coordinated booking confirmation across all channels', async () => {
      const user = {
        id: 'user123',
        phoneNumber: '+962791234567',
        expoPushToken: 'ExponentPushToken[integration_test]',
        preferredLanguage: 'ar',
        name: 'أحمد محمد',
        notificationSettings: {
          smsEnabled: true,
          pushEnabled: true,
          webSocketEnabled: true
        }
      };

      const booking = {
        id: 'B12345',
        serviceName: 'قص شعر',
        providerName: 'صالون الجمال',
        date: '2025-07-16',
        time: '14:30',
        totalAmount: 25.500
      };

      // Connect user to WebSocket
      const mockSocket = new MockSocket();
      mockWebSocketService.addConnection(user.id, mockSocket);

      // Send multi-channel notification
      const result = await notificationService.sendMultiChannelNotification(
        user,
        'booking_confirmed',
        booking
      );

      expect(result.success).toBe(true);
      expect(result.channels.sms.sent).toBe(true);
      expect(result.channels.push.sent).toBe(true);
      expect(result.channels.webSocket.sent).toBe(true);

      // Verify SMS was sent
      const smsMessages = mockSMSService.getSentMessages();
      expect(smsMessages).toHaveLength(1);
      expect(smsMessages[0].body).toContain('تم تأكيد حجزك');
      expect(smsMessages[0].body).toContain('B١٢٣٤٥');

      // Verify push notification was sent
      const pushNotifications = mockPushService.getSentNotifications();
      expect(pushNotifications).toHaveLength(1);
      expect(pushNotifications[0].title).toBe('تم تأكيد الحجز');
      expect(pushNotifications[0].body).toContain('قص شعر');

      // Verify WebSocket message was sent
      const webSocketMessages = mockWebSocketService.getSentMessages();
      expect(webSocketMessages).toHaveLength(1);
      expect(webSocketMessages[0].userId).toBe(user.id);
      expect(webSocketMessages[0].message.type).toBe('booking_confirmed');
      expect(webSocketMessages[0].message.data.bookingId).toBe('B12345');
    });

    it('should handle channel failures gracefully', async () => {
      const user = {
        id: 'user456',
        phoneNumber: '+962791234567',
        expoPushToken: 'ExponentPushToken[fail_test]',
        preferredLanguage: 'ar',
        notificationSettings: {
          smsEnabled: true,
          pushEnabled: true,
          webSocketEnabled: true
        }
      };

      const booking = {
        id: 'B67890',
        serviceName: 'تدليك'
      };

      // Simulate SMS failure
      mockSMSService.setFailureRate(1.0);

      const result = await notificationService.sendMultiChannelNotification(
        user,
        'booking_confirmed',
        booking
      );

      expect(result.success).toBe(true); // Should succeed if at least one channel works
      expect(result.channels.sms.sent).toBe(false);
      expect(result.channels.sms.error).toBeDefined();
      expect(result.channels.push.sent).toBe(true);
      expect(result.channels.webSocket.sent).toBe(false); // User not connected

      // Should still send push notification
      const pushNotifications = mockPushService.getSentNotifications();
      expect(pushNotifications).toHaveLength(1);
      expect(pushNotifications[0].title).toBe('تم تأكيد الحجز');
    });

    it('should respect user channel preferences', async () => {
      const user = {
        id: 'user789',
        phoneNumber: '+962791234567',
        expoPushToken: 'ExponentPushToken[preferences_test]',
        preferredLanguage: 'ar',
        notificationSettings: {
          smsEnabled: false,
          pushEnabled: true,
          webSocketEnabled: false
        }
      };

      const booking = {
        id: 'B11111',
        serviceName: 'عناية بالبشرة'
      };

      const result = await notificationService.sendMultiChannelNotification(
        user,
        'booking_confirmed',
        booking
      );

      expect(result.success).toBe(true);
      expect(result.channels.sms.sent).toBe(false);
      expect(result.channels.sms.reason).toBe('disabled_by_user');
      expect(result.channels.push.sent).toBe(true);
      expect(result.channels.webSocket.sent).toBe(false);
      expect(result.channels.webSocket.reason).toBe('disabled_by_user');

      // Only push notification should be sent
      expect(mockSMSService.getSentMessages()).toHaveLength(0);
      expect(mockPushService.getSentNotifications()).toHaveLength(1);
      expect(mockWebSocketService.getSentMessages()).toHaveLength(0);
    });
  });

  describe('Language Consistency Across Channels', () => {
    it('should maintain consistent Arabic formatting across all channels', async () => {
      const user = {
        id: 'user_arabic',
        phoneNumber: '+962791234567',
        expoPushToken: 'ExponentPushToken[arabic_consistency]',
        preferredLanguage: 'ar',
        notificationSettings: {
          smsEnabled: true,
          pushEnabled: true,
          webSocketEnabled: true
        }
      };

      const payment = {
        bookingId: 'B12345',
        amount: 45.750,
        method: 'بطاقة ائتمان',
        status: 'success'
      };

      // Connect user to WebSocket
      const mockSocket = new MockSocket();
      mockWebSocketService.addConnection(user.id, mockSocket);

      const result = await notificationService.sendMultiChannelNotification(
        user,
        'payment_processed',
        payment
      );

      expect(result.success).toBe(true);

      // Check SMS formatting
      const smsMessages = mockSMSService.getSentMessages();
      expect(smsMessages[0].body).toContain('٤٥٫٧٥٠ د.أ');
      expect(smsMessages[0].body).toContain('B١٢٣٤٥');
      expect(smsMessages[0].body).toContain('بطاقة ائتمان');

      // Check push notification formatting
      const pushNotifications = mockPushService.getSentNotifications();
      expect(pushNotifications[0].body).toContain('٤٥٫٧٥٠ د.أ');
      expect(pushNotifications[0].data.bookingId).toBe('B12345');
      expect(pushNotifications[0].data.formattedAmount).toBe('٤٥٫٧٥٠ د.أ');

      // Check WebSocket message formatting
      const webSocketMessages = mockWebSocketService.getSentMessages();
      expect(webSocketMessages[0].message.data.formattedAmount).toBe('٤٥٫٧٥٠ د.أ');
      expect(webSocketMessages[0].message.data.bookingId).toBe('B12345');
      expect(webSocketMessages[0].message.language).toBe('ar');
    });

    it('should maintain consistent English formatting across all channels', async () => {
      const user = {
        id: 'user_english',
        phoneNumber: '+962791234567',
        expoPushToken: 'ExponentPushToken[english_consistency]',
        preferredLanguage: 'en',
        notificationSettings: {
          smsEnabled: true,
          pushEnabled: true,
          webSocketEnabled: true
        }
      };

      const payment = {
        bookingId: 'B12345',
        amount: 45.750,
        method: 'Credit Card',
        status: 'success'
      };

      // Connect user to WebSocket
      const mockSocket = new MockSocket();
      mockWebSocketService.addConnection(user.id, mockSocket);

      const result = await notificationService.sendMultiChannelNotification(
        user,
        'payment_processed',
        payment
      );

      expect(result.success).toBe(true);

      // Check SMS formatting
      const smsMessages = mockSMSService.getSentMessages();
      expect(smsMessages[0].body).toContain('JOD 45.750');
      expect(smsMessages[0].body).toContain('B12345');
      expect(smsMessages[0].body).toContain('Credit Card');

      // Check push notification formatting
      const pushNotifications = mockPushService.getSentNotifications();
      expect(pushNotifications[0].body).toContain('JOD 45.750');
      expect(pushNotifications[0].data.bookingId).toBe('B12345');
      expect(pushNotifications[0].data.formattedAmount).toBe('JOD 45.750');

      // Check WebSocket message formatting
      const webSocketMessages = mockWebSocketService.getSentMessages();
      expect(webSocketMessages[0].message.data.formattedAmount).toBe('JOD 45.750');
      expect(webSocketMessages[0].message.data.bookingId).toBe('B12345');
      expect(webSocketMessages[0].message.language).toBe('en');
    });
  });

  describe('Queue Processing Integration', () => {
    it('should process mixed language notifications in queue correctly', async () => {
      const users = [
        {
          id: 'ar_user_1',
          phoneNumber: '+962791111111',
          expoPushToken: 'Token_AR_1',
          preferredLanguage: 'ar',
          notificationSettings: { smsEnabled: true, pushEnabled: true }
        },
        {
          id: 'en_user_1',
          phoneNumber: '+962792222222',
          expoPushToken: 'Token_EN_1',
          preferredLanguage: 'en',
          notificationSettings: { smsEnabled: true, pushEnabled: true }
        },
        {
          id: 'ar_user_2',
          phoneNumber: '+962793333333',
          expoPushToken: 'Token_AR_2',
          preferredLanguage: 'ar',
          notificationSettings: { smsEnabled: true, pushEnabled: true }
        }
      ];

      const promotion = {
        title: 'Special Offer',
        description: '25% discount on all services',
        validUntil: '2025-07-31'
      };

      // Add notifications to queue
      for (const user of users) {
        await queueService.addToQueue({
          type: 'multi_channel',
          user,
          template: 'promotion_alert',
          data: promotion,
          priority: 'normal'
        });
      }

      // Process queue
      const result = await queueService.processQueue();

      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);

      // Verify SMS messages
      const smsMessages = mockSMSService.getSentMessages();
      expect(smsMessages).toHaveLength(3);
      
      const arabicSMS = smsMessages.filter(m => m.body.includes('عرض خاص'));
      const englishSMS = smsMessages.filter(m => m.body.includes('Special Offer'));
      
      expect(arabicSMS).toHaveLength(2);
      expect(englishSMS).toHaveLength(1);

      // Verify push notifications
      const pushNotifications = mockPushService.getSentNotifications();
      expect(pushNotifications).toHaveLength(3);
      
      const arabicPush = pushNotifications.filter(n => n.language === 'ar');
      const englishPush = pushNotifications.filter(n => n.language === 'en');
      
      expect(arabicPush).toHaveLength(2);
      expect(englishPush).toHaveLength(1);
    });

    it('should handle queue processing with failures and retries', async () => {
      const user = {
        id: 'retry_user',
        phoneNumber: '+962791234567',
        expoPushToken: 'ExponentPushToken[retry_test]',
        preferredLanguage: 'ar',
        notificationSettings: { smsEnabled: true, pushEnabled: true }
      };

      const booking = {
        id: 'B12345',
        serviceName: 'قص شعر'
      };

      // Set high failure rate
      mockSMSService.setFailureRate(0.8);
      mockPushService.setFailureRate(0.8);

      // Add to queue with retry settings
      await queueService.addToQueue({
        type: 'multi_channel',
        user,
        template: 'booking_confirmed',
        data: booking,
        priority: 'high',
        retryCount: 3
      });

      const result = await queueService.processQueue();

      expect(result.processed).toBe(1);
      expect(result.retried).toBeGreaterThan(0);
      
      // Should eventually succeed after retries
      const finalResult = await queueService.getProcessingStats();
      expect(finalResult.successRate).toBeGreaterThan(0.5);
    });
  });

  describe('Real-time Notification Synchronization', () => {
    it('should synchronize notifications across multiple user sessions', async () => {
      const user = {
        id: 'multi_session_user',
        phoneNumber: '+962791234567',
        expoPushToken: 'ExponentPushToken[multi_session]',
        preferredLanguage: 'ar',
        notificationSettings: { webSocketEnabled: true }
      };

      // Simulate multiple WebSocket connections (different devices)
      const mobileSocket = new MockSocket();
      const webSocket = new MockSocket();
      
      mockWebSocketService.addConnection(`${user.id}_mobile`, mobileSocket);
      mockWebSocketService.addConnection(`${user.id}_web`, webSocket);

      const reminder = {
        bookingId: 'B12345',
        serviceName: 'قص شعر',
        time: '14:30',
        hoursUntil: 2
      };

      // Send WebSocket notification to all user sessions
      const result = await notificationService.sendToAllUserSessions(
        user.id,
        'appointment_reminder',
        reminder,
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      expect(result.sessionsNotified).toBe(2);

      // Verify both sessions received the notification
      const mobileEvents = mobileSocket.getEmittedEvents();
      const webEvents = webSocket.getEmittedEvents();
      
      expect(mobileEvents).toHaveLength(1);
      expect(webEvents).toHaveLength(1);
      
      // Both should have the same content
      expect(mobileEvents[0].data.type).toBe('appointment_reminder');
      expect(webEvents[0].data.type).toBe('appointment_reminder');
      expect(mobileEvents[0].data.language).toBe('ar');
      expect(webEvents[0].data.language).toBe('ar');
    });

    it('should handle WebSocket connection management correctly', async () => {
      const user = {
        id: 'connection_test_user',
        preferredLanguage: 'ar'
      };

      const mockSocket = new MockSocket();
      
      // Connect user
      mockWebSocketService.addConnection(user.id, mockSocket);
      expect(mockWebSocketService.isUserConnected(user.id)).toBe(true);

      // Send notification
      const result = await notificationService.sendWebSocketNotification(
        user.id,
        'booking_confirmed',
        { id: 'B12345' },
        user.preferredLanguage
      );

      expect(result.success).toBe(true);
      expect(result.delivered).toBe(true);

      // Disconnect user
      mockWebSocketService.removeConnection(user.id);
      expect(mockWebSocketService.isUserConnected(user.id)).toBe(false);

      // Try to send another notification
      const result2 = await notificationService.sendWebSocketNotification(
        user.id,
        'booking_confirmed',
        { id: 'B67890' },
        user.preferredLanguage
      );

      expect(result2.success).toBe(false);
      expect(result2.reason).toBe('user_not_connected');
    });
  });

  describe('Notification Analytics and Reporting', () => {
    it('should track cross-channel delivery metrics', async () => {
      const users = [
        {
          id: 'metrics_user_1',
          phoneNumber: '+962791111111',
          expoPushToken: 'Token1',
          preferredLanguage: 'ar',
          notificationSettings: { smsEnabled: true, pushEnabled: true }
        },
        {
          id: 'metrics_user_2',
          phoneNumber: '+962792222222',
          expoPushToken: 'Token2',
          preferredLanguage: 'en',
          notificationSettings: { smsEnabled: true, pushEnabled: false }
        }
      ];

      const booking = {
        id: 'B12345',
        serviceName: 'Hair Cut'
      };

      // Send notifications to both users
      const results = await Promise.all(
        users.map(user => 
          notificationService.sendMultiChannelNotification(
            user,
            'booking_confirmed',
            booking
          )
        )
      );

      // Collect metrics
      const metrics = await notificationService.getDeliveryMetrics();

      expect(metrics.totalNotifications).toBe(2);
      expect(metrics.byChannel.sms.sent).toBe(2);
      expect(metrics.byChannel.push.sent).toBe(1);
      expect(metrics.byChannel.webSocket.sent).toBe(0);
      
      expect(metrics.byLanguage.ar.total).toBe(1);
      expect(metrics.byLanguage.en.total).toBe(1);
      
      expect(metrics.overallDeliveryRate).toBeGreaterThan(0.5);
    });

    it('should generate comprehensive delivery reports', async () => {
      const user = {
        id: 'report_user',
        phoneNumber: '+962791234567',
        expoPushToken: 'ExponentPushToken[report_test]',
        preferredLanguage: 'ar',
        notificationSettings: { smsEnabled: true, pushEnabled: true }
      };

      const notifications = [
        { template: 'booking_confirmed', data: { id: 'B1' } },
        { template: 'payment_processed', data: { bookingId: 'B1', amount: 25.5 } },
        { template: 'appointment_reminder', data: { bookingId: 'B1', hoursUntil: 2 } }
      ];

      // Send multiple notifications
      for (const notification of notifications) {
        await notificationService.sendMultiChannelNotification(
          user,
          notification.template,
          notification.data
        );
      }

      const report = await notificationService.generateDeliveryReport(
        user.id,
        new Date(Date.now() - 86400000), // Last 24 hours
        new Date()
      );

      expect(report.userId).toBe(user.id);
      expect(report.totalNotifications).toBe(3);
      expect(report.byTemplate.booking_confirmed.count).toBe(1);
      expect(report.byTemplate.payment_processed.count).toBe(1);
      expect(report.byTemplate.appointment_reminder.count).toBe(1);
      
      expect(report.languageBreakdown.ar.count).toBe(3);
      expect(report.channelPerformance.sms.deliveryRate).toBe(1.0);
      expect(report.channelPerformance.push.deliveryRate).toBe(1.0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle complete service outages gracefully', async () => {
      const user = {
        id: 'outage_test_user',
        phoneNumber: '+962791234567',
        expoPushToken: 'ExponentPushToken[outage_test]',
        preferredLanguage: 'ar',
        notificationSettings: { smsEnabled: true, pushEnabled: true }
      };

      const booking = {
        id: 'B12345',
        serviceName: 'قص شعر'
      };

      // Simulate complete service outage
      mockSMSService.setFailureRate(1.0);
      mockPushService.setFailureRate(1.0);

      const result = await notificationService.sendMultiChannelNotification(
        user,
        'booking_confirmed',
        booking,
        { enableFallbackQueue: true }
      );

      expect(result.success).toBe(false);
      expect(result.allChannelsFailed).toBe(true);
      expect(result.queuedForRetry).toBe(true);

      // Verify notification was queued for retry
      const queueSize = queueService.getQueueSize();
      expect(queueSize).toBe(1);

      // Simulate service recovery
      mockSMSService.setFailureRate(0.0);
      mockPushService.setFailureRate(0.0);

      // Process retry queue
      const retryResult = await queueService.processQueue();
      expect(retryResult.processed).toBe(1);
      expect(retryResult.failed).toBe(0);

      // Verify notifications were finally sent
      expect(mockSMSService.getSentMessages()).toHaveLength(1);
      expect(mockPushService.getSentNotifications()).toHaveLength(1);
    });

    it('should handle partial service degradation', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        id: `user_${i}`,
        phoneNumber: `+96279${i.toString().padStart(7, '0')}`,
        expoPushToken: `Token_${i}`,
        preferredLanguage: i % 2 === 0 ? 'ar' : 'en',
        notificationSettings: { smsEnabled: true, pushEnabled: true }
      }));

      const booking = {
        id: 'B12345',
        serviceName: 'Hair Cut'
      };

      // Simulate partial service degradation
      mockSMSService.setFailureRate(0.3); // 30% failure rate
      mockPushService.setFailureRate(0.2); // 20% failure rate

      const results = await Promise.all(
        users.map(user => 
          notificationService.sendMultiChannelNotification(
            user,
            'booking_confirmed',
            booking
          )
        )
      );

      // Most notifications should succeed
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(7);

      // Some channels may have failed but overall delivery should be good
      const overallMetrics = await notificationService.getDeliveryMetrics();
      expect(overallMetrics.overallDeliveryRate).toBeGreaterThan(0.7);
    });
  });
});

// Integration test utilities
const IntegrationTestUtils = {
  createTestUserSuite: (count = 100) => {
    const users = [];
    for (let i = 0; i < count; i++) {
      const isArabic = i % 2 === 0;
      users.push({
        id: `test_user_${i}`,
        phoneNumber: `+96279${i.toString().padStart(7, '0')}`,
        expoPushToken: `ExponentPushToken[test_${i}]`,
        preferredLanguage: isArabic ? 'ar' : 'en',
        name: isArabic ? `مستخدم ${i}` : `User ${i}`,
        notificationSettings: {
          smsEnabled: Math.random() > 0.1, // 90% enabled
          pushEnabled: Math.random() > 0.05, // 95% enabled
          webSocketEnabled: Math.random() > 0.2 // 80% enabled
        }
      });
    }
    return users;
  },

  simulateRealtimeLoad: async (notificationService, users, duration = 60000) => {
    const startTime = Date.now();
    const notifications = [];
    
    const notificationTypes = [
      'booking_confirmed',
      'payment_processed',
      'appointment_reminder',
      'promotion_alert'
    ];

    while (Date.now() - startTime < duration) {
      const user = users[Math.floor(Math.random() * users.length)];
      const template = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      
      const notification = notificationService.sendMultiChannelNotification(
        user,
        template,
        { id: `test_${Date.now()}` }
      );
      
      notifications.push(notification);
      
      // Wait 100-500ms between notifications
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    }

    const results = await Promise.all(notifications);
    return {
      totalSent: results.length,
      successRate: results.filter(r => r.success).length / results.length,
      duration: Date.now() - startTime
    };
  },

  validateCrossChannelConsistency: (smsMessage, pushNotification, webSocketMessage) => {
    // All should have the same core data
    expect(smsMessage.body).toBeDefined();
    expect(pushNotification.body).toBeDefined();
    expect(webSocketMessage.message.data).toBeDefined();
    
    // Language should be consistent
    if (smsMessage.body.match(/[\u0600-\u06FF]/)) {
      expect(pushNotification.language).toBe('ar');
      expect(webSocketMessage.message.language).toBe('ar');
    } else {
      expect(pushNotification.language).toBe('en');
      expect(webSocketMessage.message.language).toBe('en');
    }
  }
};

module.exports = {
  MockWebSocketService,
  MockSocket,
  IntegrationTestUtils
};