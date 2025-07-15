/**
 * Notification Templates Service
 * Manages bilingual message templates for various booking events
 * Supports dynamic content rendering and template customization
 */

import { NotificationTemplate, NotificationEvent, NotificationChannel } from './notification.service';

export interface TemplateVariable {
  name: string;
  description: {
    en: string;
    ar: string;
  };
  type: 'string' | 'number' | 'date' | 'currency';
  required: boolean;
  defaultValue?: string;
}

export interface TemplateGroup {
  id: string;
  name: {
    en: string;
    ar: string;
  };
  description: {
    en: string;
    ar: string;
  };
  templates: NotificationTemplate[];
  variables: TemplateVariable[];
}

export class NotificationTemplatesService {
  private static instance: NotificationTemplatesService;
  private templates: Map<string, NotificationTemplate> = new Map();
  private templateGroups: TemplateGroup[] = [];

  private constructor() {
    this.initializeDefaultTemplates();
  }

  static getInstance(): NotificationTemplatesService {
    if (!NotificationTemplatesService.instance) {
      NotificationTemplatesService.instance = new NotificationTemplatesService();
    }
    return NotificationTemplatesService.instance;
  }

  /**
   * Get template by event and channel
   */
  getTemplate(event: NotificationEvent, channel: NotificationChannel): NotificationTemplate | null {
    const templateId = `${event}_${channel}`;
    return this.templates.get(templateId) || null;
  }

  /**
   * Get all templates for an event
   */
  getTemplatesForEvent(event: NotificationEvent): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.event === event);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template groups
   */
  getTemplateGroups(): TemplateGroup[] {
    return this.templateGroups;
  }

  /**
   * Render template with data
   */
  renderTemplate(
    templateId: string,
    language: 'ar' | 'en',
    data: Record<string, any>
  ): { title: string; body: string; actionText?: string } | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    const content = template.content[language];
    
    const renderText = (text: string): string => {
      let rendered = text;
      
      // Replace variables with actual values
      for (const variable of template.variables) {
        const value = this.formatValue(data[variable], variable, language) || `{${variable}}`;
        rendered = rendered.replace(new RegExp(`\\{${variable}\\}`, 'g'), value);
      }
      
      return rendered;
    };

    return {
      title: renderText(content.title),
      body: renderText(content.body),
      actionText: content.actionText ? renderText(content.actionText) : undefined
    };
  }

  /**
   * Format value based on type and language
   */
  private formatValue(value: any, variableName: string, language: 'ar' | 'en'): string {
    if (value === null || value === undefined) {
      return '';
    }

    // Date formatting
    if (variableName.includes('date') || variableName.includes('Date')) {
      return this.formatDate(value, language);
    }

    // Time formatting
    if (variableName.includes('time') || variableName.includes('Time')) {
      return this.formatTime(value, language);
    }

    // Currency formatting
    if (variableName.includes('amount') || variableName.includes('price') || variableName.includes('fee')) {
      return this.formatCurrency(value, language);
    }

    // Phone number formatting
    if (variableName.includes('phone') || variableName.includes('Phone')) {
      return this.formatPhone(value);
    }

    return String(value);
  }

  /**
   * Format date for Arabic/English
   */
  private formatDate(date: any, language: 'ar' | 'en'): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (language === 'ar') {
        return dateObj.toLocaleDateString('ar-JO', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else {
        return dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch {
      return String(date);
    }
  }

  /**
   * Format time for Arabic/English
   */
  private formatTime(time: any, language: 'ar' | 'en'): string {
    try {
      // Handle HH:mm format
      if (typeof time === 'string' && time.includes(':')) {
        const [hours, minutes] = time.split(':');
        const hour24 = parseInt(hours);
        const min = parseInt(minutes);
        
        if (language === 'ar') {
          // Arabic 12-hour format
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const period = hour24 >= 12 ? 'مساءً' : 'صباحاً';
          return `${hour12}:${min.toString().padStart(2, '0')} ${period}`;
        } else {
          // English 12-hour format
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const period = hour24 >= 12 ? 'PM' : 'AM';
          return `${hour12}:${min.toString().padStart(2, '0')} ${period}`;
        }
      }
      
      return String(time);
    } catch {
      return String(time);
    }
  }

  /**
   * Format currency (JOD)
   */
  private formatCurrency(amount: any, language: 'ar' | 'en'): string {
    try {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      if (language === 'ar') {
        return `${numAmount.toFixed(2)} د.أ`;
      } else {
        return `${numAmount.toFixed(2)} JOD`;
      }
    } catch {
      return String(amount);
    }
  }

  /**
   * Format phone number (Jordan format)
   */
  private formatPhone(phone: any): string {
    try {
      const phoneStr = String(phone).replace(/\D/g, ''); // Remove non-digits
      
      if (phoneStr.startsWith('962')) {
        // International format: +962 7X XXX XXXX
        const national = phoneStr.substring(3);
        if (national.length === 9) {
          return `+962 ${national.substring(0, 2)} ${national.substring(2, 5)} ${national.substring(5)}`;
        }
      } else if (phoneStr.startsWith('07') && phoneStr.length === 10) {
        // National format: 07X XXX XXXX
        return `${phoneStr.substring(0, 3)} ${phoneStr.substring(3, 6)} ${phoneStr.substring(6)}`;
      }
      
      return String(phone);
    } catch {
      return String(phone);
    }
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    // Booking Created Templates
    this.addTemplate({
      id: 'booking_created_sms',
      event: 'booking_created',
      channel: 'sms',
      content: {
        en: {
          title: '📅 Booking Request Submitted',
          body: 'Hi {customerName}! Your {serviceName} appointment on {bookingDate} at {startTime} is pending confirmation. We\'ll notify you once {providerName} confirms.\n\nBooking ID: {bookingId}'
        },
        ar: {
          title: '📅 تم إرسال طلب الحجز',
          body: 'مرحباً {customerName}! موعدك لـ {serviceName} في {bookingDate} الساعة {startTime} في انتظار التأكيد. سنخبرك بمجرد تأكيد {providerName}.\n\nرقم الحجز: {bookingId}'
        }
      },
      variables: ['customerName', 'serviceName', 'bookingDate', 'startTime', 'providerName', 'bookingId']
    });

    this.addTemplate({
      id: 'booking_created_websocket',
      event: 'booking_created',
      channel: 'websocket',
      content: {
        en: {
          title: 'New Booking Request',
          body: 'You have a new {serviceName} booking request from {customerName} on {bookingDate} at {startTime}.',
          actionText: 'Review Booking'
        },
        ar: {
          title: 'طلب حجز جديد',
          body: 'لديك طلب حجز جديد لـ {serviceName} من {customerName} في {bookingDate} الساعة {startTime}.',
          actionText: 'مراجعة الحجز'
        }
      },
      variables: ['serviceName', 'customerName', 'bookingDate', 'startTime']
    });

    // Booking Confirmed Templates
    this.addTemplate({
      id: 'booking_confirmed_sms',
      event: 'booking_confirmed',
      channel: 'sms',
      content: {
        en: {
          title: '✅ Appointment Confirmed',
          body: 'Great news! Your {serviceName} appointment on {bookingDate} at {startTime} with {providerName} is confirmed.\n\n📍 Address: {providerAddress}\n📞 Phone: {providerPhone}\n\nTotal: {totalAmount}'
        },
        ar: {
          title: '✅ تم تأكيد الموعد',
          body: 'أخبار رائعة! تم تأكيد موعدك لـ {serviceName} في {bookingDate} الساعة {startTime} مع {providerName}.\n\n📍 العنوان: {providerAddress}\n📞 الهاتف: {providerPhone}\n\nالمجموع: {totalAmount}'
        }
      },
      variables: ['serviceName', 'bookingDate', 'startTime', 'providerName', 'providerAddress', 'providerPhone', 'totalAmount']
    });

    // Booking Cancelled Templates
    this.addTemplate({
      id: 'booking_cancelled_sms',
      event: 'booking_cancelled',
      channel: 'sms',
      content: {
        en: {
          title: '❌ Appointment Cancelled',
          body: 'Your {serviceName} appointment on {bookingDate} at {startTime} has been cancelled. {cancellationReason}\n\nIf you paid online, your refund will be processed within 3-5 business days.'
        },
        ar: {
          title: '❌ تم إلغاء الموعد',
          body: 'تم إلغاء موعدك لـ {serviceName} في {bookingDate} الساعة {startTime}. {cancellationReason}\n\nإذا دفعت عبر الإنترنت، سيتم معالجة المبلغ المسترد خلال 3-5 أيام عمل.'
        }
      },
      variables: ['serviceName', 'bookingDate', 'startTime', 'cancellationReason']
    });

    // Booking Rescheduled Templates
    this.addTemplate({
      id: 'booking_rescheduled_sms',
      event: 'booking_rescheduled',
      channel: 'sms',
      content: {
        en: {
          title: '📅 Appointment Rescheduled',
          body: 'Your {serviceName} appointment has been rescheduled to {newBookingDate} at {newStartTime} with {providerName}.\n\n📍 Address: {providerAddress}\n\nBooking ID: {bookingId}'
        },
        ar: {
          title: '📅 تم تغيير موعد الحجز',
          body: 'تم تغيير موعد حجزك لـ {serviceName} إلى {newBookingDate} الساعة {newStartTime} مع {providerName}.\n\n📍 العنوان: {providerAddress}\n\nرقم الحجز: {bookingId}'
        }
      },
      variables: ['serviceName', 'newBookingDate', 'newStartTime', 'providerName', 'providerAddress', 'bookingId']
    });

    // Booking Reminder Templates
    this.addTemplate({
      id: 'booking_reminder_sms',
      event: 'booking_reminder',
      channel: 'sms',
      content: {
        en: {
          title: '⏰ Appointment Reminder',
          body: 'Reminder: You have a {serviceName} appointment tomorrow at {startTime} with {providerName}.\n\n📍 {providerAddress}\n📞 {providerPhone}\n\nPlease arrive 10 minutes early.'
        },
        ar: {
          title: '⏰ تذكير بالموعد',
          body: 'تذكير: لديك موعد لـ {serviceName} غداً الساعة {startTime} مع {providerName}.\n\n📍 {providerAddress}\n📞 {providerPhone}\n\nيرجى الوصول قبل 10 دقائق.'
        }
      },
      variables: ['serviceName', 'startTime', 'providerName', 'providerAddress', 'providerPhone']
    });

    // Payment Processed Templates
    this.addTemplate({
      id: 'payment_processed_sms',
      event: 'payment_processed',
      channel: 'sms',
      content: {
        en: {
          title: '💳 Payment Confirmed',
          body: 'Payment of {paymentAmount} for your {serviceName} appointment on {bookingDate} has been processed successfully.\n\nTransaction ID: {transactionId}\nBooking ID: {bookingId}'
        },
        ar: {
          title: '💳 تم تأكيد الدفع',
          body: 'تمت معالجة دفعة {paymentAmount} لموعدك لـ {serviceName} في {bookingDate} بنجاح.\n\nرقم المعاملة: {transactionId}\nرقم الحجز: {bookingId}'
        }
      },
      variables: ['paymentAmount', 'serviceName', 'bookingDate', 'transactionId', 'bookingId']
    });

    // Review Request Templates
    this.addTemplate({
      id: 'review_request_sms',
      event: 'review_request',
      channel: 'sms',
      content: {
        en: {
          title: '⭐ How was your experience?',
          body: 'Hi {customerName}! How was your {serviceName} experience with {providerName}? We\'d love your feedback to help other customers.\n\nRate your experience: {reviewLink}'
        },
        ar: {
          title: '⭐ كيف كانت تجربتك؟',
          body: 'مرحباً {customerName}! كيف كانت تجربتك لـ {serviceName} مع {providerName}؟ نود رأيك لمساعدة العملاء الآخرين.\n\nقيّم تجربتك: {reviewLink}'
        }
      },
      variables: ['customerName', 'serviceName', 'providerName', 'reviewLink']
    });

    // Initialize template groups
    this.initializeTemplateGroups();
  }

  /**
   * Add template to the service
   */
  private addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Initialize template groups for organization
   */
  private initializeTemplateGroups(): void {
    this.templateGroups = [
      {
        id: 'booking_lifecycle',
        name: {
          en: 'Booking Lifecycle',
          ar: 'دورة حياة الحجز'
        },
        description: {
          en: 'Templates for booking creation, confirmation, cancellation, and rescheduling',
          ar: 'قوالب لإنشاء الحجز وتأكيده وإلغائه وإعادة جدولته'
        },
        templates: this.getTemplatesForEvents(['booking_created', 'booking_confirmed', 'booking_cancelled', 'booking_rescheduled']),
        variables: [
          {
            name: 'customerName',
            description: { en: 'Customer full name', ar: 'اسم العميل الكامل' },
            type: 'string',
            required: true
          },
          {
            name: 'serviceName',
            description: { en: 'Name of the booked service', ar: 'اسم الخدمة المحجوزة' },
            type: 'string',
            required: true
          },
          {
            name: 'bookingDate',
            description: { en: 'Date of the appointment', ar: 'تاريخ الموعد' },
            type: 'date',
            required: true
          },
          {
            name: 'startTime',
            description: { en: 'Start time of the appointment', ar: 'وقت بداية الموعد' },
            type: 'string',
            required: true
          },
          {
            name: 'providerName',
            description: { en: 'Name of the service provider', ar: 'اسم مقدم الخدمة' },
            type: 'string',
            required: true
          }
        ]
      },
      {
        id: 'payment_notifications',
        name: {
          en: 'Payment Notifications',
          ar: 'إشعارات الدفع'
        },
        description: {
          en: 'Templates for payment confirmations and payment-related updates',
          ar: 'قوالب لتأكيدات الدفع والتحديثات المتعلقة بالدفع'
        },
        templates: this.getTemplatesForEvents(['payment_processed', 'payment_failed']),
        variables: [
          {
            name: 'paymentAmount',
            description: { en: 'Amount paid', ar: 'المبلغ المدفوع' },
            type: 'currency',
            required: true
          },
          {
            name: 'transactionId',
            description: { en: 'Transaction reference ID', ar: 'رقم مرجع المعاملة' },
            type: 'string',
            required: true
          }
        ]
      },
      {
        id: 'reminders_reviews',
        name: {
          en: 'Reminders & Reviews',
          ar: 'التذكيرات والمراجعات'
        },
        description: {
          en: 'Templates for appointment reminders and review requests',
          ar: 'قوالب لتذكيرات المواعيد وطلبات المراجعة'
        },
        templates: this.getTemplatesForEvents(['booking_reminder', 'review_request']),
        variables: [
          {
            name: 'reviewLink',
            description: { en: 'Link to review page', ar: 'رابط صفحة المراجعة' },
            type: 'string',
            required: false
          }
        ]
      }
    ];
  }

  /**
   * Get templates for multiple events
   */
  private getTemplatesForEvents(events: NotificationEvent[]): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter(t => events.includes(t.event));
  }
}

export const notificationTemplatesService = NotificationTemplatesService.getInstance();