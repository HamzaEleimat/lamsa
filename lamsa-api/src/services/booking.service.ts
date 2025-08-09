/**
 * Booking Service - Main Entry Point
 * Comprehensive booking management with business logic, validation, and transaction handling
 * 
 * This service has been refactored into smaller, focused modules:
 * - booking-crud.service.ts - Basic CRUD operations
 * - booking-validation.service.ts - Validation logic and business rules
 * - booking-notification.service.ts - Notification triggers and scheduling
 * - booking-analytics.service.ts - Analytics, reporting, and dashboard methods
 */

import { supabase } from '../config/supabase';
import { 
  BookingCrudService, 
  bookingCrudService,
  CreateBookingData,
  UpdateBookingStatusData,
  RescheduleBookingData,
  BookingFilters,
  BookingWithDetails
} from './booking-crud.service';
import { 
  BookingValidationService, 
  bookingValidationService,
  AvailabilityCheckData,
  AvailabilityResult
} from './booking-validation.service';
import { 
  BookingNotificationService, 
  bookingNotificationService,
  BookingReminder,
  ReminderFilters
} from './booking-notification.service';
import { 
  BookingAnalyticsService, 
  bookingAnalyticsService,
  AnalyticsFilters,
  CustomerDashboardData,
  ProviderDashboardData,
  AdminDashboardData
} from './booking-analytics.service';
import { secureLogger } from '../utils/secure-logger';
import {
  BookingError,
  BookingNotFoundError,
  validateStatusTransition
} from '../types/booking-errors';
import { BookingStatus } from '../types/database';

// Re-export all interfaces for backward compatibility
export {
  CreateBookingData,
  UpdateBookingStatusData,
  RescheduleBookingData,
  BookingFilters,
  BookingWithDetails,
  AvailabilityCheckData,
  AvailabilityResult,
  BookingReminder,
  ReminderFilters,
  AnalyticsFilters
};

/**
 * Interface for bulk operation data
 * Used for bulk cancel/confirm operations
 */
export interface BulkOperationData {
  bookingIds: string[];
  operation: 'cancel' | 'confirm';
  reason?: string;
}

/**
 * Interface for bulk reschedule data
 */
export interface BulkRescheduleData {
  bookingIds: string[];
  newDate: string;
  newStartTime: string;
  newEndTime: string;
}

/**
 * Result of bulk operations
 */
export interface BulkOperationResult {
  successful: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

/**
 * Main Booking Service class
 * Coordinates between the specialized services and provides high-level booking operations
 */
export class BookingService {
  private crudService: BookingCrudService;
  private validationService: BookingValidationService;
  private notificationService: BookingNotificationService;
  private analyticsService: BookingAnalyticsService;

  constructor() {
    this.crudService = bookingCrudService;
    this.validationService = bookingValidationService;
    this.notificationService = bookingNotificationService;
    this.analyticsService = bookingAnalyticsService;
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
      const service = await this.validationService.validateService(data.serviceId);
      
      // 2. Validate provider exists and is verified
      const provider = await this.validationService.validateProvider(data.providerId);
      
      // 3. Validate user exists
      const user = await this.validationService.validateUser(data.userId);
      
      // 4. Calculate end time if not provided
      const endTime = data.endTime || this.crudService.calculateEndTime(data.startTime, service.duration_minutes);
      
      // 5. Validate booking time is in the future
      this.validationService.validateBookingTime(data.bookingDate, data.startTime);
      
      // 6. Check availability
      await this.validationService.validateAvailability(data.providerId, data.serviceId, data.bookingDate, data.startTime, endTime);
      
      // 7. Create booking record
      const booking = await this.crudService.createBookingRecord({
        userId: data.userId,
        providerId: data.providerId,
        serviceId: data.serviceId,
        bookingDate: data.bookingDate,
        startTime: data.startTime,
        endTime: endTime,
        servicePrice: service.price,
        paymentMethod: data.paymentMethod,
        notes: data.notes
      });

      // 8. Send notifications (async)
      await this.notificationService.sendBookingNotifications(booking, 'created', data.userId);

      // Commit transaction
      await supabase.rpc('commit_transaction');

      return this.crudService.formatBookingWithDetails(booking);

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
      throw new BookingError(`Invalid status transition from ${currentBooking.status} to ${data.newStatus}`, 400);
    }

    // Validate permissions
    this.validationService.validateStatusUpdatePermissions(currentBooking, data.userId, data.userRole, data.newStatus);

    // Check if booking is in the past for certain operations
    if (['confirmed', 'completed'].includes(data.newStatus)) {
      this.validationService.validateBookingNotPastDue(currentBooking);
    }

    // Start transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) {
      throw new BookingError('Failed to start transaction', 500);
    }

    try {
      // Update booking status
      const updatedBooking = await this.crudService.updateBookingStatusRecord(
        data.bookingId, 
        currentBooking, 
        data.newStatus, 
        data.userId, 
        data.userRole, 
        data.reason
      );

      // Handle specific status changes
      if (data.newStatus === 'completed') {
        await this.notificationService.handleBookingCompletion(updatedBooking);
      } else if (data.newStatus === 'cancelled') {
        await this.notificationService.handleBookingCancellation(updatedBooking, data.reason);
      }

      // Send notifications
      await this.notificationService.sendBookingNotifications(updatedBooking, 'status_updated', data.userId);

      await supabase.rpc('commit_transaction');

      return this.crudService.formatBookingWithDetails(updatedBooking);

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
    this.validationService.validateReschedulePermissions(currentBooking, data.userId, data.userRole);

    // Validate new time is in future
    this.validationService.validateBookingTime(data.newDate, data.newStartTime);

    // Get service details for duration
    const service = await this.validationService.validateService(currentBooking.serviceId);
    const newEndTime = this.crudService.calculateEndTime(data.newStartTime, service.duration_minutes);

    // Check availability for new time
    await this.validationService.validateAvailability(
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
      const updatedBooking = await this.crudService.rescheduleBookingRecord(
        data.bookingId,
        currentBooking,
        data.newDate,
        data.newStartTime,
        newEndTime,
        data.userId,
        data.userRole,
        data.reason
      );

      // Send notifications
      await this.notificationService.sendBookingNotifications(updatedBooking, 'rescheduled', data.userId);

      await supabase.rpc('commit_transaction');

      return this.crudService.formatBookingWithDetails(updatedBooking);

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
    return await this.crudService.getBookings(filters);
  }

  /**
   * Get a single booking by ID
   */
  async getBookingById(bookingId: string): Promise<BookingWithDetails | null> {
    return await this.crudService.getBookingById(bookingId);
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
    return await this.crudService.getBookingHistory(bookingId, filters);
  }

  /**
   * Check availability for a specific time slot
   */
  async checkAvailability(data: AvailabilityCheckData): Promise<AvailabilityResult> {
    return await this.validationService.checkAvailability(data);
  }

  /**
   * Get upcoming booking reminders
   */
  async getBookingReminders(filters: ReminderFilters): Promise<BookingReminder[]> {
    return await this.notificationService.getBookingReminders(filters);
  }

  /**
   * Get customer dashboard data
   */
  async getCustomerDashboard(userId: string, period: string): Promise<CustomerDashboardData> {
    return await this.analyticsService.getCustomerDashboard(userId, period);
  }

  /**
   * Get provider dashboard data
   */
  async getProviderDashboard(providerId: string, period: string): Promise<ProviderDashboardData> {
    return await this.analyticsService.getProviderDashboard(providerId, period);
  }

  /**
   * Get admin dashboard data
   */
  async getAdminDashboard(period: string): Promise<AdminDashboardData> {
    return await this.analyticsService.getAdminDashboard(period);
  }

  /**
   * Bulk cancel bookings
   */
  async bulkCancelBookings(data: BulkOperationData): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful: [],
      failed: [],
      totalProcessed: data.bookingIds.length,
      successCount: 0,
      failureCount: 0
    };

    // Get all bookings to validate permissions
    const bookings = await Promise.all(
      data.bookingIds.map(id => this.getBookingById(id))
    );

    const validBookings = bookings.filter((booking): booking is BookingWithDetails => booking !== null);

    for (const booking of validBookings) {
      try {
        await this.updateBookingStatus({
          bookingId: booking.id,
          newStatus: 'cancelled',
          userId: '', // Should be passed from controller
          userRole: 'admin', // Should be passed from controller
          reason: data.reason
        });

        result.successful.push(booking.id);
        result.successCount++;
      } catch (error) {
        result.failed.push({
          id: booking.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.failureCount++;
      }
    }

    return result;
  }

  /**
   * Bulk confirm bookings
   */
  async bulkConfirmBookings(data: BulkOperationData): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful: [],
      failed: [],
      totalProcessed: data.bookingIds.length,
      successCount: 0,
      failureCount: 0
    };

    // Get all bookings to validate permissions
    const bookings = await Promise.all(
      data.bookingIds.map(id => this.getBookingById(id))
    );

    const validBookings = bookings.filter((booking): booking is BookingWithDetails => booking !== null);

    for (const booking of validBookings) {
      try {
        await this.updateBookingStatus({
          bookingId: booking.id,
          newStatus: 'confirmed',
          userId: '', // Should be passed from controller
          userRole: 'provider', // Should be passed from controller
          reason: data.reason
        });

        result.successful.push(booking.id);
        result.successCount++;
      } catch (error) {
        result.failed.push({
          id: booking.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.failureCount++;
      }
    }

    return result;
  }
}

export const bookingService = new BookingService();