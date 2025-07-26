import { supabase } from './supabase';
import { Booking, BookingStatus } from '../types';
import { validateUUID, validateDate, validateTime, sanitizeString, validateJordanianPhone } from '../utils/validation';

export interface ProviderBooking extends Booking {
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  service?: {
    id: string;
    name_en: string;
    name_ar: string;
    price: number;
    duration_minutes: number;
  };
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  todayBookings: number;
  weekBookings: number;
  monthRevenue: number;
}

export class ProviderBookingService {
  /**
   * Get all bookings for a provider
   */
  async getProviderBookings(
    providerId: string,
    filters?: {
      status?: BookingStatus;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ): Promise<ProviderBooking[]> {
    try {
      // Validate provider ID - skip validation if it's not a UUID format
      let validatedProviderId = providerId;
      try {
        validatedProviderId = validateUUID(providerId, 'providerId');
      } catch (error) {
        // If not a valid UUID, use as-is (could be a user ID)
        console.warn('Provider ID is not a valid UUID, using as-is:', providerId);
      }
      
      // Validate filters if provided
      if (filters?.startDate) {
        validateDate(filters.startDate, 'startDate');
      }
      if (filters?.endDate) {
        validateDate(filters.endDate, 'endDate');
      }
      if (filters?.search) {
        sanitizeString(filters.search, 'search');
      }
      
      let query = supabase
        .from('bookings')
        .select(`
          *,
          customer:users!bookings_user_id_fkey(
            id,
            name,
            phone,
            email
          ),
          service:services(
            id,
            name_en,
            name_ar,
            price,
            duration_minutes
          )
        `)
        .eq('provider_id', validatedProviderId)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.startDate) {
        query = query.gte('booking_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('booking_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply client-side search filter if needed
      let bookings = data || [];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        bookings = bookings.filter(booking => 
          booking.customer?.name?.toLowerCase().includes(searchLower) ||
          booking.customer?.phone?.includes(filters.search) ||
          booking.service?.name_en?.toLowerCase().includes(searchLower) ||
          booking.service?.name_ar?.includes(searchLower)
        );
      }

      // Transform snake_case to camelCase for frontend compatibility
      return bookings.map(booking => ({
        ...booking,
        id: booking.id,
        userId: booking.user_id,
        providerId: booking.provider_id,
        serviceId: booking.service_id,
        date: booking.booking_date,
        time: booking.start_time || booking.booking_time,
        status: booking.status,
        paymentMethod: booking.payment_method,
        totalAmount: booking.total_amount,
        customer: booking.customer,
        service: booking.service
      }));
    } catch (error) {
      console.error('Error fetching provider bookings:', error);
      throw error;
    }
  }

  /**
   * Get booking statistics for provider dashboard
   */
  async getBookingStats(providerId: string): Promise<BookingStats> {
    try {
      // Validate provider ID - skip validation if it's not a UUID format
      let validatedProviderId = providerId;
      try {
        validatedProviderId = validateUUID(providerId, 'providerId');
      } catch (error) {
        // If not a valid UUID, use as-is (could be a user ID)
        console.warn('Provider ID is not a valid UUID, using as-is:', providerId);
      }
      
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get all bookings for stats
      const { data: allBookings, error: allError } = await supabase
        .from('bookings')
        .select('status, booking_date, total_amount')
        .eq('provider_id', validatedProviderId);

      if (allError) throw allError;

      // Get today's bookings
      const { count: todayCount, error: todayError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', validatedProviderId)
        .eq('booking_date', today);

      if (todayError) throw todayError;

      // Get week's bookings
      const { count: weekCount, error: weekError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', validatedProviderId)
        .gte('booking_date', weekAgo);

      if (weekError) throw weekError;

      // Calculate stats
      const stats: BookingStats = {
        total: allBookings?.length || 0,
        pending: allBookings?.filter(b => b.status === BookingStatus.PENDING).length || 0,
        confirmed: allBookings?.filter(b => b.status === BookingStatus.CONFIRMED).length || 0,
        completed: allBookings?.filter(b => b.status === BookingStatus.COMPLETED).length || 0,
        cancelled: allBookings?.filter(b => b.status === BookingStatus.CANCELLED).length || 0,
        todayBookings: todayCount || 0,
        weekBookings: weekCount || 0,
        monthRevenue: allBookings
          ?.filter(b => b.booking_date >= monthAgo && b.status === BookingStatus.COMPLETED)
          ?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0
      };

      return stats;
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      throw error;
    }
  }

  /**
   * Get today's upcoming bookings for a provider
   */
  async getTodayUpcomingBookings(providerId: string): Promise<any[]> {
    try {
      // Validate provider ID - skip validation if it's not a UUID format
      let validatedProviderId = providerId;
      try {
        validatedProviderId = validateUUID(providerId, 'providerId');
      } catch (error) {
        // If not a valid UUID, use as-is (could be a user ID)
        console.warn('Provider ID is not a valid UUID, using as-is:', providerId);
      }
      
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().slice(0, 5);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_amount,
          users!inner (
            id,
            name,
            phone
          ),
          services!inner (
            id,
            name_en,
            name_ar,
            duration_minutes
          )
        `)
        .eq('provider_id', validatedProviderId)
        .eq('booking_date', today)
        .gte('start_time', currentTime)
        .in('status', [BookingStatus.CONFIRMED, BookingStatus.PENDING])
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Transform the data to match the expected format
      const upcomingBookings = (data || []).map(booking => ({
        id: booking.id,
        time: booking.start_time,
        customerName: booking.users?.name || 'Unknown',
        customerPhone: booking.users?.phone,
        serviceName: booking.services?.name_en || booking.services?.name_ar || 'Service',
        price: booking.total_amount,
        status: booking.status,
        duration: booking.services?.duration_minutes
      }));

      return upcomingBookings;
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
      return [];
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string,
    newStatus: BookingStatus,
    cancellationReason?: string
  ): Promise<void> {
    try {
      // Validate booking ID
      const validatedBookingId = validateUUID(bookingId, 'bookingId');
      const validatedReason = cancellationReason ? sanitizeString(cancellationReason, 'cancellationReason') : undefined;
      
      // Use atomic status update function
      const { data, error } = await supabase.rpc('update_booking_status_atomic', {
        p_booking_id: validatedBookingId,
        p_new_status: newStatus,
        p_cancelled_by: newStatus === BookingStatus.CANCELLED ? 'provider' : null,
        p_cancellation_reason: validatedReason
      });

      if (error) {
        if (error.message?.includes('Cannot modify completed bookings')) {
          throw new Error('Cannot modify a completed booking');
        }
        if (error.message?.includes('Cannot reactivate cancelled bookings')) {
          throw new Error('Cannot reactivate a cancelled booking');
        }
        throw error;
      }

      // TODO: Send notification to customer about status change
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  /**
   * Get upcoming bookings for today
   */
  async getTodayBookings(providerId: string): Promise<ProviderBooking[]> {
    try {
      // Validate provider ID - skip validation if it's not a UUID format
      let validatedProviderId = providerId;
      try {
        validatedProviderId = validateUUID(providerId, 'providerId');
      } catch (error) {
        // If not a valid UUID, use as-is (could be a user ID)
        console.warn('Provider ID is not a valid UUID, using as-is:', providerId);
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:users!bookings_user_id_fkey(
            id,
            name,
            phone,
            email
          ),
          service:services(
            id,
            name_en,
            name_ar,
            price,
            duration_minutes
          )
        `)
        .eq('provider_id', validatedProviderId)
        .eq('booking_date', today)
        .in('status', [BookingStatus.CONFIRMED, BookingStatus.PENDING])
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching today bookings:', error);
      throw error;
    }
  }

  /**
   * Check if a time slot is available
   */
  async isTimeSlotAvailable(
    providerId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<boolean> {
    try {
      // Validate inputs
      const validatedProviderId = validateUUID(providerId, 'providerId');
      const validatedDate = validateDate(date, 'date');
      const validatedStartTime = validateTime(startTime);
      const validatedEndTime = validateTime(endTime);
      
      let validatedExcludeId = null;
      if (excludeBookingId) {
        validatedExcludeId = validateUUID(excludeBookingId, 'excludeBookingId');
      }
      
      // Use atomic availability check
      const { data, error } = await supabase.rpc('check_slot_availability_atomic', {
        p_provider_id: validatedProviderId,
        p_booking_date: validatedDate.split('T')[0],
        p_start_time: validatedStartTime,
        p_end_time: validatedEndTime,
        p_exclude_booking_id: validatedExcludeId
      });

      if (error) throw error;
      return data ?? false;
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      return false;
    }
  }

  /**
   * Create a manual booking (walk-in customer)
   */
  async createManualBooking(bookingData: {
    providerId: string;
    serviceId: string;
    customerName: string;
    customerPhone: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }): Promise<string> {
    try {
      // Validate all inputs
      const validatedProviderId = validateUUID(bookingData.providerId, 'providerId');
      const validatedServiceId = validateUUID(bookingData.serviceId, 'serviceId');
      const validatedCustomerName = sanitizeString(bookingData.customerName, 'customerName');
      const validatedDate = validateDate(bookingData.date, 'date');
      const validatedStartTime = validateTime(bookingData.startTime);
      const validatedEndTime = validateTime(bookingData.endTime);
      const validatedNotes = bookingData.notes ? sanitizeString(bookingData.notes, 'notes') : undefined;
      
      // Validate and format phone number
      if (!validateJordanianPhone(bookingData.customerPhone)) {
        throw new Error('Invalid Jordanian phone number');
      }
      const cleanPhone = bookingData.customerPhone.replace(/\s+/g, '').replace(/[^\d]/g, '');
      
      // First, check or create customer
      let customerId: string;
      
      const { data: existingCustomer } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create a new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('users')
          .insert({
            phone: cleanPhone,
            name: validatedCustomerName,
            role: 'CUSTOMER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Get service details for price
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('price')
        .eq('id', validatedServiceId)
        .single();

      if (serviceError) throw serviceError;

      // Use atomic booking creation for manual bookings
      const { data: bookingId, error: bookingError } = await supabase.rpc('create_booking_atomic', {
        p_user_id: customerId,
        p_provider_id: validatedProviderId,
        p_service_id: validatedServiceId,
        p_booking_date: validatedDate.split('T')[0],
        p_start_time: validatedStartTime,
        p_end_time: validatedEndTime,
        p_total_amount: service.price,
        p_payment_method: 'ON_SITE',
        p_notes: validatedNotes ? `[Manual Booking] ${validatedNotes}` : '[Manual Booking]',
        p_customer_address: null,
        p_customer_location: null
      });

      if (bookingError) {
        if (bookingError.message?.includes('Time slot conflict')) {
          throw new Error('Time slot is not available');
        }
        throw bookingError;
      }
      
      // After creation, update the booking to confirmed status
      await this.updateBookingStatus(bookingId, BookingStatus.CONFIRMED);
      
      return bookingId;
    } catch (error) {
      console.error('Error creating manual booking:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const providerBookingService = new ProviderBookingService();