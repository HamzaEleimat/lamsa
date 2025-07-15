import { 
  NotificationData, 
  NotificationType, 
  NotificationPriority, 
  NotificationChannel,
  NotificationPreferences,
  NotificationTemplate
} from '../../src/services/notifications/types';

// Test notification templates
export const notificationTemplates: NotificationTemplate[] = [
  {
    id: 'new-booking',
    type: NotificationType.NEW_BOOKING,
    defaultChannel: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP],
    priority: NotificationPriority.HIGH,
    titleTemplate: 'New Booking!',
    titleTemplateAr: 'حجز جديد!',
    bodyTemplate: '{{customerName}} booked {{serviceName}} for {{date}} at {{time}}',
    bodyTemplateAr: '{{customerName}} حجز {{serviceName}} في {{date}} الساعة {{time}}',
    variables: ['customerName', 'serviceName', 'date', 'time'],
    groupable: true,
    ttl: 3600,
  },
  {
    id: 'booking-cancelled',
    type: NotificationType.BOOKING_CANCELLED,
    defaultChannel: [NotificationChannel.PUSH, NotificationChannel.SMS],
    priority: NotificationPriority.CRITICAL,
    titleTemplate: 'Booking Cancelled',
    titleTemplateAr: 'تم إلغاء الحجز',
    bodyTemplate: '{{customerName}} cancelled {{serviceName}} on {{date}}',
    bodyTemplateAr: '{{customerName}} ألغى {{serviceName}} في {{date}}',
    variables: ['customerName', 'serviceName', 'date'],
    groupable: false,
    ttl: 7200,
  },
  {
    id: 'daily-schedule',
    type: NotificationType.DAILY_SCHEDULE,
    defaultChannel: [NotificationChannel.IN_APP, NotificationChannel.WHATSAPP],
    priority: NotificationPriority.MEDIUM,
    titleTemplate: 'Your Schedule for Today',
    titleTemplateAr: 'جدولك لليوم',
    bodyTemplate: 'You have {{count}} appointments today. First at {{firstTime}}',
    bodyTemplateAr: 'لديك {{count}} مواعيد اليوم. الأول في {{firstTime}}',
    variables: ['count', 'firstTime'],
    groupable: false,
    ttl: 86400,
  },
];

// Test notifications
export const testNotifications: NotificationData[] = [
  {
    id: 'notif-1',
    type: NotificationType.NEW_BOOKING,
    priority: NotificationPriority.HIGH,
    title: 'New Booking!',
    titleAr: 'حجز جديد!',
    body: 'سارة أحمد booked قص شعر نسائي for tomorrow at 10:00 AM',
    bodyAr: 'سارة أحمد حجزت قص شعر نسائي غداً الساعة 10:00 صباحاً',
    channels: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP],
    recipientId: 'provider-1',
    data: {
      bookingId: 'booking-123',
      customerId: 'customer-123',
      serviceName: 'قص شعر نسائي',
    },
    metadata: {
      bookingId: 'booking-123',
      customerId: 'customer-123',
      serviceId: 'service-1',
      amount: 15,
      currency: 'JOD',
      deepLink: 'beautycort://booking/booking-123',
    },
  },
  {
    id: 'notif-2',
    type: NotificationType.BOOKING_CANCELLED,
    priority: NotificationPriority.CRITICAL,
    title: 'Booking Cancelled',
    titleAr: 'تم إلغاء الحجز',
    body: 'منى الخطيب cancelled صبغة شعر on Jan 20',
    bodyAr: 'منى الخطيب ألغت صبغة شعر في 20 يناير',
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
    recipientId: 'provider-1',
    data: {
      bookingId: 'booking-124',
      reason: 'Customer requested',
    },
  },
  {
    id: 'notif-3',
    type: NotificationType.NEW_REVIEW,
    priority: NotificationPriority.MEDIUM,
    title: 'New 5-star Review!',
    titleAr: 'تقييم جديد 5 نجوم!',
    body: 'هند الزعبي left a glowing review',
    bodyAr: 'هند الزعبي تركت تقييماً رائعاً',
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    recipientId: 'provider-1',
    data: {
      reviewId: 'review-123',
      rating: 5,
      comment: 'خدمة ممتازة!',
    },
  },
  {
    id: 'notif-4',
    type: NotificationType.DAILY_SCHEDULE,
    priority: NotificationPriority.MEDIUM,
    title: 'Your Schedule for Today',
    titleAr: 'جدولك لليوم',
    body: 'You have 8 appointments today. First at 9:00 AM',
    bodyAr: 'لديك 8 مواعيد اليوم. الأول في 9:00 صباحاً',
    channels: [NotificationChannel.IN_APP],
    recipientId: 'provider-1',
    scheduledFor: new Date('2024-01-15T06:00:00'),
    data: {
      appointmentCount: 8,
      firstAppointmentTime: '9:00 AM',
      lastAppointmentTime: '7:00 PM',
    },
  },
  {
    id: 'notif-5',
    type: NotificationType.PAYMENT_RECEIVED,
    priority: NotificationPriority.HIGH,
    title: 'Payment Received',
    titleAr: 'تم استلام الدفعة',
    body: '15 JOD received for قص شعر نسائي',
    bodyAr: 'تم استلام 15 دينار مقابل قص شعر نسائي',
    channels: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP],
    recipientId: 'provider-1',
    data: {
      amount: 15,
      currency: 'JOD',
      paymentMethod: 'ONLINE',
      bookingId: 'booking-125',
    },
  },
];

// Test notification preferences
export const defaultNotificationPreferences: NotificationPreferences = {
  channels: {
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.SMS]: true,
    [NotificationChannel.WHATSAPP]: true,
    [NotificationChannel.EMAIL]: false,
    [NotificationChannel.IN_APP]: true,
  },
  types: {
    [NotificationType.NEW_BOOKING]: {
      enabled: true,
      channels: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP],
      priority: NotificationPriority.HIGH,
      batching: false,
    },
    [NotificationType.BOOKING_CANCELLED]: {
      enabled: true,
      channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.WHATSAPP],
      priority: NotificationPriority.CRITICAL,
      batching: false,
    },
    [NotificationType.NEW_REVIEW]: {
      enabled: true,
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      batching: true,
    },
    [NotificationType.DAILY_SCHEDULE]: {
      enabled: true,
      channels: [NotificationChannel.IN_APP, NotificationChannel.WHATSAPP],
      priority: NotificationPriority.MEDIUM,
      batching: false,
    },
    [NotificationType.PAYMENT_RECEIVED]: {
      enabled: true,
      channels: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP],
      priority: NotificationPriority.HIGH,
      batching: false,
    },
  },
  timing: {
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
    },
    workingDaysOnly: false,
    batchingPreference: 'hourly',
    timezone: 'Asia/Amman',
  },
  smsSettings: {
    criticalOnly: false,
    monthlyLimit: 50,
    currentUsage: 12,
    resetDate: new Date('2024-02-01'),
  },
  language: 'ar',
};

// Edge case preferences
export const edgeCasePreferences = {
  // All notifications disabled
  allDisabled: {
    ...defaultNotificationPreferences,
    channels: {
      [NotificationChannel.PUSH]: false,
      [NotificationChannel.SMS]: false,
      [NotificationChannel.WHATSAPP]: false,
      [NotificationChannel.EMAIL]: false,
      [NotificationChannel.IN_APP]: false,
    },
  },

  // SMS limit exceeded
  smsLimitExceeded: {
    ...defaultNotificationPreferences,
    smsSettings: {
      criticalOnly: true,
      monthlyLimit: 50,
      currentUsage: 50,
      resetDate: new Date('2024-02-01'),
    },
  },

  // 24/7 quiet hours (no notifications)
  alwaysQuiet: {
    ...defaultNotificationPreferences,
    timing: {
      ...defaultNotificationPreferences.timing,
      quietHours: {
        enabled: true,
        start: '00:00',
        end: '23:59',
      },
    },
  },

  // Immediate delivery only
  immediateOnly: {
    ...defaultNotificationPreferences,
    timing: {
      ...defaultNotificationPreferences.timing,
      batchingPreference: 'immediate',
    },
  },
};

// Test notification scenarios
export const testScenarios = {
  // Bulk notifications for stress testing
  bulkNotifications: (count: number, recipientId: string): NotificationData[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `bulk-notif-${i}`,
      type: NotificationType.NEW_BOOKING,
      priority: NotificationPriority.MEDIUM,
      title: `Booking #${i + 1}`,
      titleAr: `حجز #${i + 1}`,
      body: `Customer ${i + 1} made a booking`,
      bodyAr: `العميل ${i + 1} قام بالحجز`,
      channels: [NotificationChannel.IN_APP],
      recipientId,
      groupKey: 'bulk-bookings',
      data: {
        bookingId: `booking-bulk-${i}`,
      },
    }));
  },

  // Time-sensitive notifications
  timeSensitiveNotifications: (recipientId: string): NotificationData[] => [
    {
      id: 'urgent-1',
      type: NotificationType.BOOKING_REMINDER,
      priority: NotificationPriority.CRITICAL,
      title: 'Appointment in 30 minutes!',
      titleAr: 'موعد بعد 30 دقيقة!',
      body: 'سارة أحمد arriving at 10:00 AM',
      bodyAr: 'سارة أحمد ستصل في 10:00 صباحاً',
      channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
      recipientId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
    {
      id: 'urgent-2',
      type: NotificationType.BOOKING_MODIFIED,
      priority: NotificationPriority.HIGH,
      title: 'Booking Time Changed',
      titleAr: 'تم تغيير وقت الحجز',
      body: 'منى الخطيب changed time to 2:00 PM',
      bodyAr: 'منى الخطيب غيرت الوقت إلى 2:00 مساءً',
      channels: [NotificationChannel.PUSH, NotificationChannel.WHATSAPP],
      recipientId,
    },
  ],

  // Different language notifications
  multilingualNotifications: (recipientId: string): NotificationData[] => [
    {
      id: 'ar-only',
      type: NotificationType.ANNOUNCEMENT,
      priority: NotificationPriority.LOW,
      title: 'إعلان هام',
      titleAr: 'إعلان هام',
      body: 'نود إعلامكم بتحديث سياسة الخصوصية',
      bodyAr: 'نود إعلامكم بتحديث سياسة الخصوصية',
      channels: [NotificationChannel.IN_APP],
      recipientId,
    },
    {
      id: 'en-ar',
      type: NotificationType.FEATURE_UPDATE,
      priority: NotificationPriority.LOW,
      title: 'New Feature Available',
      titleAr: 'ميزة جديدة متاحة',
      body: 'Try our new analytics dashboard',
      bodyAr: 'جرب لوحة التحليلات الجديدة',
      channels: [NotificationChannel.IN_APP],
      recipientId,
    },
  ],
};

// Helper functions
export const generateNotificationBatch = (
  type: NotificationType,
  count: number,
  recipientId: string
): NotificationData[] => {
  const baseTime = new Date();
  return Array.from({ length: count }, (_, i) => ({
    id: `batch-${type}-${i}`,
    type,
    priority: NotificationPriority.MEDIUM,
    title: `${type} Notification ${i + 1}`,
    titleAr: `إشعار ${type} ${i + 1}`,
    body: `This is notification ${i + 1} of type ${type}`,
    bodyAr: `هذا هو الإشعار ${i + 1} من نوع ${type}`,
    channels: [NotificationChannel.IN_APP],
    recipientId,
    scheduledFor: new Date(baseTime.getTime() + i * 60000), // 1 minute apart
    groupKey: `${type}-batch`,
  }));
};

export const createMockNotificationDeliveryResult = (
  notificationId: string,
  channel: NotificationChannel,
  success: boolean = true
) => ({
  notificationId,
  channel,
  status: success ? 'sent' : 'failed',
  error: success ? undefined : 'Mock delivery error',
  sentAt: success ? new Date() : undefined,
  cost: channel === NotificationChannel.SMS ? 0.05 : 
        channel === NotificationChannel.WHATSAPP ? 0.02 : 0,
});