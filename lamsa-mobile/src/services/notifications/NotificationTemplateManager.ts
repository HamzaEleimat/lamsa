import {
  NotificationTemplate,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationData,
} from './types';

// Simple UUID v4 generation function
const uuidv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export class NotificationTemplateManager {
  private static instance: NotificationTemplateManager;
  private templates: Map<NotificationType, NotificationTemplate>;

  private constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  static getInstance(): NotificationTemplateManager {
    if (!NotificationTemplateManager.instance) {
      NotificationTemplateManager.instance = new NotificationTemplateManager();
    }
    return NotificationTemplateManager.instance;
  }

  private initializeTemplates() {
    // Booking notifications
    this.templates.set(NotificationType.NEW_BOOKING, {
      id: 'new_booking',
      type: NotificationType.NEW_BOOKING,
      defaultChannel: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      priority: NotificationPriority.CRITICAL,
      titleTemplate: 'New Booking! 🎉',
      titleTemplateAr: 'حجز جديد! 🎉',
      bodyTemplate: '{{customerName}} booked {{serviceName}} for {{date}} at {{time}}',
      bodyTemplateAr: '{{customerName}} حجز {{serviceName}} في {{date}} الساعة {{time}}',
      variables: ['customerName', 'serviceName', 'date', 'time'],
      actions: [
        {
          id: 'accept',
          title: 'Accept',
          titleAr: 'قبول',
          action: 'booking.accept',
          style: 'primary',
        },
        {
          id: 'reject',
          title: 'Reject',
          titleAr: 'رفض',
          action: 'booking.reject',
          style: 'destructive',
        },
      ],
      groupable: false,
      ttl: 3600, // 1 hour
    });

    this.templates.set(NotificationType.BOOKING_CANCELLED, {
      id: 'booking_cancelled',
      type: NotificationType.BOOKING_CANCELLED,
      defaultChannel: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      priority: NotificationPriority.CRITICAL,
      titleTemplate: 'Booking Cancelled',
      titleTemplateAr: 'تم إلغاء الحجز',
      bodyTemplate: '{{customerName}} cancelled their {{serviceName}} appointment on {{date}}',
      bodyTemplateAr: '{{customerName}} ألغى موعد {{serviceName}} في {{date}}',
      variables: ['customerName', 'serviceName', 'date'],
      groupable: false,
      ttl: 86400, // 24 hours
    });

    this.templates.set(NotificationType.BOOKING_MODIFIED, {
      id: 'booking_modified',
      type: NotificationType.BOOKING_MODIFIED,
      defaultChannel: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      priority: NotificationPriority.HIGH,
      titleTemplate: 'Booking Modified',
      titleTemplateAr: 'تم تعديل الحجز',
      bodyTemplate: '{{customerName}} changed their appointment to {{newDate}} at {{newTime}}',
      bodyTemplateAr: '{{customerName}} غيّر موعده إلى {{newDate}} الساعة {{newTime}}',
      variables: ['customerName', 'newDate', 'newTime'],
      groupable: false,
      ttl: 3600,
    });

    // Review notifications
    this.templates.set(NotificationType.NEW_REVIEW, {
      id: 'new_review',
      type: NotificationType.NEW_REVIEW,
      defaultChannel: [NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      titleTemplate: 'New Review ⭐',
      titleTemplateAr: 'تقييم جديد ⭐',
      bodyTemplate: '{{customerName}} left a {{rating}} star review',
      bodyTemplateAr: '{{customerName}} ترك تقييم {{rating}} نجوم',
      variables: ['customerName', 'rating'],
      actions: [
        {
          id: 'respond',
          title: 'Respond',
          titleAr: 'رد',
          action: 'review.respond',
          style: 'primary',
        },
      ],
      groupable: true,
      ttl: 604800, // 7 days
    });

    // Payment notifications
    this.templates.set(NotificationType.PAYMENT_RECEIVED, {
      id: 'payment_received',
      type: NotificationType.PAYMENT_RECEIVED,
      defaultChannel: [NotificationChannel.IN_APP],
      priority: NotificationPriority.HIGH,
      titleTemplate: 'Payment Received 💰',
      titleTemplateAr: 'تم استلام الدفعة 💰',
      bodyTemplate: 'You received {{amount}} {{currency}} from {{customerName}}',
      bodyTemplateAr: 'استلمت {{amount}} {{currency}} من {{customerName}}',
      variables: ['amount', 'currency', 'customerName'],
      groupable: true,
      ttl: 2592000, // 30 days
    });

    this.templates.set(NotificationType.PAYMENT_FAILED, {
      id: 'payment_failed',
      type: NotificationType.PAYMENT_FAILED,
      defaultChannel: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      priority: NotificationPriority.CRITICAL,
      titleTemplate: 'Payment Failed ❌',
      titleTemplateAr: 'فشلت عملية الدفع ❌',
      bodyTemplate: 'Payment of {{amount}} {{currency}} from {{customerName}} failed',
      bodyTemplateAr: 'فشلت دفعة {{amount}} {{currency}} من {{customerName}}',
      variables: ['amount', 'currency', 'customerName'],
      groupable: false,
      ttl: 86400,
    });

    // Schedule notifications
    this.templates.set(NotificationType.DAILY_SCHEDULE, {
      id: 'daily_schedule',
      type: NotificationType.DAILY_SCHEDULE,
      defaultChannel: [NotificationChannel.PUSH],
      priority: NotificationPriority.MEDIUM,
      titleTemplate: "Today's Schedule 📅",
      titleTemplateAr: 'جدول اليوم 📅',
      bodyTemplate: 'You have {{appointmentCount}} appointments today, starting at {{firstAppointment}}',
      bodyTemplateAr: 'لديك {{appointmentCount}} مواعيد اليوم، تبدأ الساعة {{firstAppointment}}',
      variables: ['appointmentCount', 'firstAppointment'],
      groupable: false,
      ttl: 86400,
    });

    this.templates.set(NotificationType.BOOKING_REMINDER, {
      id: 'booking_reminder',
      type: NotificationType.BOOKING_REMINDER,
      defaultChannel: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      titleTemplate: 'Upcoming Appointment',
      titleTemplateAr: 'موعد قادم',
      bodyTemplate: '{{customerName}} has an appointment in {{timeUntil}}',
      bodyTemplateAr: '{{customerName}} لديه موعد بعد {{timeUntil}}',
      variables: ['customerName', 'timeUntil'],
      groupable: false,
      ttl: 3600,
    });

    // Platform announcements
    this.templates.set(NotificationType.ANNOUNCEMENT, {
      id: 'announcement',
      type: NotificationType.ANNOUNCEMENT,
      defaultChannel: [NotificationChannel.IN_APP],
      priority: NotificationPriority.LOW,
      titleTemplate: '{{title}}',
      titleTemplateAr: '{{title}}',
      bodyTemplate: '{{message}}',
      bodyTemplateAr: '{{message}}',
      variables: ['title', 'message'],
      groupable: true,
      ttl: 604800,
    });

    this.templates.set(NotificationType.FEATURE_UPDATE, {
      id: 'feature_update',
      type: NotificationType.FEATURE_UPDATE,
      defaultChannel: [NotificationChannel.IN_APP],
      priority: NotificationPriority.LOW,
      titleTemplate: 'New Feature! 🚀',
      titleTemplateAr: 'ميزة جديدة! 🚀',
      bodyTemplate: '{{featureName}} is now available. {{description}}',
      bodyTemplateAr: '{{featureName}} متاح الآن. {{description}}',
      variables: ['featureName', 'description'],
      groupable: true,
      ttl: 2592000,
    });

    // Marketing
    this.templates.set(NotificationType.TIPS_AND_TRICKS, {
      id: 'tips_and_tricks',
      type: NotificationType.TIPS_AND_TRICKS,
      defaultChannel: [NotificationChannel.EMAIL],
      priority: NotificationPriority.LOW,
      titleTemplate: 'Pro Tip: {{tipTitle}}',
      titleTemplateAr: 'نصيحة احترافية: {{tipTitle}}',
      bodyTemplate: '{{tipContent}}',
      bodyTemplateAr: '{{tipContent}}',
      variables: ['tipTitle', 'tipContent'],
      groupable: true,
      ttl: 2592000,
    });
  }

  // Get template by type
  getTemplate(type: NotificationType): NotificationTemplate | undefined {
    return this.templates.get(type);
  }

  // Create notification from template
  async createFromTemplate(
    type: NotificationType,
    data: {
      recipientId: string;
      data: Record<string, any>;
      overrides?: Partial<NotificationData>;
    }
  ): Promise<NotificationData> {
    const template = this.getTemplate(type);
    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }

    // Validate required variables
    const missingVariables = template.variables.filter(
      variable => !(variable in data.data)
    );
    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    // Replace variables in template
    const title = this.replaceVariables(template.titleTemplate, data.data);
    const titleAr = this.replaceVariables(template.titleTemplateAr, data.data);
    const body = this.replaceVariables(template.bodyTemplate, data.data);
    const bodyAr = this.replaceVariables(template.bodyTemplateAr, data.data);

    // Create notification
    const notification: NotificationData = {
      id: uuidv4(),
      type: template.type,
      priority: template.priority,
      title,
      titleAr,
      body,
      bodyAr,
      channels: template.defaultChannel,
      recipientId: data.recipientId,
      data: data.data,
      actions: template.actions,
      groupKey: template.groupable ? type : undefined,
      expiresAt: template.ttl 
        ? new Date(Date.now() + template.ttl * 1000)
        : undefined,
      ...data.overrides,
    };

    return notification;
  }

  // Replace variables in template string
  private replaceVariables(
    template: string,
    variables: Record<string, any>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return variables[variable] || match;
    });
  }

  // Create custom notification (not from template)
  createCustom(
    type: NotificationType,
    data: Omit<NotificationData, 'id'>
  ): NotificationData {
    return {
      ...data,
      type,
      id: uuidv4(),
    };
  }

  // Batch multiple notifications into a summary
  createBatchSummary(
    notifications: NotificationData[],
    recipientId: string
  ): NotificationData {
    const count = notifications.length;
    const types = new Set(notifications.map(n => n.type));
    
    let title = `You have ${count} new notifications`;
    let titleAr = `لديك ${count} إشعارات جديدة`;
    
    if (types.size === 1) {
      const type = notifications[0].type;
      switch (type) {
        case NotificationType.NEW_BOOKING:
          title = `${count} new bookings`;
          titleAr = `${count} حجوزات جديدة`;
          break;
        case NotificationType.NEW_REVIEW:
          title = `${count} new reviews`;
          titleAr = `${count} تقييمات جديدة`;
          break;
        case NotificationType.PAYMENT_RECEIVED:
          title = `${count} payments received`;
          titleAr = `${count} دفعات مستلمة`;
          break;
      }
    }

    return {
      id: uuidv4(),
      type: NotificationType.ANNOUNCEMENT,
      priority: NotificationPriority.MEDIUM,
      title,
      titleAr,
      body: 'Tap to view all notifications',
      bodyAr: 'اضغط لعرض جميع الإشعارات',
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      recipientId,
      data: {
        notificationIds: notifications.map(n => n.id),
        isBatch: true,
      },
    };
  }

  // Get all templates
  getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  // Update template (for admin use)
  updateTemplate(
    type: NotificationType,
    updates: Partial<NotificationTemplate>
  ): void {
    const existing = this.templates.get(type);
    if (!existing) {
      throw new Error(`Template not found for type: ${type}`);
    }

    this.templates.set(type, {
      ...existing,
      ...updates,
    });
  }
}