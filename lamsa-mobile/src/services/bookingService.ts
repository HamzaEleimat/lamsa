import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import mockDataService from './mock/mockDataService';
import { Booking } from './mock/mockBookings';

export interface CreateBookingParams {
  provider_id: string;
  service_id: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  total_amount: number;
  notes?: string;
  payment_method: 'cash' | 'card' | 'mobile';
}

export interface BookingResponse {
  booking: Booking;
  message: string;
}

export interface BookingsListResponse {
  bookings: Booking[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

class BookingService {
  private static instance: BookingService;
  
  private constructor() {}
  
  static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  /**
   * Create a new booking
   */
  async createBooking(params: CreateBookingParams): Promise<BookingResponse> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to create booking');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating booking:', error);
      console.log('Using mock response');
      
      // Create a mock booking response
      const newBooking: Booking = {
        id: `b${Date.now()}`,
        user_id: 'user1',
        provider_id: params.provider_id,
        service_id: params.service_id,
        provider_name: 'Mock Provider',
        provider_name_ar: 'مزود وهمي',
        service_name: 'Mock Service',
        service_name_ar: 'خدمة وهمية',
        booking_date: params.booking_date,
        booking_time: params.booking_time,
        duration_minutes: params.duration_minutes,
        status: 'pending',
        total_amount: params.total_amount,
        platform_fee: params.total_amount > 25 ? 5 : 2,
        provider_amount: params.total_amount - (params.total_amount > 25 ? 5 : 2),
        payment_status: 'pending',
        payment_method: params.payment_method,
        notes: params.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      return await mockDataService.withDelay({
        booking: newBooking,
        message: 'Booking created successfully'
      });
    }
  }

  /**
   * Get user bookings
   */
  async getUserBookings(
    status?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<BookingsListResponse> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const response = await fetch(
        `${API_URL}/api/bookings?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      console.log('Using mock data as fallback');
      
      // Use mock data as fallback
      const mockBookings = await mockDataService.withDelay(
        mockDataService.getUserBookings('user1', status)
      );
      
      // Paginate bookings
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBookings = mockBookings.slice(startIndex, endIndex);
      
      return {
        bookings: paginatedBookings,
        totalCount: mockBookings.length,
        page,
        totalPages: Math.ceil(mockBookings.length / limit),
        hasMore: endIndex < mockBookings.length
      };
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string): Promise<Booking> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch booking');
      }

      const data = await response.json();
      return data.booking;
    } catch (error) {
      console.error('Error fetching booking:', error);
      console.log('Using mock data as fallback');
      
      // Find in mock data
      const allBookings = mockDataService.getUserBookings('user1');
      const booking = allBookings.find(b => b.id === bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      return await mockDataService.withDelay(booking);
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string,
    status: 'confirmed' | 'cancelled' | 'completed',
    cancellationReason?: string
  ): Promise<BookingResponse> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, cancellation_reason: cancellationReason }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating booking status:', error);
      console.log('Using mock response');
      
      // Mock response
      const booking = await this.getBookingById(bookingId);
      booking.status = status;
      if (cancellationReason) {
        booking.cancellation_reason = cancellationReason;
      }
      booking.updated_at = new Date().toISOString();
      
      return await mockDataService.withDelay({
        booking,
        message: `Booking ${status} successfully`
      });
    }
  }

  /**
   * Get upcoming bookings
   */
  async getUpcomingBookings(): Promise<Booking[]> {
    try {
      const response = await this.getUserBookings('confirmed');
      const now = new Date();
      
      return response.bookings.filter(booking => {
        const bookingDate = new Date(`${booking.booking_date} ${booking.booking_time}`);
        return bookingDate > now;
      });
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
      
      // Use mock data
      return await mockDataService.withDelay(
        mockDataService.getUpcomingBookings('user1')
      );
    }
  }

  /**
   * Get past bookings
   */
  async getPastBookings(): Promise<Booking[]> {
    try {
      const response = await this.getUserBookings('completed');
      return response.bookings;
    } catch (error) {
      console.error('Error fetching past bookings:', error);
      
      // Use mock data
      return await mockDataService.withDelay(
        mockDataService.getPastBookings('user1')
      );
    }
  }

  /**
   * Add review to booking
   */
  async addBookingReview(
    bookingId: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, comment }),
      });

      if (!response.ok) {
        throw new Error('Failed to add review');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error adding review:', error);
      console.log('Using mock response');
      
      // Mock response
      return await mockDataService.withDelay({
        success: true,
        message: 'Review added successfully'
      });
    }
  }
}

export default BookingService.getInstance();