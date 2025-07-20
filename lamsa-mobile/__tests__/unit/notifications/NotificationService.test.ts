import { NotificationService } from '../../../src/services/notifications/NotificationService';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationChannel,
  NotificationData 
} from '../../../src/services/notifications/types';
import { 
  testNotifications, 
  defaultNotificationPreferences,
  edgeCasePreferences 
} from '../../fixtures/notifications';

// Mock external dependencies
jest.mock('expo-notifications');
jest.mock('../../../src/services/notifications/SMSService');
jest.mock('../../../src/services/notifications/WhatsAppService');
jest.mock('../../../src/services/notifications/EmailService');
jest.mock('../../../src/services/notifications/NotificationAnalyticsService');

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationService();
  });

  describe('Notification Delivery', () => {
    it('should send high priority notifications immediately', async () => {
      const notification: NotificationData = {
        id: 'test-1',
        type: NotificationType.NEW_BOOKING,
        priority: NotificationPriority.HIGH,
        title: 'New Booking',
        titleAr: 'حجز جديد',
        body: 'You have a new booking',
        bodyAr: 'لديك حجز جديد',
        channels: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP],
        recipientId: 'provider-1',
      };

      const results = await notificationService.sendNotification(notification);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('sent');
      expect(results[1].status).toBe('sent');
    });

    it('should respect quiet hours for non-critical notifications', async () => {
      const quietHourPrefs = {
        ...defaultNotificationPreferences,
        timing: {
          ...defaultNotificationPreferences.timing,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
          },
        },
      };

      // Mock current time to be during quiet hours (11 PM)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);

      const notification: NotificationData = {
        id: 'test-quiet',
        type: NotificationType.TIPS_AND_TRICKS,
        priority: NotificationPriority.LOW,
        title: 'Beauty Tip',
        body: 'Try this new technique',
        channels: [NotificationChannel.PUSH],
        recipientId: 'provider-1',
      };

      const results = await notificationService.sendNotification(notification);

      // Should be queued, not sent immediately
      expect(results[0].status).toBe('queued');
    });

    it('should override quiet hours for critical notifications', async () => {
      // Mock current time to be during quiet hours
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2);

      const criticalNotification: NotificationData = {
        id: 'critical-1',
        type: NotificationType.BOOKING_CANCELLED,
        priority: NotificationPriority.CRITICAL,
        title: 'Booking Cancelled',
        body: 'Your booking has been cancelled',
        channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
        recipientId: 'provider-1',
      };

      const results = await notificationService.sendNotification(criticalNotification);

      // Should be sent immediately despite quiet hours
      expect(results[0].status).toBe('sent');
    });

    it('should handle SMS cost limits', async () => {
      const smsLimitExceededPrefs = edgeCasePreferences.smsLimitExceeded;

      const notification: NotificationData = {
        id: 'sms-test',
        type: NotificationType.NEW_BOOKING,
        priority: NotificationPriority.HIGH,
        title: 'New Booking',
        body: 'You have a new booking',
        channels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP],
        recipientId: 'provider-1',
      };

      const results = await notificationService.sendNotification(notification);

      // SMS should be skipped due to limit, WhatsApp should be sent
      const smsResult = results.find(r => r.channel === NotificationChannel.SMS);
      const whatsappResult = results.find(r => r.channel === NotificationChannel.WHATSAPP);

      expect(smsResult?.status).toBe('skipped');
      expect(whatsappResult?.status).toBe('sent');
    });

    it('should batch low priority notifications', async () => {
      const batchNotifications = Array.from({ length: 5 }, (_, i) => ({
        id: `batch-${i}`,
        type: NotificationType.TIPS_AND_TRICKS,
        priority: NotificationPriority.LOW,
        title: `Tip ${i + 1}`,
        body: `Beauty tip number ${i + 1}`,
        channels: [NotificationChannel.IN_APP],
        recipientId: 'provider-1',
        groupKey: 'tips-batch',
      }));

      const results = await Promise.all(
        batchNotifications.map(notif => notificationService.sendNotification(notif))
      );

      // All should be batched
      results.forEach(resultArray => {
        expect(resultArray[0].status).toBe('queued');
      });
    });
  });

  describe('Channel Fallback', () => {
    it('should fallback to alternative channels when primary fails', async () => {
      const notification: NotificationData = {
        id: 'fallback-test',
        type: NotificationType.PAYMENT_RECEIVED,
        priority: NotificationPriority.HIGH,
        title: 'Payment Received',
        body: 'You received a payment',
        channels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.PUSH],
        recipientId: 'provider-1',
      };

      // Mock SMS service to fail
      const mockSMSService = require('../../../src/services/notifications/SMSService');
      mockSMSService.sendSMS.mockRejectedValue(new Error('SMS service unavailable'));

      const results = await notificationService.sendNotification(notification);

      const smsResult = results.find(r => r.channel === NotificationChannel.SMS);
      const whatsappResult = results.find(r => r.channel === NotificationChannel.WHATSAPP);

      expect(smsResult?.status).toBe('failed');
      expect(whatsappResult?.status).toBe('sent');
    });

    it('should use WhatsApp as fallback for SMS when cost limit reached', async () => {
      const notification: NotificationData = {
        id: 'cost-fallback',
        type: NotificationType.BOOKING_REMINDER,
        priority: NotificationPriority.HIGH,
        title: 'Appointment Reminder',
        body: 'Your appointment is in 1 hour',
        channels: [NotificationChannel.SMS],
        recipientId: 'provider-1',
      };

      // Mock preferences with SMS limit reached
      const mockPreferencesManager = {
        getPreferences: jest.fn().mockResolvedValue({
          ...defaultNotificationPreferences,
          smsSettings: {
            ...defaultNotificationPreferences.smsSettings,
            currentUsage: 50,
            monthlyLimit: 50,
          },
        }),
      };

      notificationService['preferencesManager'] = mockPreferencesManager;

      const results = await notificationService.sendNotification(notification);

      // Should automatically use WhatsApp as fallback
      expect(results.some(r => r.channel === NotificationChannel.WHATSAPP)).toBe(true);
    });
  });

  describe('Notification Templates', () => {
    it('should apply templates correctly with variable substitution', () => {
      const template = {
        titleTemplate: 'New booking from {{customerName}}',
        titleTemplateAr: 'حجز جديد من {{customerName}}',
        bodyTemplate: '{{customerName}} booked {{serviceName}} for {{date}}',
        bodyTemplateAr: '{{customerName}} حجز {{serviceName}} في {{date}}',
        variables: ['customerName', 'serviceName', 'date'],
      };

      const variables = {
        customerName: 'سارة أحمد',
        serviceName: 'قص شعر',
        date: 'غداً',
      };

      const result = notificationService['applyTemplate'](template, variables);

      expect(result.title).toBe('New booking from سارة أحمد');
      expect(result.titleAr).toBe('حجز جديد من سارة أحمد');
      expect(result.body).toBe('سارة أحمد booked قص شعر for غداً');
      expect(result.bodyAr).toBe('سارة أحمد حجز قص شعر في غداً');
    });

    it('should handle missing template variables gracefully', () => {
      const template = {
        titleTemplate: 'Hello {{name}}, you have {{count}} notifications',
        bodyTemplate: 'Your {{type}} notification is ready',
        variables: ['name', 'count', 'type'],
      };

      const incompleteVariables = {
        name: 'أحمد',
        // missing count and type
      };

      const result = notificationService['applyTemplate'](template, incompleteVariables);

      expect(result.title).toBe('Hello أحمد, you have {{count}} notifications');
      expect(result.body).toBe('Your {{type}} notification is ready');
    });
  });

  describe('Notification Preferences', () => {
    it('should respect user channel preferences', async () => {
      const channelRestrictedPrefs = {
        ...defaultNotificationPreferences,
        channels: {
          ...defaultNotificationPreferences.channels,
          [NotificationChannel.SMS]: false,
          [NotificationChannel.EMAIL]: false,
        },
      };

      const mockPreferencesManager = {
        getPreferences: jest.fn().mockResolvedValue(channelRestrictedPrefs),
      };

      notificationService['preferencesManager'] = mockPreferencesManager;

      const notification: NotificationData = {
        id: 'pref-test',
        type: NotificationType.NEW_REVIEW,
        priority: NotificationPriority.MEDIUM,
        title: 'New Review',
        body: 'You received a new review',
        channels: [NotificationChannel.SMS, NotificationChannel.PUSH, NotificationChannel.EMAIL],
        recipientId: 'provider-1',
      };

      const results = await notificationService.sendNotification(notification);

      // Only PUSH should be sent, SMS and EMAIL should be skipped
      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe(NotificationChannel.PUSH);
      expect(results[0].status).toBe('sent');
    });

    it('should respect notification type preferences', async () => {
      const typeRestrictedPrefs = {
        ...defaultNotificationPreferences,
        types: {
          ...defaultNotificationPreferences.types,
          [NotificationType.TIPS_AND_TRICKS]: {
            enabled: false,
            channels: [],
          },
        },
      };

      const mockPreferencesManager = {
        getPreferences: jest.fn().mockResolvedValue(typeRestrictedPrefs),
      };

      notificationService['preferencesManager'] = mockPreferencesManager;

      const notification: NotificationData = {
        id: 'type-pref-test',
        type: NotificationType.TIPS_AND_TRICKS,
        priority: NotificationPriority.LOW,
        title: 'Beauty Tip',
        body: 'Try this technique',
        channels: [NotificationChannel.PUSH],
        recipientId: 'provider-1',
      };

      const results = await notificationService.sendNotification(notification);

      // Should be skipped due to type preference
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('skipped');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const notification: NotificationData = {
        id: 'network-error-test',
        type: NotificationType.NEW_BOOKING,
        priority: NotificationPriority.HIGH,
        title: 'New Booking',
        body: 'You have a new booking',
        channels: [NotificationChannel.PUSH],
        recipientId: 'provider-1',
      };

      // Mock network error
      const mockPushService = require('expo-notifications');
      mockPushService.scheduleNotificationAsync.mockRejectedValue(
        new Error('Network error')
      );

      const results = await notificationService.sendNotification(notification);

      expect(results[0].status).toBe('failed');
      expect(results[0].error).toContain('Network error');
    });

    it('should retry failed notifications according to priority', async () => {
      const criticalNotification: NotificationData = {
        id: 'retry-test',
        type: NotificationType.BOOKING_CANCELLED,
        priority: NotificationPriority.CRITICAL,
        title: 'Booking Cancelled',
        body: 'Your booking was cancelled',
        channels: [NotificationChannel.PUSH],
        recipientId: 'provider-1',
      };

      // Mock service to fail twice then succeed
      const mockPushService = require('expo-notifications');
      mockPushService.scheduleNotificationAsync
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ id: 'success' });

      const results = await notificationService.sendNotification(criticalNotification);

      // Should eventually succeed after retries
      expect(results[0].status).toBe('sent');
      expect(mockPushService.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
    });

    it('should handle malformed notification data', async () => {
      const malformedNotification = {
        // Missing required fields
        id: 'malformed',
        title: 'Test',
      } as NotificationData;

      const results = await notificationService.sendNotification(malformedNotification);

      expect(results[0].status).toBe('failed');
      expect(results[0].error).toContain('Invalid notification data');
    });
  });

  describe('Performance', () => {
    it('should handle bulk notifications efficiently', async () => {
      const bulkNotifications = Array.from({ length: 100 }, (_, i) => ({
        id: `bulk-${i}`,
        type: NotificationType.DAILY_SCHEDULE,
        priority: NotificationPriority.MEDIUM,
        title: `Schedule ${i}`,
        body: `Your schedule for day ${i}`,
        channels: [NotificationChannel.IN_APP],
        recipientId: `provider-${i % 10}`, // 10 different providers
        groupKey: 'daily-schedules',
      }));

      const startTime = Date.now();
      
      const results = await Promise.all(
        bulkNotifications.map(notif => notificationService.sendNotification(notif))
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(results).toHaveLength(100);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should cache preferences to avoid repeated API calls', async () => {
      const mockPreferencesManager = {
        getPreferences: jest.fn().mockResolvedValue(defaultNotificationPreferences),
      };

      notificationService['preferencesManager'] = mockPreferencesManager;

      const notifications = Array.from({ length: 10 }, (_, i) => ({
        id: `cache-${i}`,
        type: NotificationType.NEW_BOOKING,
        priority: NotificationPriority.HIGH,
        title: 'Test',
        body: 'Test',
        channels: [NotificationChannel.PUSH],
        recipientId: 'provider-1', // Same provider for all
      }));

      await Promise.all(
        notifications.map(notif => notificationService.sendNotification(notif))
      );

      // Should only call getPreferences once due to caching
      expect(mockPreferencesManager.getPreferences).toHaveBeenCalledTimes(1);
    });
  });

  describe('Analytics Integration', () => {
    it('should track notification delivery analytics', async () => {
      const notification: NotificationData = {
        id: 'analytics-test',
        type: NotificationType.PAYMENT_RECEIVED,
        priority: NotificationPriority.HIGH,
        title: 'Payment Received',
        body: '50 JOD received',
        channels: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP],
        recipientId: 'provider-1',
      };

      const mockAnalyticsService = require('../../../src/services/notifications/NotificationAnalyticsService');
      
      await notificationService.sendNotification(notification);

      expect(mockAnalyticsService.trackDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationId: 'analytics-test',
          type: NotificationType.PAYMENT_RECEIVED,
          channel: NotificationChannel.PUSH,
        })
      );
    });

    it('should track cost for paid channels', async () => {
      const smsNotification: NotificationData = {
        id: 'cost-tracking',
        type: NotificationType.BOOKING_REMINDER,
        priority: NotificationPriority.HIGH,
        title: 'Reminder',
        body: 'Your appointment is soon',
        channels: [NotificationChannel.SMS],
        recipientId: 'provider-1',
      };

      const mockAnalyticsService = require('../../../src/services/notifications/NotificationAnalyticsService');
      
      await notificationService.sendNotification(smsNotification);

      expect(mockAnalyticsService.trackCost).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.SMS,
          cost: 0.05, // SMS cost from NOTIFICATION_COSTS
        })
      );
    });
  });

  describe('Localization', () => {
    it('should use Arabic content for Arabic-preferring users', async () => {
      const arabicPrefs = {
        ...defaultNotificationPreferences,
        language: 'ar' as const,
      };

      const mockPreferencesManager = {
        getPreferences: jest.fn().mockResolvedValue(arabicPrefs),
      };

      notificationService['preferencesManager'] = mockPreferencesManager;

      const notification: NotificationData = {
        id: 'localization-test',
        type: NotificationType.NEW_BOOKING,
        priority: NotificationPriority.HIGH,
        title: 'New Booking',
        titleAr: 'حجز جديد',
        body: 'You have a new booking',
        bodyAr: 'لديك حجز جديد',
        channels: [NotificationChannel.PUSH],
        recipientId: 'provider-1',
      };

      const mockPushService = require('expo-notifications');
      
      await notificationService.sendNotification(notification);

      expect(mockPushService.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'حجز جديد',
            body: 'لديك حجز جديد',
          }),
        })
      );
    });

    it('should fallback to English when Arabic content is not available', async () => {
      const notification: NotificationData = {
        id: 'fallback-lang-test',
        type: NotificationType.NEW_BOOKING,
        priority: NotificationPriority.HIGH,
        title: 'New Booking',
        // titleAr is missing
        body: 'You have a new booking',
        // bodyAr is missing
        channels: [NotificationChannel.PUSH],
        recipientId: 'provider-1',
      };

      const mockPushService = require('expo-notifications');
      
      await notificationService.sendNotification(notification);

      expect(mockPushService.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'New Booking',
            body: 'You have a new booking',
          }),
        })
      );
    });
  });
});