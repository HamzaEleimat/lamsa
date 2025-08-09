/**
 * Booking Validation Service
 * Handles all validation logic and business rules for bookings
 */

import { supabase } from '../config/supabase';
import { AvailabilityService } from './availability.service';
import { format, isBefore, parseISO, isAfter } from 'date-fns';
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
  isFinalStatus
} from '../types/booking-errors';
import { BookingStatus } from '../types/database';
import { BookingWithDetails } from './booking-crud.service';

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

export class BookingValidationService {
  private availabilityService: AvailabilityService;

  constructor() {
    this.availabilityService = AvailabilityService.getInstance();
  }

  /**
   * Validate that service exists and is active
   */
  async validateService(serviceId: string) {
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

  /**
   * Validate that provider exists and is verified
   */
  async validateProvider(providerId: string) {
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

  /**
   * Validate that user exists
   */
  async validateUser(userId: string) {
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

  /**
   * Validate booking time is in the future
   */
  validateBookingTime(bookingDate: Date, startTime: string): void {
    const [hours, minutes] = startTime.split(':').map(Number);
    const bookingDateTime = new Date(bookingDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    if (isBefore(bookingDateTime, new Date())) {
      throw new InvalidTimeSlotError('Cannot book appointments in the past');
    }
  }

  /**
   * Validate availability for booking time slot
   */
  async validateAvailability(
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

  /**
   * Validate status update permissions
   */
  validateStatusUpdatePermissions(
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

  /**
   * Validate reschedule permissions
   */
  validateReschedulePermissions(
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

  /**
   * Validate booking is not past due for certain operations
   */
  validateBookingNotPastDue(booking: BookingWithDetails): void {
    const bookingDateTime = parseISO(`${booking.bookingDate}T${booking.startTime}`);
    if (isBefore(bookingDateTime, new Date())) {
      throw new BookingPastDueError();
    }
  }

  /**
   * Validate status transition is allowed
   */
  validateStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): boolean {
    return validateStatusTransition(currentStatus, newStatus);
  }

  /**
   * Check availability for a specific time slot with detailed results
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

      // Type assertion for conflicts with user data
      const typedConflicts = conflicts as unknown as Array<{
        id: string;
        start_time: string;
        end_time: string;
        users?: { name: string };
      }>;

      if (typedConflicts && typedConflicts.length > 0) {
        return {
          available: false,
          message: 'Time slot conflicts with existing bookings',
          conflictingBookings: typedConflicts.map(conflict => ({
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
   * Calculate end time based on start time and duration
   */
  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return format(endDate, 'HH:mm');
  }

  /**
   * Validate bulk operation permissions
   */
  validateBulkOperationPermissions(
    bookings: BookingWithDetails[],
    userId: string,
    userRole: string,
    operation: 'cancel' | 'confirm'
  ): void {
    if (userRole === 'admin') {
      return; // Admins can do anything
    }

    bookings.forEach(booking => {
      if (userRole === 'customer') {
        if (booking.userId !== userId) {
          throw new InsufficientPermissionError(`No permission to ${operation} booking ${booking.id}`);
        }
        if (operation === 'confirm') {
          throw new InsufficientPermissionError('Customers cannot confirm bookings');
        }
      } else if (userRole === 'provider') {
        if (booking.providerId !== userId) {
          throw new InsufficientPermissionError(`No permission to ${operation} booking ${booking.id}`);
        }
      }

      // Validate status transitions
      const newStatus = operation === 'cancel' ? 'cancelled' : 'confirmed';
      if (!this.validateStatusTransition(booking.status, newStatus as BookingStatus)) {
        throw new InvalidBookingStatusError(
          `Cannot transition booking ${booking.id} from ${booking.status} to ${newStatus}`
        );
      }
    });
  }
}

export const bookingValidationService = new BookingValidationService();