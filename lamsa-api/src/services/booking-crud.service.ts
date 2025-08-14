/**
 * Booking CRUD Service
 * Handles basic create, read, update, delete operations for bookings
 */

import { supabase } from '../config/supabase';
import { FeeCalculationService } from './fee-calculation.service';
import { bookingAuditService } from './booking-audit.service';
import { format, addMinutes } from 'date-fns';
import { secureLogger } from '../utils/secure-logger';
import {
  BookingError,
  BookingNotFoundError,
  BookingErrorFactory
} from '../types/booking-errors';
import { BookingStatus, PaymentMethod } from '../types/database';

export interface CreateBookingData {
  userId: string;
  providerId: string;
  serviceId: string;
  bookingDate: Date;
  startTime: string;
  endTime?: string;
  paymentMethod?: PaymentMethod;
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

export class BookingCrudService {
  /**
   * Create a new booking record in the database
   */
  async createBookingRecord(data: {
    userId: string;
    providerId: string;
    serviceId: string;
    bookingDate: Date;
    startTime: string;
    endTime: string;
    servicePrice: number;
    paymentMethod?: PaymentMethod;
  }): Promise<any> {
    // Calculate fees
    const feeCalculation = FeeCalculationService.getCompleteCalculation(data.servicePrice);

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: data.userId,
        provider_id: data.providerId,
        service_id: data.serviceId,
        booking_date: format(data.bookingDate, 'yyyy-MM-dd'),
        start_time: data.startTime,
        end_time: data.endTime,
        status: 'pending' as BookingStatus,
        payment_method: data.paymentMethod,
        service_amount: feeCalculation.serviceAmount,
        total_amount: feeCalculation.serviceAmount + feeCalculation.platformFee,
        platform_fee: feeCalculation.platformFee,
        provider_fee: feeCalculation.providerEarnings
      })
      .select(`
        *,
        users:user_id(name, phone),
        providers:provider_id(business_name_en, business_name_ar),
        services:service_id(name_en, name_ar, duration_minutes)
      `)
      .single();

    if (bookingError) {
      console.error('📋 Database booking error:', {
        error: bookingError,
        code: bookingError.code,
        message: bookingError.message,
        details: bookingError.details,
        hint: bookingError.hint,
        insertData: {
          user_id: data.userId,
          provider_id: data.providerId,
          service_id: data.serviceId,
          booking_date: format(data.bookingDate, 'yyyy-MM-dd'),
          start_time: data.startTime,
          end_time: data.endTime,
          status: 'pending',
          payment_method: data.paymentMethod,
          service_amount: feeCalculation.serviceAmount,
          total_amount: feeCalculation.serviceAmount + feeCalculation.platformFee,
          platform_fee: feeCalculation.platformFee,
          provider_fee: feeCalculation.providerEarnings
        }
      });
      
      if (bookingError.code === '23505') { // Unique constraint violation
        throw new BookingError('Time slot is already booked', 409);
      }
      throw new BookingError('Failed to create booking', 500);
    }

    // Create audit trail entry
    await bookingAuditService.trackBookingCreated(booking.id, data.userId, {
      providerId: data.providerId,
      serviceId: data.serviceId,
      bookingDate: data.bookingDate,
      startTime: data.startTime,
      amount: feeCalculation.serviceAmount,
      feeCalculation
    });

    return booking;
  }

  /**
   * Update booking status in database
   */
  async updateBookingStatusRecord(
    bookingId: string,
    currentBooking: BookingWithDetails,
    newStatus: BookingStatus,
    userId: string,
    userRole: string,
    reason?: string
  ): Promise<any> {
    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: newStatus
      })
      .eq('id', bookingId)
      .select(`
        *,
        users:user_id(name, phone),
        providers:provider_id(business_name_en, business_name_ar),
        services:service_id(name_en, name_ar, duration_minutes)
      `)
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new BookingError(`Failed to update booking status: ${updateError.message}`, 500);
    }

    // Create audit trail entry
    await bookingAuditService.trackStatusChange(
      bookingId,
      userId,
      userRole as 'provider' | 'customer' | 'admin',
      currentBooking.status,
      newStatus,
      reason
    );

    return updatedBooking;
  }

  /**
   * Update booking date and time
   */
  async rescheduleBookingRecord(
    bookingId: string,
    currentBooking: BookingWithDetails,
    newDate: Date,
    newStartTime: string,
    newEndTime: string,
    userId: string,
    userRole: string,
    reason?: string
  ): Promise<any> {
    // Update booking with new date/time
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_date: format(newDate, 'yyyy-MM-dd'),
        start_time: newStartTime,
        end_time: newEndTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select(`
        *,
        users:user_id(name, phone),
        providers:provider_id(business_name_en, business_name_ar),
        services:service_id(name_en, name_ar, duration_minutes)
      `)
      .single();

    if (updateError) {
      throw new BookingError('Failed to reschedule booking', 500);
    }

    // Create audit trail entry
    await bookingAuditService.trackReschedule(
      bookingId,
      userId,
      userRole as 'provider' | 'customer' | 'admin',
      {
        previousDate: currentBooking.bookingDate,
        previousTime: currentBooking.startTime,
        newDate: format(newDate, 'yyyy-MM-dd'),
        newTime: newStartTime,
        reason: reason
      }
    );

    return updatedBooking;
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
   * Format raw booking data with details
   */
  formatBookingWithDetails(booking: any): BookingWithDetails {
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
   * Calculate end time based on start time and duration
   */
  calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, durationMinutes);
    return format(endDate, 'HH:mm');
  }
}

export const bookingCrudService = new BookingCrudService();