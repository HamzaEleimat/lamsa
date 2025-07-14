// Notification Types and Interfaces

export enum NotificationType {
  // Booking related
  NEW_BOOKING = 'NEW_BOOKING',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_MODIFIED = 'BOOKING_MODIFIED',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  
  // Reviews
  NEW_REVIEW = 'NEW_REVIEW',
  REVIEW_RESPONSE_NEEDED = 'REVIEW_RESPONSE_NEEDED',
  
  // Payments
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYOUT_PROCESSED = 'PAYOUT_PROCESSED',
  
  // Schedule
  DAILY_SCHEDULE = 'DAILY_SCHEDULE',
  SCHEDULE_REMINDER = 'SCHEDULE_REMINDER',
  
  // Platform
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  FEATURE_UPDATE = 'FEATURE_UPDATE',
  
  // Marketing
  TIPS_AND_TRICKS = 'TIPS_AND_TRICKS',
  PROMOTION_OPPORTUNITY = 'PROMOTION_OPPORTUNITY',
}

export enum NotificationPriority {
  CRITICAL = 'CRITICAL',     // Always deliver immediately
  HIGH = 'HIGH',             // Deliver soon
  MEDIUM = 'MEDIUM',         // Can be batched
  LOW = 'LOW',               // Digest only
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  recipientId: string;
  scheduledFor?: Date;
  expiresAt?: Date;
  groupKey?: string; // For batching similar notifications
  actions?: NotificationAction[];
  metadata?: NotificationMetadata;
}

export interface NotificationAction {
  id: string;
  title: string;
  titleAr?: string;
  action: string; // Deep link or action identifier
  style?: 'default' | 'destructive' | 'primary';
}

export interface NotificationMetadata {
  bookingId?: string;
  customerId?: string;
  serviceId?: string;
  amount?: number;
  currency?: string;
  imageUrl?: string;
  deepLink?: string;
}

export interface NotificationPreferences {
  channels: {
    [NotificationChannel.PUSH]: boolean;
    [NotificationChannel.SMS]: boolean;
    [NotificationChannel.WHATSAPP]: boolean;
    [NotificationChannel.EMAIL]: boolean;
    [NotificationChannel.IN_APP]: boolean;
  };
  
  types: {
    [key in NotificationType]?: NotificationTypePreference;
  };
  
  timing: {
    quietHours: {
      enabled: boolean;
      start: string; // "22:00"
      end: string;   // "08:00"
    };
    workingDaysOnly: boolean;
    batchingPreference: 'immediate' | 'hourly' | 'daily' | 'weekly';
    timezone: string;
  };
  
  smsSettings: {
    criticalOnly: boolean;
    monthlyLimit: number;
    currentUsage: number;
    resetDate: Date;
  };
  
  language: 'ar' | 'en';
}

export interface NotificationTypePreference {
  enabled: boolean;
  channels: NotificationChannel[];
  priority?: NotificationPriority;
  batching?: boolean;
}

export interface NotificationDeliveryResult {
  notificationId: string;
  channel: NotificationChannel;
  status: 'sent' | 'failed' | 'queued' | 'skipped';
  error?: string;
  sentAt?: Date;
  cost?: number; // For SMS/WhatsApp
}

export interface NotificationBatch {
  id: string;
  notifications: NotificationData[];
  scheduledFor: Date;
  recipientId: string;
  type: 'digest' | 'summary' | 'grouped';
}

// Notification template types
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  defaultChannel: NotificationChannel[];
  priority: NotificationPriority;
  titleTemplate: string;
  titleTemplateAr: string;
  bodyTemplate: string;
  bodyTemplateAr: string;
  variables: string[]; // List of required variables
  actions?: NotificationAction[];
  groupable: boolean;
  ttl?: number; // Time to live in seconds
}

// Analytics types
export interface NotificationAnalytics {
  notificationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  interactedAt?: Date;
  action?: string;
  dismissed?: boolean;
  cost?: number;
}

// Cost tracking for bootstrap budget
export interface NotificationCost {
  channel: NotificationChannel;
  basePrice: number;
  currency: 'JOD';
  freeQuota?: number;
  currentUsage?: number;
}

export const NOTIFICATION_COSTS: Record<NotificationChannel, NotificationCost> = {
  [NotificationChannel.PUSH]: {
    channel: NotificationChannel.PUSH,
    basePrice: 0,
    currency: 'JOD',
  },
  [NotificationChannel.SMS]: {
    channel: NotificationChannel.SMS,
    basePrice: 0.05, // 5 qirsh per SMS
    currency: 'JOD',
    freeQuota: 50, // 50 free SMS per month
  },
  [NotificationChannel.WHATSAPP]: {
    channel: NotificationChannel.WHATSAPP,
    basePrice: 0.02, // 2 qirsh per message after free tier
    currency: 'JOD',
    freeQuota: 1000, // WhatsApp Business API free tier
  },
  [NotificationChannel.EMAIL]: {
    channel: NotificationChannel.EMAIL,
    basePrice: 0,
    currency: 'JOD',
  },
  [NotificationChannel.IN_APP]: {
    channel: NotificationChannel.IN_APP,
    basePrice: 0,
    currency: 'JOD',
  },
};

// Priority configuration
export const PRIORITY_CONFIG = {
  [NotificationPriority.CRITICAL]: {
    requiresImmediate: true,
    overridesQuietHours: true,
    channels: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP, NotificationChannel.SMS, NotificationChannel.IN_APP],
    maxRetries: 3,
  },
  [NotificationPriority.HIGH]: {
    requiresImmediate: true,
    overridesQuietHours: false,
    channels: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
    maxRetries: 2,
  },
  [NotificationPriority.MEDIUM]: {
    requiresImmediate: false,
    overridesQuietHours: false,
    channels: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
    maxRetries: 1,
  },
  [NotificationPriority.LOW]: {
    requiresImmediate: false,
    overridesQuietHours: false,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    maxRetries: 0,
  },
};

// WhatsApp specific types
export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'interactive';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  template?: {
    name: string;
    language: {
      code: WhatsAppTemplateLanguage;
    };
    components?: WhatsAppTemplateComponent[];
  };
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: WhatsAppTemplateLanguage;
  components: WhatsAppTemplateComponent[];
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplateParameter {
  type: 'text' | 'image' | 'video' | 'document';
  text?: string;
  image?: {
    link: string;
  };
  video?: {
    link: string;
  };
  document?: {
    link: string;
    filename: string;
  };
}

export type WhatsAppTemplateLanguage = 'ar' | 'en_US';