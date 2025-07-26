import { supabase } from './supabase';
import { Booking, BookingStatus, PaymentMethod, PaymentStatus } from '../types';
import { validateUUID, validateDate, validateTime, validateAmount, validateCoordinates, sanitizeString } from '../utils/validation';
import { flexibleValidateUUID } from '../utils/uuidValidator';

export interface CreateBookingData {
  user_id: string;
  provider_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface BookingWithDetails extends Booking {
  provider?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    profile_image_url?: string;
    address?: string;
    rating?: number;
  };
  service?: {
    id: string;
    name_en: string;
    name_ar: string;
    price: number;
    duration_minutes: number;
    description_en?: string;
    description_ar?: string;
  };
}

export class CustomerBookingService {
  /**
   * Create a new booking
   */
  async createBooking(bookingData: CreateBookingData): Promise<string> {
    try {
      // Validate all input data
      const validatedUserId = flexibleValidateUUID(bookingData.user_id, 'userId');
      const validatedProviderId = flexibleValidateUUID(bookingData.provider_id, 'providerId');
      const validatedServiceId = flexibleValidateUUID(bookingData.service_id, 'serviceId');
      const validatedDate = validateDate(bookingData.booking_date, 'bookingDate');
      const validatedStartTime = validateTime(bookingData.start_time);
      const validatedEndTime = validateTime(bookingData.end_time);
      const validatedAmount = validateAmount(bookingData.total_amount, 'totalAmount');
      
      // Validate optional fields
      const validatedNotes = bookingData.notes ? sanitizeString(bookingData.notes, 'notes') : undefined;
      const validatedAddress = bookingData.address ? sanitizeString(bookingData.address, 'address') : undefined;
      
      let customerLocation = null;
      if (bookingData.location) {
        const coords = validateCoordinates(bookingData.location.latitude, bookingData.location.longitude);
        customerLocation = `POINT(${coords.longitude} ${coords.latitude})`;
      }
      
      // Use atomic booking creation function to prevent race conditions
      const { data, error } = await supabase.rpc('create_booking_atomic', {
        p_user_id: validatedUserId,
        p_provider_id: validatedProviderId,
        p_service_id: validatedServiceId,
        p_booking_date: validatedDate.split('T')[0],
        p_start_time: validatedStartTime,
        p_end_time: validatedEndTime,
        p_total_amount: validatedAmount,
        p_payment_method: bookingData.payment_method,
        p_notes: validatedNotes,
        p_customer_address: validatedAddress,
        p_customer_location: customerLocation
      });

      if (error) {
        // Handle specific error cases
        if (error.message?.includes('Time slot conflict')) {
          throw new Error('Time slot is no longer available');
        }
        throw error;
      }

      // TODO: Send notification to provider
      // TODO: If online payment, initiate payment process

      return data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  /**
   * Get customer bookings
   */
  async getCustomerBookings(
    userId: string,
    status?: BookingStatus
  ): Promise<BookingWithDetails[]> {
    try {
      // Validate user ID
      const validatedUserId = flexibleValidateUUID(userId, 'userId');
      
      let query = supabase
        .from('bookings')
        .select(`
          *,
          provider:providers(
            id,
            name,
            phone,
            email,
            profile_image_url,
            address,
            rating
          ),
          service:services(
            id,
            name_en,
            name_ar,
            price,
            duration_minutes,
            description_en,
            description_ar
          )
        `)
        .eq('user_id', validatedUserId)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customer bookings:', error);
      throw error;
    }
  }

  /**
   * Get booking details
   */
  async getBookingDetails(bookingId: string): Promise<BookingWithDetails | null> {
    try {
      // Validate booking ID
      const validatedBookingId = validateUUID(bookingId, 'bookingId');
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          provider:providers(
            id,
            name,
            phone,
            email,
            profile_image_url,
            address,
            rating,
            location
          ),
          service:services(
            id,
            name_en,
            name_ar,
            price,
            duration_minutes,
            description_en,
            description_ar,
            category:categories(
              name_en,
              name_ar
            )
          )
        `)
        .eq('id', validatedBookingId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return null;
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    try {
      // Validate booking ID
      const validatedBookingId = validateUUID(bookingId, 'bookingId');
      const validatedReason = reason ? sanitizeString(reason, 'cancellationReason') : undefined;
      
      // Use atomic status update function
      const { data, error } = await supabase.rpc('update_booking_status_atomic', {
        p_booking_id: validatedBookingId,
        p_new_status: BookingStatus.CANCELLED,
        p_cancelled_by: 'customer',
        p_cancellation_reason: validatedReason
      });

      if (error) {
        if (error.message?.includes('Cannot modify completed bookings')) {
          throw new Error('Cannot cancel a completed booking');
        }
        throw error;
      }

      // TODO: Send notification to provider
      // TODO: Process refund if payment was made
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  /**
   * Update payment status after successful payment
   */
  async updatePaymentStatus(
    bookingId: string, 
    paymentId: string,
    status: PaymentStatus
  ): Promise<void> {
    try {
      // Validate IDs
      const validatedBookingId = validateUUID(bookingId, 'bookingId');
      const validatedPaymentId = sanitizeString(paymentId, 'paymentId');
      
      const updates: any = {
        payment_status: status,
        updated_at: new Date().toISOString()
      };

      if (status === PaymentStatus.COMPLETED) {
        updates.payment_id = validatedPaymentId;
        updates.paid_at = new Date().toISOString();
        updates.status = BookingStatus.CONFIRMED;
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', validatedBookingId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Check if a time slot is available
   */
  /**
   * Check slot availability using atomic database function
   */
  async checkSlotAvailability(
    providerId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<boolean> {
    try {
      // Use atomic availability check
      const { data, error } = await supabase.rpc('check_slot_availability_atomic', {
        p_provider_id: providerId,
        p_booking_date: date,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_booking_id: excludeBookingId || null
      });

      if (error) throw error;
      return data ?? false;
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return false;
    }
  }

  /**
   * Calculate platform fee based on Lamsa's fee structure
   */
  private calculatePlatformFee(amount: number): number {
    if (amount <= 25) {
      return 2; // 2 JOD for services ≤25 JOD
    } else {
      return 5; // 5 JOD for services >25 JOD
    }
  }

  /**
   * Get upcoming bookings
   */
  async getUpcomingBookings(userId: string): Promise<BookingWithDetails[]> {
    try {
      // Validate user ID
      const validatedUserId = flexibleValidateUUID(userId, 'userId');
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          provider:providers(
            id,
            name,
            phone,
            profile_image_url,
            rating
          ),
          service:services(
            id,
            name_en,
            name_ar,
            duration_minutes
          )
        `)
        .eq('user_id', validatedUserId)
        .in('status', [BookingStatus.CONFIRMED, BookingStatus.PENDING])
        .gte('booking_date', today)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
      return [];
    }
  }

  /**
   * Rate a completed booking
   */
  async rateBooking(
    bookingId: string,
    rating: number,
    review?: string
  ): Promise<void> {
    try {
      // Validate inputs
      const validatedBookingId = validateUUID(bookingId, 'bookingId');
      
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        throw new Error('Rating must be an integer between 1 and 5');
      }
      
      const validatedReview = review ? sanitizeString(review, 'review') : undefined;
      
      // First, get the booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('provider_id, service_id, user_id')
        .eq('id', validatedBookingId)
        .single();

      if (bookingError) throw bookingError;

      // Create the review
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          booking_id: validatedBookingId,
          provider_id: booking.provider_id,
          service_id: booking.service_id,
          user_id: booking.user_id,
          rating,
          comment: validatedReview,
          created_at: new Date().toISOString()
        });

      if (reviewError) throw reviewError;

      // Update booking to mark as reviewed
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          is_reviewed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedBookingId);

      if (updateError) throw updateError;

      // TODO: Update provider's average rating
    } catch (error) {
      console.error('Error rating booking:', error);
      throw error;
    }
  }

  /**
   * Create recurring bookings atomically
   */
  async createRecurringBookings(bookingData: CreateRecurringBookingData): Promise<string[]> {
    try {
      // Validate all input data
      const validatedUserId = flexibleValidateUUID(bookingData.user_id, 'userId');
      const validatedProviderId = flexibleValidateUUID(bookingData.provider_id, 'providerId');
      const validatedServiceId = flexibleValidateUUID(bookingData.service_id, 'serviceId');
      const validatedStartDate = validateDate(bookingData.start_date, 'startDate');
      const validatedEndDate = validateDate(bookingData.end_date, 'endDate');
      const validatedStartTime = validateTime(bookingData.start_time);
      const validatedEndTime = validateTime(bookingData.end_time);
      const validatedAmount = validateAmount(bookingData.total_amount, 'totalAmount');
      const validatedNotes = bookingData.notes ? sanitizeString(bookingData.notes, 'notes') : undefined;
      
      // Validate days of week
      if (!Array.isArray(bookingData.days_of_week) || bookingData.days_of_week.length === 0) {
        throw new Error('At least one day of week must be selected');
      }
      
      bookingData.days_of_week.forEach(day => {
        if (!Number.isInteger(day) || day < 0 || day > 6) {
          throw new Error('Days of week must be integers between 0 (Sunday) and 6 (Saturday)');
        }
      });
      
      // Check date range
      const startDate = new Date(validatedStartDate);
      const endDate = new Date(validatedEndDate);
      
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }
      
      if ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) > 365) {
        throw new Error('Recurring bookings cannot span more than 1 year');
      }
      
      // Use atomic recurring booking creation function
      const { data, error } = await supabase.rpc('create_recurring_bookings_atomic', {
        p_user_id: validatedUserId,
        p_provider_id: validatedProviderId,
        p_service_id: validatedServiceId,
        p_start_date: validatedStartDate.split('T')[0],
        p_end_date: validatedEndDate.split('T')[0],
        p_day_of_week: bookingData.days_of_week,
        p_start_time: validatedStartTime,
        p_end_time: validatedEndTime,
        p_total_amount: validatedAmount,
        p_payment_method: bookingData.payment_method,
        p_notes: validatedNotes
      });

      if (error) {
        if (error.message?.includes('No bookings could be created')) {
          throw new Error('No available time slots found for the selected schedule');
        }
        throw error;
      }

      // TODO: Send notifications to provider for all created bookings
      // TODO: If online payment, initiate payment process for all bookings

      return data || [];
    } catch (error) {
      console.error('Error creating recurring bookings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const customerBookingService = new CustomerBookingService();