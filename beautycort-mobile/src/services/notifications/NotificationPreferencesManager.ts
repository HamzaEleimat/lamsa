import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationPreferences,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationTypePreference,
} from './types';

const PREFERENCES_KEY_PREFIX = '@notification_preferences_';

export class NotificationPreferencesManager {
  private static instance: NotificationPreferencesManager;
  private cache: Map<string, NotificationPreferences> = new Map();

  private constructor() {}

  static getInstance(): NotificationPreferencesManager {
    if (!NotificationPreferencesManager.instance) {
      NotificationPreferencesManager.instance = new NotificationPreferencesManager();
    }
    return NotificationPreferencesManager.instance;
  }

  // Get user preferences with defaults
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    // Check cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId)!;
    }

    const key = `${PREFERENCES_KEY_PREFIX}${userId}`;
    const stored = await AsyncStorage.getItem(key);

    if (stored) {
      const preferences = JSON.parse(stored);
      this.cache.set(userId, preferences);
      return preferences;
    }

    // Return default preferences
    const defaults = this.getDefaultPreferences();
    await this.savePreferences(userId, defaults);
    return defaults;
  }

  // Save user preferences
  async savePreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    const key = `${PREFERENCES_KEY_PREFIX}${userId}`;
    await AsyncStorage.setItem(key, JSON.stringify(preferences));
    this.cache.set(userId, preferences);
  }

  // Update specific channel preference
  async updateChannelPreference(
    userId: string,
    channel: NotificationChannel,
    enabled: boolean
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    preferences.channels[channel] = enabled;
    await this.savePreferences(userId, preferences);
  }

  // Update specific notification type preference
  async updateTypePreference(
    userId: string,
    type: NotificationType,
    preference: NotificationTypePreference
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    preferences.types[type] = preference;
    await this.savePreferences(userId, preferences);
  }

  // Update quiet hours
  async updateQuietHours(
    userId: string,
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    }
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    preferences.timing.quietHours = quietHours;
    await this.savePreferences(userId, preferences);
  }

  // Update batching preference
  async updateBatchingPreference(
    userId: string,
    batching: 'immediate' | 'hourly' | 'daily' | 'weekly'
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    preferences.timing.batchingPreference = batching;
    await this.savePreferences(userId, preferences);
  }

  // Update SMS settings
  async updateSMSSettings(
    userId: string,
    settings: {
      criticalOnly?: boolean;
      monthlyLimit?: number;
    }
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    if (settings.criticalOnly !== undefined) {
      preferences.smsSettings.criticalOnly = settings.criticalOnly;
    }
    if (settings.monthlyLimit !== undefined) {
      preferences.smsSettings.monthlyLimit = settings.monthlyLimit;
    }
    await this.savePreferences(userId, preferences);
  }

  // Increment SMS usage
  async incrementSMSUsage(userId: string): Promise<void> {
    const preferences = await this.getPreferences(userId);
    preferences.smsSettings.currentUsage += 1;
    await this.savePreferences(userId, preferences);
  }

  // Update SMS usage (for resets)
  async updateSMSUsage(userId: string, usage: number): Promise<void> {
    const preferences = await this.getPreferences(userId);
    preferences.smsSettings.currentUsage = usage;
    await this.savePreferences(userId, preferences);
  }

  // Get remaining SMS quota
  async getRemainingSMSQuota(userId: string): Promise<number> {
    const preferences = await this.getPreferences(userId);
    const { monthlyLimit, currentUsage } = preferences.smsSettings;
    return Math.max(0, monthlyLimit - currentUsage);
  }

  // Reset preferences to defaults
  async resetToDefaults(userId: string): Promise<void> {
    const defaults = this.getDefaultPreferences();
    await this.savePreferences(userId, defaults);
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get default preferences
  private getDefaultPreferences(): NotificationPreferences {
    return {
      channels: {
        [NotificationChannel.PUSH]: true,
        [NotificationChannel.SMS]: false, // Off by default to save costs
        [NotificationChannel.WHATSAPP]: true,
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.IN_APP]: true,
      },

      types: {
        // Critical notifications - always on
        [NotificationType.NEW_BOOKING]: {
          enabled: true,
          channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
          priority: NotificationPriority.CRITICAL,
          batching: false,
        },
        [NotificationType.BOOKING_CANCELLED]: {
          enabled: true,
          channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
          priority: NotificationPriority.CRITICAL,
          batching: false,
        },
        [NotificationType.PAYMENT_FAILED]: {
          enabled: true,
          channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          priority: NotificationPriority.CRITICAL,
          batching: false,
        },

        // Important notifications
        [NotificationType.BOOKING_MODIFIED]: {
          enabled: true,
          channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
          batching: false,
        },
        [NotificationType.PAYMENT_RECEIVED]: {
          enabled: true,
          channels: [NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
          batching: true,
        },
        [NotificationType.NEW_REVIEW]: {
          enabled: true,
          channels: [NotificationChannel.IN_APP],
          priority: NotificationPriority.MEDIUM,
          batching: true,
        },

        // Schedule reminders
        [NotificationType.DAILY_SCHEDULE]: {
          enabled: true,
          channels: [NotificationChannel.PUSH],
          priority: NotificationPriority.MEDIUM,
          batching: false,
        },
        [NotificationType.BOOKING_REMINDER]: {
          enabled: true,
          channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
          priority: NotificationPriority.MEDIUM,
          batching: false,
        },

        // Low priority
        [NotificationType.ANNOUNCEMENT]: {
          enabled: true,
          channels: [NotificationChannel.IN_APP],
          priority: NotificationPriority.LOW,
          batching: true,
        },
        [NotificationType.TIPS_AND_TRICKS]: {
          enabled: false, // Off by default
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.LOW,
          batching: true,
        },
      },

      timing: {
        quietHours: {
          enabled: true,
          start: '22:00', // 10 PM
          end: '08:00',   // 8 AM
        },
        workingDaysOnly: false,
        batchingPreference: 'hourly',
        timezone: 'Asia/Amman',
      },

      smsSettings: {
        criticalOnly: true,
        monthlyLimit: 50, // Free tier
        currentUsage: 0,
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      },

      language: 'ar', // Default to Arabic for Jordan market
    };
  }

  // Get provider-specific defaults (different from customer defaults)
  getProviderDefaults(): NotificationPreferences {
    const defaults = this.getDefaultPreferences();
    
    // Providers need more immediate notifications
    defaults.timing.batchingPreference = 'immediate';
    
    // Enable WhatsApp for new bookings by default
    defaults.types[NotificationType.NEW_BOOKING]!.channels.push(NotificationChannel.WHATSAPP);
    
    // Enable daily schedule reminders
    defaults.types[NotificationType.DAILY_SCHEDULE]!.enabled = true;
    
    return defaults;
  }

  // Analyze preferences to provide recommendations
  async analyzePreferences(userId: string): Promise<{
    recommendations: string[];
    warnings: string[];
  }> {
    const preferences = await this.getPreferences(userId);
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Check if critical notifications are disabled
    const criticalTypes = [
      NotificationType.NEW_BOOKING,
      NotificationType.BOOKING_CANCELLED,
      NotificationType.PAYMENT_FAILED,
    ];

    for (const type of criticalTypes) {
      const pref = preferences.types[type];
      if (pref && !pref.enabled) {
        warnings.push(`Critical notification "${type}" is disabled`);
      }
    }

    // Check if all channels are disabled
    const enabledChannels = Object.values(preferences.channels).filter(Boolean);
    if (enabledChannels.length === 0) {
      warnings.push('All notification channels are disabled');
    }

    // Check SMS usage
    const remainingSMS = preferences.smsSettings.monthlyLimit - preferences.smsSettings.currentUsage;
    if (remainingSMS < 10) {
      recommendations.push('Consider upgrading your SMS plan or enabling WhatsApp notifications');
    }

    // Check quiet hours
    if (!preferences.timing.quietHours.enabled) {
      recommendations.push('Consider enabling quiet hours to avoid notifications during sleep');
    }

    // Check batching
    if (preferences.timing.batchingPreference === 'immediate') {
      recommendations.push('Consider enabling notification batching to reduce interruptions');
    }

    return { recommendations, warnings };
  }
}