import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  NotificationData,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  NotificationPreferences,
  NotificationDeliveryResult,
  NotificationBatch,
  PRIORITY_CONFIG,
  NOTIFICATION_COSTS,
} from './types';
import { NotificationPreferencesManager } from './NotificationPreferencesManager';
import { NotificationQueue } from './NotificationQueue';
import { NotificationTemplateManager } from './NotificationTemplateManager';
import { WhatsAppService } from './WhatsAppService';
import { NotificationAnalyticsService } from './NotificationAnalytics';
import { SMSService } from './SMSService';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private preferencesManager: NotificationPreferencesManager;
  private notificationQueue: NotificationQueue;
  private templateManager: NotificationTemplateManager;
  private whatsAppService: WhatsAppService;
  private analyticsService: NotificationAnalyticsService;
  private smsService: SMSService;
  private pushToken: string | null = null;
  
  private constructor() {
    this.preferencesManager = NotificationPreferencesManager.getInstance();
    this.notificationQueue = NotificationQueue.getInstance();
    this.templateManager = NotificationTemplateManager.getInstance();
    this.whatsAppService = WhatsAppService.getInstance();
    this.analyticsService = NotificationAnalyticsService.getInstance();
    this.smsService = SMSService.getInstance();
    this.initialize();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initialize() {
    // Register for push notifications
    await this.registerForPushNotifications();
    
    // Set up notification listeners
    this.setupNotificationListeners();
    
    // Start queue processor
    this.notificationQueue.startProcessing();
  }

  private async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    
    this.pushToken = token.data;
    await this.savePushToken(token.data);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }

  private async savePushToken(token: string) {
    await AsyncStorage.setItem('@push_token', token);
    // TODO: Send token to backend
  }

  private setupNotificationListeners() {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleInAppNotification(notification);
    });

    // Handle notification interaction
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  // Main method to send notifications
  async sendNotification(notification: NotificationData): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    
    // Check user preferences
    const preferences = await this.preferencesManager.getPreferences(notification.recipientId);
    
    // Check if notification type is enabled
    const typePreference = preferences.types[notification.type];
    if (typePreference && !typePreference.enabled) {
      return [{
        notificationId: notification.id,
        channel: NotificationChannel.IN_APP,
        status: 'skipped',
        error: 'Notification type disabled by user',
      }];
    }

    // Determine channels based on priority and preferences
    const channels = await this.determineChannels(notification, preferences);
    
    // Check quiet hours
    if (!this.shouldSendNow(notification, preferences)) {
      // Queue for later
      await this.notificationQueue.enqueue(notification);
      return [{
        notificationId: notification.id,
        channel: NotificationChannel.IN_APP,
        status: 'queued',
      }];
    }

    // Check for batching
    if (this.shouldBatch(notification, preferences)) {
      await this.notificationQueue.addToBatch(notification);
      return [{
        notificationId: notification.id,
        channel: NotificationChannel.IN_APP,
        status: 'queued',
        error: 'Added to batch',
      }];
    }

    // Send through each channel
    for (const channel of channels) {
      const result = await this.sendThroughChannel(notification, channel, preferences);
      results.push(result);
      
      // Track analytics
      await this.analyticsService.trackSent(notification, result);
    }

    return results;
  }

  private async determineChannels(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): Promise<NotificationChannel[]> {
    const priorityConfig = PRIORITY_CONFIG[notification.priority];
    const typePreference = preferences.types[notification.type];
    
    // Start with notification's requested channels
    let channels = notification.channels;
    
    // Filter by priority config
    channels = channels.filter(channel => 
      priorityConfig.channels.includes(channel)
    );
    
    // Filter by user preferences
    channels = channels.filter(channel => 
      preferences.channels[channel]
    );
    
    // Apply type-specific preferences
    if (typePreference && typePreference.channels) {
      channels = channels.filter(channel => 
        typePreference.channels.includes(channel)
      );
    }
    
    // Cost optimization for SMS
    if (channels.includes(NotificationChannel.SMS)) {
      const canSendSMS = await this.checkSMSBudget(preferences);
      if (!canSendSMS) {
        channels = channels.filter(ch => ch !== NotificationChannel.SMS);
        // Add WhatsApp as fallback if not already included
        if (!channels.includes(NotificationChannel.WHATSAPP)) {
          channels.push(NotificationChannel.WHATSAPP);
        }
      }
    }
    
    // Always include in-app
    if (!channels.includes(NotificationChannel.IN_APP)) {
      channels.push(NotificationChannel.IN_APP);
    }
    
    return channels;
  }

  private shouldSendNow(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): boolean {
    const priorityConfig = PRIORITY_CONFIG[notification.priority];
    
    // Critical notifications override quiet hours
    if (priorityConfig.overridesQuietHours) {
      return true;
    }
    
    // Check quiet hours
    if (preferences.timing.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHour, startMin] = preferences.timing.quietHours.start.split(':').map(Number);
      const [endHour, endMin] = preferences.timing.quietHours.end.split(':').map(Number);
      
      const quietStart = startHour * 60 + startMin;
      const quietEnd = endHour * 60 + endMin;
      
      // Handle overnight quiet hours
      if (quietStart > quietEnd) {
        if (currentTime >= quietStart || currentTime < quietEnd) {
          return false;
        }
      } else {
        if (currentTime >= quietStart && currentTime < quietEnd) {
          return false;
        }
      }
    }
    
    // Check working days only
    if (preferences.timing.workingDaysOnly) {
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday or Saturday
        return false;
      }
    }
    
    return true;
  }

  private shouldBatch(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): boolean {
    // Critical and high priority notifications are never batched
    if (notification.priority === NotificationPriority.CRITICAL ||
        notification.priority === NotificationPriority.HIGH) {
      return false;
    }
    
    // Check batching preference
    if (preferences.timing.batchingPreference === 'immediate') {
      return false;
    }
    
    // Check type-specific batching
    const typePreference = preferences.types[notification.type];
    if (typePreference && typePreference.batching === false) {
      return false;
    }
    
    // Batch if notification has a group key
    return !!notification.groupKey;
  }

  private async checkSMSBudget(preferences: NotificationPreferences): Promise<boolean> {
    const smsSettings = preferences.smsSettings;
    
    // Check if we're in critical-only mode
    if (smsSettings.criticalOnly) {
      return false;
    }
    
    // Check monthly limit
    if (smsSettings.currentUsage >= smsSettings.monthlyLimit) {
      return false;
    }
    
    // Check if we need to reset usage
    const now = new Date();
    if (now > smsSettings.resetDate) {
      // Reset usage
      smsSettings.currentUsage = 0;
      smsSettings.resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await this.preferencesManager.updateSMSUsage(preferences.channels.toString(), 0);
    }
    
    return true;
  }

  private async sendThroughChannel(
    notification: NotificationData,
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): Promise<NotificationDeliveryResult> {
    try {
      switch (channel) {
        case NotificationChannel.PUSH:
          return await this.sendPushNotification(notification, preferences);
          
        case NotificationChannel.SMS:
          return await this.sendSMSNotification(notification, preferences);
          
        case NotificationChannel.WHATSAPP:
          return await this.sendWhatsAppNotification(notification, preferences);
          
        case NotificationChannel.EMAIL:
          return await this.sendEmailNotification(notification, preferences);
          
        case NotificationChannel.IN_APP:
          return await this.sendInAppNotification(notification);
          
        default:
          return {
            notificationId: notification.id,
            channel,
            status: 'failed',
            error: 'Unknown channel',
          };
      }
    } catch (error) {
      return {
        notificationId: notification.id,
        channel,
        status: 'failed',
        error: error.message,
      };
    }
  }

  private async sendPushNotification(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): Promise<NotificationDeliveryResult> {
    if (!this.pushToken) {
      throw new Error('No push token available');
    }

    const isRTL = preferences.language === 'ar';
    const title = isRTL ? notification.titleAr || notification.title : notification.title;
    const body = isRTL ? notification.bodyAr || notification.body : notification.body;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: notification.data || {},
        categoryIdentifier: notification.type,
        badge: 1,
      },
      trigger: notification.scheduledFor ? {
        date: notification.scheduledFor,
      } : null,
    });

    return {
      notificationId: notification.id,
      channel: NotificationChannel.PUSH,
      status: 'sent',
      sentAt: new Date(),
    };
  }

  private async sendSMSNotification(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): Promise<NotificationDeliveryResult> {
    // Get user phone number (would typically come from user profile)
    const phoneNumber = notification.data?.phoneNumber || '+962777123456';
    
    // Use SMS service to send the notification
    const result = await this.smsService.sendSMS(
      notification,
      phoneNumber,
      preferences
    );
    
    // Update SMS usage if sent successfully
    if (result.status === 'sent') {
      await this.preferencesManager.incrementSMSUsage(notification.recipientId);
    }
    
    return result;
  }

  private async sendWhatsAppNotification(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): Promise<NotificationDeliveryResult> {
    // Get user phone number (would typically come from user profile)
    // For now, we'll use a placeholder
    const phoneNumber = notification.data?.phoneNumber || '+962777123456';
    
    // Use WhatsApp service to send the notification
    const result = await this.whatsAppService.sendNotification(
      notification,
      phoneNumber
    );
    
    // Track WhatsApp usage if beyond free tier
    if (result.cost && result.cost > 0) {
      // TODO: Track WhatsApp costs similar to SMS
      console.log('WhatsApp cost:', result.cost);
    }
    
    return result;
  }

  private async sendEmailNotification(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): Promise<NotificationDeliveryResult> {
    // TODO: Implement email sending
    console.log('Sending Email:', notification);
    
    return {
      notificationId: notification.id,
      channel: NotificationChannel.EMAIL,
      status: 'sent',
      sentAt: new Date(),
    };
  }

  private async sendInAppNotification(
    notification: NotificationData
  ): Promise<NotificationDeliveryResult> {
    // Store in-app notification
    await this.storeInAppNotification(notification);
    
    // Emit event for real-time update
    // TODO: Implement event emitter
    
    return {
      notificationId: notification.id,
      channel: NotificationChannel.IN_APP,
      status: 'sent',
      sentAt: new Date(),
    };
  }

  private async storeInAppNotification(notification: NotificationData) {
    const key = `@notifications_${notification.recipientId}`;
    const existing = await AsyncStorage.getItem(key);
    const notifications = existing ? JSON.parse(existing) : [];
    
    notifications.unshift({
      ...notification,
      receivedAt: new Date().toISOString(),
      read: false,
    });
    
    // Keep only last 100 notifications
    if (notifications.length > 100) {
      notifications.splice(100);
    }
    
    await AsyncStorage.setItem(key, JSON.stringify(notifications));
  }

  private handleInAppNotification(notification: Notifications.Notification) {
    // Handle notification received while app is in foreground
    // Could show a toast or update UI
    
    // Track analytics
    const notificationId = notification.request.content.data?.notificationId;
    if (notificationId) {
      this.analyticsService.trackDelivered(
        notificationId,
        NotificationChannel.PUSH
      );
    }
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { notification, actionIdentifier } = response;
    
    // Handle notification interaction based on action
    switch (actionIdentifier) {
      case Notifications.DEFAULT_ACTION_IDENTIFIER:
        // User tapped the notification
        this.handleNotificationTap(notification);
        break;
      default:
        // Handle custom actions
        this.handleCustomAction(notification, actionIdentifier);
    }
  }

  private handleNotificationTap(notification: Notifications.Notification) {
    const data = notification.request.content.data;
    
    // Track analytics
    if (data?.notificationId && data?.recipientId) {
      this.analyticsService.trackOpened(
        data.notificationId,
        data.recipientId,
        NotificationChannel.PUSH
      );
    }
    
    // Navigate based on notification type
    if (data.deepLink) {
      // Handle deep link navigation
      console.log('Navigate to:', data.deepLink);
    }
  }

  private handleCustomAction(
    notification: Notifications.Notification,
    action: string
  ) {
    // Handle custom notification actions
    console.log('Custom action:', action, notification);
  }

  // Public methods for sending specific notification types
  async sendNewBookingNotification(
    providerId: string,
    bookingData: any
  ): Promise<NotificationDeliveryResult[]> {
    const notification = await this.templateManager.createFromTemplate(
      NotificationType.NEW_BOOKING,
      {
        recipientId: providerId,
        data: bookingData,
      }
    );
    
    return this.sendNotification(notification);
  }

  async sendDailyScheduleReminder(
    providerId: string,
    scheduleData: any
  ): Promise<NotificationDeliveryResult[]> {
    const notification = await this.templateManager.createFromTemplate(
      NotificationType.DAILY_SCHEDULE,
      {
        recipientId: providerId,
        data: scheduleData,
      }
    );
    
    return this.sendNotification(notification);
  }

  // Get unread notifications count
  async getUnreadCount(userId: string): Promise<number> {
    const key = `@notifications_${userId}`;
    const stored = await AsyncStorage.getItem(key);
    
    if (!stored) return 0;
    
    const notifications = JSON.parse(stored);
    return notifications.filter((n: any) => !n.read).length;
  }
  
  // Check if WhatsApp is available for a phone number
  async isWhatsAppAvailable(phoneNumber: string): Promise<boolean> {
    return await this.whatsAppService.checkNumberStatus(phoneNumber);
  }
  
  // Calculate SMS cost for a notification
  async calculateSMSCost(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): Promise<{ segments: number; cost: number }> {
    const isArabic = preferences.language === 'ar';
    const message = this.smsService.formatSMSMessage(notification, preferences);
    const segments = this.smsService.calculateSegments(message, isArabic);
    const cost = this.smsService.calculateCost(message, isArabic);
    
    return { segments, cost };
  }

  // Mark notification as read
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const key = `@notifications_${userId}`;
    const stored = await AsyncStorage.getItem(key);
    
    if (!stored) return;
    
    const notifications = JSON.parse(stored);
    const notification = notifications.find((n: any) => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
      await AsyncStorage.setItem(key, JSON.stringify(notifications));
    }
  }
}