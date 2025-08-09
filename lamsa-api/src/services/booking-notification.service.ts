/**
 * Booking Notification Service
 * Handles notification triggers and scheduling for booking events
 */

import { supabase } from '../config/supabase';
import { notificationQueueService } from './notification-queue.service';
import { NotificationData, NotificationRecipient } from './notification.service';
import { secureLogger } from '../utils/secure-logger';
import { format, parseISO } from 'date-fns';
import { BookingStatus } from '../types/database';
import { BookingError } from '../types/booking-errors';

export interface BookingReminder {
  id: string;
  userId: string;
  providerId: string;
  serviceId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  userName: string;
  userPhone: string;
  providerName: string;
  serviceName: string;
  hoursUntilBooking: number;
  reminderSent: boolean;
}

export interface ReminderFilters {
  userId?: string;
  providerId?: string;
  days: number;
  hours: number;
  includeConfirmed: boolean;
  includePending: boolean;
  limit: number;
}

/**
 * Type for booking with joined user/provider/service data
 * Used when fetching bookings with foreign key relationships
 */
interface BookingWithRelations {
  id: string;
  user_id: string;
  provider_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  users?: {
    name: string;
    phone: string;
    language?: string;
  };
  providers?: {
    business_name_en: string;
    business_name_ar: string;
    phone?: string;
  };
  services?: {
    name_en: string;
    name_ar: string;
  };
}

export class BookingNotificationService {
  /**
   * Send booking notifications to relevant parties
   */
  async sendBookingNotifications(booking: any, event: string, initiatorUserId: string): Promise<void> {
    try {
      // Determine notification event type
      let notificationEvent: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'booking_rescheduled';
      
      switch (event) {
        case 'created':
          notificationEvent = 'booking_created';
          break;
        case 'status_updated':
          if (booking.status === 'confirmed') {
            notificationEvent = 'booking_confirmed';
          } else if (booking.status === 'cancelled') {
            notificationEvent = 'booking_cancelled';
          } else {
            return; // No notification for other status changes
          }
          break;
        case 'rescheduled':
          notificationEvent = 'booking_rescheduled';
          break;
        default:
          return;
      }

      // Prepare notification data
      const notificationData = {
        bookingId: booking.id,
        customerName: booking.users?.name || 'Customer',
        serviceName: booking.services?.name_en || booking.services?.name_ar || 'Service',
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        providerName: booking.providers?.business_name_en || booking.providers?.business_name_ar || 'Provider',
        totalAmount: booking.amount,
        status: booking.status
      };

      // Create notifications for customer and provider
      const notifications: Promise<void>[] = [];

      // Notify customer (unless they initiated the action)
      if (initiatorUserId !== booking.user_id) {
        const customerNotification = this.createCustomerNotification(
          booking,
          notificationEvent,
          notificationData
        );
        if (customerNotification) {
          notifications.push(
            notificationQueueService.enqueue(customerNotification, 'high').then(() => {})
          );
        }
      }

      // Notify provider (unless they initiated the action)
      if (initiatorUserId !== booking.provider_id) {
        const providerNotification = this.createProviderNotification(
          booking,
          notificationEvent,
          notificationData
        );
        if (providerNotification) {
          notifications.push(
            notificationQueueService.enqueue(providerNotification, 'high').then(() => {})
          );
        }
      }

      // Send all notifications
      await Promise.allSettled(notifications);

      secureLogger.info(`Notifications queued for booking ${booking.id}, event: ${event}`);

    } catch (error) {
      secureLogger.error('Failed to send booking notifications', error);
      // Don't throw error to avoid breaking the main booking flow
    }
  }

  /**
   * Create customer notification
   */
  private createCustomerNotification(
    booking: any,
    event: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'booking_rescheduled',
    data: Record<string, any>
  ): NotificationData | null {
    try {
      const recipient: NotificationRecipient = {
        id: booking.user_id,
        type: 'customer',
        phone: booking.users?.phone,
        language: booking.users?.language || 'ar', // Default to Arabic
        preferences: {
          sms: true,
          push: true,
          websocket: true,
          email: false,
          eventPreferences: {
            bookingCreated: true,
            bookingConfirmed: true,
            bookingCancelled: true,
            bookingRescheduled: true,
            reminders: true,
            payments: true,
            marketing: false
          }
        }
      };

      return {
        event,
        recipient,
        data,
        priority: event === 'booking_cancelled' ? 'urgent' : 'high',
        channels: ['sms', 'websocket', 'push']
      };
    } catch (error) {
      secureLogger.error('Failed to create customer notification', error);
      return null;
    }
  }

  /**
   * Create provider notification
   */
  private createProviderNotification(
    booking: any,
    event: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'booking_rescheduled',
    data: Record<string, any>
  ): NotificationData | null {
    try {
      // Only send certain events to providers
      if (!['booking_created', 'booking_cancelled', 'booking_rescheduled'].includes(event)) {
        return null;
      }

      const recipient: NotificationRecipient = {
        id: booking.provider_id,
        type: 'provider',
        phone: booking.providers?.phone,
        language: 'ar', // Default to Arabic for Jordan market
        preferences: {
          sms: true,
          push: true,
          websocket: true,
          email: false,
          eventPreferences: {
            bookingCreated: true,
            bookingConfirmed: true,
            bookingCancelled: true,
            bookingRescheduled: true,
            reminders: true,
            payments: true,
            marketing: false
          }
        }
      };

      return {
        event,
        recipient,
        data,
        priority: event === 'booking_created' ? 'urgent' : 'high',
        channels: ['websocket', 'push', 'sms'] // Prioritize real-time for providers
      };
    } catch (error) {
      secureLogger.error('Failed to create provider notification', error);
      return null;
    }
  }

  /**
   * Get upcoming booking reminders
   */
  async getBookingReminders(filters: ReminderFilters): Promise<BookingReminder[]> {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + (filters.hours * 60 * 60 * 1000));
      const futureDate = new Date(now.getTime() + (filters.days * 24 * 60 * 60 * 1000));

      let query = supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          provider_id,
          service_id,
          booking_date,
          start_time,
          end_time,
          status,
          users:user_id(name, phone),
          providers:provider_id(business_name_en, business_name_ar),
          services:service_id(name_en, name_ar)
        `)
        .gte('booking_date', format(now, 'yyyy-MM-dd'))
        .lte('booking_date', format(futureDate, 'yyyy-MM-dd'))
        .limit(filters.limit)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Apply role-based filtering
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.providerId) {
        query = query.eq('provider_id', filters.providerId);
      }

      // Apply status filtering
      const statusFilters = [];
      if (filters.includeConfirmed) statusFilters.push('confirmed');
      if (filters.includePending) statusFilters.push('pending');
      
      if (statusFilters.length > 0) {
        query = query.in('status', statusFilters);
      }

      const { data: bookings, error } = await query;

      if (error) {
        throw new BookingError('Failed to fetch booking reminders', 500);
      }

      // Type assertion for joined query results
      const typedBookings = bookings as unknown as BookingWithRelations[];

      // Calculate hours until booking and format response
      const reminders: BookingReminder[] = (typedBookings || []).map(booking => {
        const bookingDateTime = parseISO(`${booking.booking_date}T${booking.start_time}`);
        const hoursUntilBooking = Math.floor((bookingDateTime.getTime() - now.getTime()) / (60 * 60 * 1000));

        return {
          id: booking.id,
          userId: booking.user_id,
          providerId: booking.provider_id,
          serviceId: booking.service_id,
          bookingDate: booking.booking_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          status: booking.status as BookingStatus,
          userName: booking.users?.name || '',
          userPhone: booking.users?.phone || '',
          providerName: booking.providers?.business_name_en || booking.providers?.business_name_ar || '',
          serviceName: booking.services?.name_en || booking.services?.name_ar || '',
          hoursUntilBooking,
          reminderSent: false // TODO: Implement reminder tracking
        };
      });

      // Filter by hours if specified
      return reminders.filter(reminder => 
        reminder.hoursUntilBooking <= filters.hours && reminder.hoursUntilBooking > 0
      );

    } catch (error) {
      throw new BookingError('Failed to fetch booking reminders', 500);
    }
  }

  /**
   * Send reminder notifications for upcoming bookings
   */
  async sendBookingReminders(reminders: BookingReminder[]): Promise<{
    sent: number;
    failed: number;
    errors: Array<{ bookingId: string; error: string }>;
  }> {
    let sent = 0;
    let failed = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    const notifications = reminders.map(async (reminder) => {
      try {
        const notificationData = {
          bookingId: reminder.id,
          customerName: reminder.userName,
          serviceName: reminder.serviceName,
          bookingDate: reminder.bookingDate,
          startTime: reminder.startTime,
          providerName: reminder.providerName,
          hoursUntilBooking: reminder.hoursUntilBooking
        };

        // Create customer reminder notification
        const customerNotification: NotificationData = {
          event: 'booking_reminder',
          recipient: {
            id: reminder.userId,
            type: 'customer',
            phone: reminder.userPhone,
            language: 'ar',
            preferences: {
              sms: true,
              push: true,
              websocket: false,
              email: false,
              eventPreferences: {
                reminders: true,
                bookingCreated: true,
                bookingConfirmed: true,
                bookingCancelled: true,
                bookingRescheduled: true,
                payments: true,
                marketing: false
              }
            }
          },
          data: notificationData,
          priority: 'normal',
          channels: ['sms', 'push']
        };

        await notificationQueueService.enqueue(customerNotification, 'normal');
        sent++;

      } catch (error) {
        failed++;
        errors.push({
          bookingId: reminder.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        secureLogger.error(`Failed to send reminder for booking ${reminder.id}`, error);
      }
    });

    await Promise.allSettled(notifications);

    secureLogger.info(`Booking reminders sent: ${sent} successful, ${failed} failed`);

    return { sent, failed, errors };
  }

  /**
   * Handle booking completion notifications
   */
  async handleBookingCompletion(booking: any): Promise<void> {
    try {
      // Send completion confirmation to customer
      const customerNotification: NotificationData = {
        event: 'booking_confirmed',
        recipient: {
          id: booking.user_id,
          type: 'customer',
          phone: booking.users?.phone,
          language: booking.users?.language || 'ar',
          preferences: {
            sms: true,
            push: true,
            websocket: true,
            email: false,
            eventPreferences: {
              bookingCreated: true,
              bookingConfirmed: true,
              bookingCancelled: true,
              bookingRescheduled: true,
              reminders: true,
              payments: true,
              marketing: false
            }
          }
        },
        data: {
          bookingId: booking.id,
          serviceName: booking.services?.name_en || booking.services?.name_ar || 'Service',
          providerName: booking.providers?.business_name_en || booking.providers?.business_name_ar || 'Provider',
          bookingDate: booking.booking_date,
          totalAmount: booking.amount
        },
        priority: 'normal',
        channels: ['push', 'websocket']
      };

      await notificationQueueService.enqueue(customerNotification, 'normal');

      secureLogger.info(`Completion notification sent for booking ${booking.id}`);

    } catch (error) {
      secureLogger.error('Failed to send booking completion notification', error);
    }
  }

  /**
   * Handle booking cancellation notifications
   */
  async handleBookingCancellation(booking: any, reason?: string): Promise<void> {
    try {
      const notificationData = {
        bookingId: booking.id,
        serviceName: booking.services?.name_en || booking.services?.name_ar || 'Service',
        providerName: booking.providers?.business_name_en || booking.providers?.business_name_ar || 'Provider',
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        reason: reason || 'No reason provided'
      };

      // Notify customer
      const customerNotification: NotificationData = {
        event: 'booking_cancelled',
        recipient: {
          id: booking.user_id,
          type: 'customer',
          phone: booking.users?.phone,
          language: booking.users?.language || 'ar',
          preferences: {
            sms: true,
            push: true,
            websocket: true,
            email: false,
            eventPreferences: {
              bookingCreated: true,
              bookingConfirmed: true,
              bookingCancelled: true,
              bookingRescheduled: true,
              reminders: true,
              payments: true,
              marketing: false
            }
          }
        },
        data: notificationData,
        priority: 'urgent',
        channels: ['sms', 'push', 'websocket']
      };

      await notificationQueueService.enqueue(customerNotification, 'urgent');

      secureLogger.info(`Cancellation notification sent for booking ${booking.id}`);

    } catch (error) {
      secureLogger.error('Failed to send booking cancellation notification', error);
    }
  }
}

export const bookingNotificationService = new BookingNotificationService();