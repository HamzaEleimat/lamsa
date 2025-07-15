/**
 * Booking Service
 * Comprehensive booking management with business logic, validation, and transaction handling
 */

import { supabase } from '../config/supabase-simple';
import { FeeCalculationService } from './fee-calculation.service';
import { AvailabilityService } from './availability.service';
import { bookingAuditService } from './booking-audit.service';
import { notificationQueueService } from './notification-queue.service';
import { NotificationData, NotificationRecipient } from './notification.service';
import { 
  BookingError,
  BookingConflictError,
  BookingNotFoundError,
  InvalidBookingStatusError,
  InvalidTimeSlotError,
  ProviderNotAvailableError,
  ServiceNotActiveError,
  BookingPastDueError,
  InsufficientPermissionError,
  validateStatusTransition,
  isFinalStatus,
  BookingErrorFactory
} from '../types/booking-errors';
import { BookingStatus, PaymentMethod } from '../types/database';
import { AppError } from '../middleware/error.middleware';
import { addMinutes, isAfter, isBefore, parseISO, format } from 'date-fns';

export interface CreateBookingData {
  userId: string;
  providerId: string;
  serviceId: string;
  bookingDate: Date;
  startTime: string;
  endTime?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface UpdateBookingStatusData {
  bookingId: string;
  newStatus: BookingStatus;
  userId: string;
  userRole: 'customer' | 'provider' | 'admin';
  reason?: string;
}

export interface RescheduleBookingData {
  bookingId: string;
  newDate: Date;
  newStartTime: string;
  userId: string;
  userRole: 'customer' | 'provider' | 'admin';
  reason?: string;
}

export interface BookingFilters {
  userId?: string;
  providerId?: string;
  status?: BookingStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface BookingWithDetails {
  id: string;
  userId: string;
  providerId: string;
  serviceId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  paymentMethod?: PaymentMethod;
  amount: number;
  platformFee: number;
  providerFee: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  userName: string;
  userPhone: string;
  providerName: string;
  serviceName: string;
  serviceDuration: number;
}

export interface AnalyticsFilters {
  period: string;
  startDate?: Date;
  endDate?: Date;
  providerId?: string;
  groupBy?: string;
  includeProviderBreakdown?: boolean;
}

export interface AvailabilityCheckData {
  providerId: string;
  serviceId: string;
  date: Date;
  time: string;
  duration?: number;
  excludeBookingId?: string;
}

export interface AvailabilityResult {
  available: boolean;
  conflictingBookings?: Array<{
    id: string;
    startTime: string;
    endTime: string;
    customerName: string;
  }>;
  suggestedTimes?: Array<{
    startTime: string;
    endTime: string;
    available: boolean;
  }>;
  message: string;
}

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

export class BookingService {
  private availabilityService: AvailabilityService;

  constructor() {
    this.availabilityService = AvailabilityService.getInstance();
  }

  /**
   * Create a new booking with full validation and transaction handling
   */
  async createBooking(data: CreateBookingData): Promise<BookingWithDetails> {
    // Start transaction
    const { data: transactionResult, error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) {
      throw new BookingError('Failed to start transaction', 500);
    }

    try {
      // 1. Validate service exists and is active
      const service = await this.validateService(data.serviceId);
      
      // 2. Validate provider exists and is verified
      const provider = await this.validateProvider(data.providerId);
      
      // 3. Validate user exists
      const user = await this.validateUser(data.userId);
      
      // 4. Calculate end time if not provided
      const endTime = data.endTime || this.calculateEndTime(data.startTime, service.duration_minutes);
      
      // 5. Validate booking time is in the future
      this.validateBookingTime(data.bookingDate, data.startTime);
      
      // 6. Check availability
      await this.validateAvailability(data.providerId, data.serviceId, data.bookingDate, data.startTime, endTime);
      
      // 7. Calculate fees
      const feeCalculation = FeeCalculationService.getCompleteCalculation(service.price);
      
      // 8. Create booking record
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: data.userId,
          provider_id: data.providerId,
          service_id: data.serviceId,
          booking_date: format(data.bookingDate, 'yyyy-MM-dd'),
          start_time: data.startTime,
          end_time: endTime,
          status: 'pending' as BookingStatus,
          payment_method: data.paymentMethod,
          amount: feeCalculation.serviceAmount,
          platform_fee: feeCalculation.platformFee,
          provider_fee: feeCalculation.providerEarnings,
          notes: data.notes
        })
        .select(`
          *,
          users:user_id(name, phone),
          providers:provider_id(business_name_en, business_name_ar),
          services:service_id(name_en, name_ar, duration_minutes)
        `)
        .single();

      if (bookingError) {
        await supabase.rpc('rollback_transaction');
        
        if (bookingError.code === '23505') { // Unique constraint violation
          throw new BookingConflictError('Time slot is already booked');
        }
        throw new BookingError('Failed to create booking', 500);
      }

      // 9. Create audit trail entry
      await bookingAuditService.trackBookingCreated(booking.id, data.userId, {
        providerId: data.providerId,
        serviceId: data.serviceId,
        bookingDate: data.bookingDate,
        startTime: data.startTime,
        amount: feeCalculation.serviceAmount,
        feeCalculation
      });

      // 10. Send notifications (async)
      await this.sendBookingNotifications(booking, 'created', data.userId);

      // Commit transaction
      await supabase.rpc('commit_transaction');

      return this.formatBookingWithDetails(booking);

    } catch (error) {
      // Rollback transaction
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  /**
   * Update booking status with validation
   */
  async updateBookingStatus(data: UpdateBookingStatusData): Promise<BookingWithDetails> {
    // Get current booking
    const currentBooking = await this.getBookingById(data.bookingId);
    if (!currentBooking) {
      throw new BookingNotFoundError();
    }

    // Validate status transition
    if (!validateStatusTransition(currentBooking.status, data.newStatus)) {
      throw BookingErrorFactory.createInvalidStatusTransitionError(currentBooking.status, data.newStatus);
    }

    // Validate permissions
    this.validateStatusUpdatePermissions(currentBooking, data.userId, data.userRole, data.newStatus);

    // Check if booking is in the past for certain operations
    if (['confirmed', 'completed'].includes(data.newStatus)) {
      this.validateBookingNotPastDue(currentBooking);
    }

    // Start transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) {
      throw new BookingError('Failed to start transaction', 500);
    }

    try {
      // Update booking status
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: data.newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.bookingId)
        .select(`
          *,
          users:user_id(name, phone),
          providers:provider_id(business_name_en, business_name_ar),
          services:service_id(name_en, name_ar, duration_minutes)
        `)
        .single();

      if (updateError) {
        await supabase.rpc('rollback_transaction');
        throw new BookingError('Failed to update booking status', 500);
      }

      // Create audit trail entry
      await bookingAuditService.trackStatusChange(
        data.bookingId,
        data.userId,
        data.userRole,
        currentBooking.status,
        data.newStatus,
        data.reason
      );

      // Handle specific status changes
      if (data.newStatus === 'completed') {
        await this.handleBookingCompletion(updatedBooking);
      } else if (data.newStatus === 'cancelled') {
        await this.handleBookingCancellation(updatedBooking, data.reason);
      }

      // Send notifications
      await this.sendBookingNotifications(updatedBooking, 'status_updated', data.userId);

      await supabase.rpc('commit_transaction');

      return this.formatBookingWithDetails(updatedBooking);

    } catch (error) {
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, userId: string, userRole: string, reason?: string): Promise<void> {
    await this.updateBookingStatus({
      bookingId,
      newStatus: 'cancelled',
      userId,
      userRole: userRole as any,
      reason
    });
  }

  /**
   * Reschedule a booking
   */
  async rescheduleBooking(data: RescheduleBookingData): Promise<BookingWithDetails> {
    // Get current booking
    const currentBooking = await this.getBookingById(data.bookingId);
    if (!currentBooking) {
      throw new BookingNotFoundError();
    }

    // Validate permissions
    this.validateReschedulePermissions(currentBooking, data.userId, data.userRole);

    // Validate new time is in future
    this.validateBookingTime(data.newDate, data.newStartTime);

    // Get service details for duration
    const service = await this.validateService(currentBooking.serviceId);
    const newEndTime = this.calculateEndTime(data.newStartTime, service.duration_minutes);

    // Check availability for new time
    await this.validateAvailability(
      currentBooking.providerId,
      currentBooking.serviceId,
      data.newDate,
      data.newStartTime,
      newEndTime,
      data.bookingId // Exclude current booking from conflict check
    );

    // Start transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) {
      throw new BookingError('Failed to start transaction', 500);
    }

    try {
      // Update booking with new date/time
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({
          booking_date: format(data.newDate, 'yyyy-MM-dd'),
          start_time: data.newStartTime,
          end_time: newEndTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.bookingId)
        .select(`
          *,
          users:user_id(name, phone),
          providers:provider_id(business_name_en, business_name_ar),
          services:service_id(name_en, name_ar, duration_minutes)
        `)
        .single();

      if (updateError) {
        await supabase.rpc('rollback_transaction');
        throw new BookingError('Failed to reschedule booking', 500);
      }

      // Create audit trail entry
      await bookingAuditService.trackReschedule(
        data.bookingId,
        data.userId,
        data.userRole,
        {
          previousDate: currentBooking.bookingDate,
          previousTime: currentBooking.startTime,
          newDate: format(data.newDate, 'yyyy-MM-dd'),
          newTime: data.newStartTime,
          reason: data.reason
        }
      );

      // Send notifications
      await this.sendBookingNotifications(updatedBooking, 'rescheduled', data.userId);

      await supabase.rpc('commit_transaction');

      return this.formatBookingWithDetails(updatedBooking);

    } catch (error) {
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  /**
   * Get bookings with filters and pagination
   */
  async getBookings(filters: BookingFilters): Promise<{
    bookings: BookingWithDetails[];
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        users:user_id(name, phone),
        providers:provider_id(business_name_en, business_name_ar),
        services:service_id(name_en, name_ar, duration_minutes)
      `, { count: 'exact' });

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.providerId) {
      query = query.eq('provider_id', filters.providerId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.dateFrom) {
      query = query.gte('booking_date', format(filters.dateFrom, 'yyyy-MM-dd'));
    }
    if (filters.dateTo) {
      query = query.lte('booking_date', format(filters.dateTo, 'yyyy-MM-dd'));
    }

    // Apply pagination and ordering
    query = query
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: bookings, error, count } = await query;

    if (error) {
      throw new BookingError('Failed to fetch bookings', 500);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      bookings: bookings?.map(booking => this.formatBookingWithDetails(booking)) || [],
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * Get a single booking by ID
   */
  async getBookingById(bookingId: string): Promise<BookingWithDetails | null> {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        users:user_id(name, phone),
        providers:provider_id(business_name_en, business_name_ar),
        services:service_id(name_en, name_ar, duration_minutes)
      `)
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new BookingError('Failed to fetch booking', 500);
    }

    return this.formatBookingWithDetails(booking);
  }

  // Private helper methods

  private async validateService(serviceId: string) {
    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .eq('active', true)
      .single();

    if (error || !service) {
      throw new ServiceNotActiveError();
    }

    return service;
  }

  private async validateProvider(providerId: string) {
    const { data: provider, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .eq('verified', true)
      .single();

    if (error || !provider) {
      throw new ProviderNotAvailableError('Provider not found or not verified');
    }

    return provider;
  }

  private async validateUser(userId: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new BookingError('User not found', 404);
    }

    return user;
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, durationMinutes);
    return format(endDate, 'HH:mm');
  }

  private validateBookingTime(bookingDate: Date, startTime: string): void {
    const [hours, minutes] = startTime.split(':').map(Number);
    const bookingDateTime = new Date(bookingDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    if (isBefore(bookingDateTime, new Date())) {
      throw new InvalidTimeSlotError('Cannot book appointments in the past');
    }
  }

  private async validateAvailability(
    providerId: string,
    serviceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<void> {
    // Check with availability service
    const availableSlots = await this.availabilityService.getAvailableSlots(providerId, date, serviceId);
    
    const isSlotAvailable = availableSlots.some(slot => 
      slot.start <= startTime && slot.end >= endTime && slot.available
    );

    if (!isSlotAvailable) {
      throw new ProviderNotAvailableError();
    }

    // Check for booking conflicts
    let conflictQuery = supabase
      .from('bookings')
      .select('id')
      .eq('provider_id', providerId)
      .eq('booking_date', format(date, 'yyyy-MM-dd'))
      .not('status', 'in', '(cancelled,no_show)')
      .or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime}),and(start_time.gte.${startTime},end_time.lte.${endTime})`);

    if (excludeBookingId) {
      conflictQuery = conflictQuery.neq('id', excludeBookingId);
    }

    const { data: conflicts } = await conflictQuery;

    if (conflicts && conflicts.length > 0) {
      throw new BookingConflictError();
    }
  }

  private validateStatusUpdatePermissions(
    booking: BookingWithDetails,
    userId: string,
    userRole: string,
    newStatus: BookingStatus
  ): void {
    if (userRole === 'admin') {
      return; // Admins can do anything
    }

    if (userRole === 'customer') {
      // Customers can only cancel their own bookings
      if (booking.userId !== userId) {
        throw new InsufficientPermissionError();
      }
      if (newStatus !== 'cancelled') {
        throw new InsufficientPermissionError('Customers can only cancel bookings');
      }
    } else if (userRole === 'provider') {
      // Providers can confirm, complete, cancel, or mark as no-show
      if (booking.providerId !== userId) {
        throw new InsufficientPermissionError();
      }
      if (!['confirmed', 'completed', 'cancelled', 'no_show'].includes(newStatus)) {
        throw new InsufficientPermissionError();
      }
    }
  }

  private validateReschedulePermissions(
    booking: BookingWithDetails,
    userId: string,
    userRole: string
  ): void {
    if (userRole === 'admin') {
      return;
    }

    if (userRole === 'customer' && booking.userId !== userId) {
      throw new InsufficientPermissionError();
    }

    if (userRole === 'provider' && booking.providerId !== userId) {
      throw new InsufficientPermissionError();
    }

    if (isFinalStatus(booking.status)) {
      throw new InvalidBookingStatusError('Cannot reschedule completed or cancelled bookings');
    }
  }

  private validateBookingNotPastDue(booking: BookingWithDetails): void {
    const bookingDateTime = parseISO(`${booking.bookingDate}T${booking.startTime}`);
    if (isBefore(bookingDateTime, new Date())) {
      throw new BookingPastDueError();
    }
  }

  private async handleBookingCompletion(booking: any): Promise<void> {
    // Could trigger settlement calculations, review requests, etc.
    // Implementation depends on business requirements
  }

  private async handleBookingCancellation(booking: any, reason?: string): Promise<void> {
    // Could trigger refund processing, availability updates, etc.
    // Implementation depends on business requirements
  }

  /**
   * Get booking history using audit service
   */
  async getBookingHistory(
    bookingId: string,
    filters: { page?: number; limit?: number } = {}
  ): Promise<{
    entries: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return await bookingAuditService.getBookingAuditHistory(bookingId, filters);
  }

  /**
   * Send booking notifications to relevant parties
   */
  private async sendBookingNotifications(booking: any, event: string, initiatorUserId: string): Promise<void> {
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
          notifications.push(notificationQueueService.enqueue(customerNotification, 'high'));
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
          notifications.push(notificationQueueService.enqueue(providerNotification, 'high'));
        }
      }

      // Send all notifications
      await Promise.allSettled(notifications);

      console.log(`Notifications queued for booking ${booking.id}, event: ${event}`);

    } catch (error) {
      console.error('Failed to send booking notifications:', error);
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
      console.error('Failed to create customer notification:', error);
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
      console.error('Failed to create provider notification:', error);
      return null;
    }
  }

  private formatBookingWithDetails(booking: any): BookingWithDetails {
    return {
      id: booking.id,
      userId: booking.user_id,
      providerId: booking.provider_id,
      serviceId: booking.service_id,
      bookingDate: booking.booking_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: booking.status,
      paymentMethod: booking.payment_method,
      amount: Number(booking.amount),
      platformFee: Number(booking.platform_fee),
      providerFee: Number(booking.provider_fee),
      notes: booking.notes,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      userName: booking.users?.name || '',
      userPhone: booking.users?.phone || '',
      providerName: booking.providers?.business_name_en || booking.providers?.business_name_ar || '',
      serviceName: booking.services?.name_en || booking.services?.name_ar || '',
      serviceDuration: booking.services?.duration_minutes || 0
    };
  }

  /**
   * Check availability for a specific time slot
   */
  async checkAvailability(data: AvailabilityCheckData): Promise<AvailabilityResult> {
    try {
      // Get service details for duration
      const service = await this.validateService(data.serviceId);
      const duration = data.duration || service.duration_minutes;
      const endTime = this.calculateEndTime(data.time, duration);

      // Check basic availability with availability service
      const availableSlots = await this.availabilityService.getAvailableSlots(
        data.providerId,
        data.date,
        data.serviceId
      );

      const isSlotAvailable = availableSlots.some(slot => 
        slot.start <= data.time && slot.end >= endTime && slot.available
      );

      if (!isSlotAvailable) {
        return {
          available: false,
          message: 'Provider is not available at this time',
          suggestedTimes: availableSlots
            .filter(slot => slot.available)
            .slice(0, 5)
            .map(slot => ({
              startTime: slot.start,
              endTime: slot.end,
              available: true
            }))
        };
      }

      // Check for booking conflicts
      let conflictQuery = supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          users:user_id(name)
        `)
        .eq('provider_id', data.providerId)
        .eq('booking_date', format(data.date, 'yyyy-MM-dd'))
        .not('status', 'in', '(cancelled,no_show)')
        .or(`and(start_time.lte.${data.time},end_time.gt.${data.time}),and(start_time.lt.${endTime},end_time.gte.${endTime}),and(start_time.gte.${data.time},end_time.lte.${endTime})`);

      if (data.excludeBookingId) {
        conflictQuery = conflictQuery.neq('id', data.excludeBookingId);
      }

      const { data: conflicts } = await conflictQuery;

      if (conflicts && conflicts.length > 0) {
        return {
          available: false,
          message: 'Time slot conflicts with existing bookings',
          conflictingBookings: conflicts.map(conflict => ({
            id: conflict.id,
            startTime: conflict.start_time,
            endTime: conflict.end_time,
            customerName: conflict.users?.name || 'Unknown'
          })),
          suggestedTimes: availableSlots
            .filter(slot => slot.available)
            .slice(0, 3)
            .map(slot => ({
              startTime: slot.start,
              endTime: slot.end,
              available: true
            }))
        };
      }

      return {
        available: true,
        message: 'Time slot is available'
      };

    } catch (error) {
      throw new BookingError('Failed to check availability', 500);
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

      // Calculate hours until booking and format response
      const reminders: BookingReminder[] = (bookings || []).map(booking => {
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
          status: booking.status,
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
   * Get customer dashboard data
   */
  async getCustomerDashboard(userId: string, period: string): Promise<any> {
    try {
      // TODO: Implement customer dashboard logic
      return {
        summary: {
          totalBookings: 0,
          upcomingBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0
        },
        upcomingBookings: [],
        recentBookings: [],
        favoriteProviders: [],
        bookingHistory: {
          thisMonth: 0,
          lastMonth: 0,
          trend: 'stable'
        }
      };
    } catch (error) {
      throw new BookingError('Failed to fetch customer dashboard', 500);
    }
  }

  /**
   * Get provider dashboard data
   */
  async getProviderDashboard(providerId: string, period: string): Promise<any> {
    try {
      // TODO: Implement provider dashboard logic
      return {
        summary: {
          totalBookings: 0,
          pendingBookings: 0,
          confirmedBookings: 0,
          completedBookings: 0,
          revenue: 0
        },
        todayBookings: [],
        upcomingBookings: [],
        recentCustomers: [],
        performance: {
          conversionRate: 0,
          averageRating: 0,
          repeatCustomers: 0
        }
      };
    } catch (error) {
      throw new BookingError('Failed to fetch provider dashboard', 500);
    }
  }

  /**
   * Get admin dashboard data
   */
  async getAdminDashboard(period: string): Promise<any> {
    try {
      // TODO: Implement admin dashboard logic
      return {
        summary: {
          totalBookings: 0,
          totalRevenue: 0,
          activeProviders: 0,
          activeCustomers: 0,
          platformFees: 0
        },
        recentBookings: [],
        topProviders: [],
        topServices: [],
        systemHealth: {
          bookingSuccess: 0,
          averageResponse: 0,
          errorRate: 0
        }
      };
    } catch (error) {
      throw new BookingError('Failed to fetch admin dashboard', 500);
    }
  }
}

export const bookingService = new BookingService();

// Export enhanced types for use in controllers
export type {
  BulkOperationData,
  BulkRescheduleData,
  BulkOperationResult,
  AnalyticsFilters,
  AvailabilityCheckData,
  AvailabilityResult,
  BookingReminder,
  ReminderFilters
};