/**
 * @file booking-secure.service.ts
 * @description Example of secure booking service with SQL injection protection
 * @author Lamsa Development Team
 * @date Created: 2025-07-23
 * @copyright Lamsa 2025
 */

import { supabase } from '../config/supabase-simple';
import SecureQueryBuilder from '../utils/secure-query';
import { BookingStatus } from '../types/database';
import { secureLogger } from '../utils/secure-logger';

/**
 * Secure booking service with parameterized queries
 */
export class SecureBookingService {
  /**
   * Get bookings with secure filtering
   */
  async getBookings(filters: {
    userId?: string;
    providerId?: string;
    status?: BookingStatus;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          users!inner(id, name, phone),
          providers!inner(id, business_name, business_name_ar),
          services!inner(id, name_en, name_ar, price, duration_minutes)
        `);

      // Apply filters with validation
      if (filters.userId) {
        const validatedId = SecureQueryBuilder.validateUUID(filters.userId, 'userId');
        query = query.eq('user_id', validatedId);
      }

      if (filters.providerId) {
        const validatedId = SecureQueryBuilder.validateUUID(filters.providerId, 'providerId');
        query = query.eq('provider_id', validatedId);
      }

      if (filters.status) {
        const allowedStatuses: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
        if (!allowedStatuses.includes(filters.status)) {
          throw new Error('Invalid booking status');
        }
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        const validatedDate = SecureQueryBuilder.validateDate(filters.dateFrom, 'dateFrom');
        query = query.gte('booking_date', validatedDate);
      }

      if (filters.dateTo) {
        const validatedDate = SecureQueryBuilder.validateDate(filters.dateTo, 'dateTo');
        query = query.lte('booking_date', validatedDate);
      }

      // Apply pagination
      const { limit, offset } = SecureQueryBuilder.validatePagination(filters.limit, filters.offset);
      query = query
        .order('booking_date', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        secureLogger.error('Error fetching bookings', { error, filters });
        throw error;
      }

      return data;
    } catch (error) {
      secureLogger.error('Booking query error', { error, filters });
      throw error;
    }
  }

  /**
   * Search bookings by customer name or phone (secure)
   */
  async searchBookings(searchTerm: string, providerId?: string) {
    try {
      // Validate and escape search term
      const escapedTerm = SecureQueryBuilder.escapeLikePattern(
        SecureQueryBuilder.validateParam(searchTerm, 'searchTerm')
      );

      let query = supabase
        .from('bookings')
        .select(`
          *,
          users!inner(id, name, phone)
        `);

      // Apply provider filter if provided
      if (providerId) {
        const validatedId = SecureQueryBuilder.validateUUID(providerId, 'providerId');
        query = query.eq('provider_id', validatedId);
      }

      // Search in user name or phone
      query = query.or(`users.name.ilike.%${escapedTerm}%,users.phone.ilike.%${escapedTerm}%`);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        secureLogger.error('Error searching bookings', { error, searchTerm });
        throw error;
      }

      return data;
    } catch (error) {
      secureLogger.error('Booking search error', { error });
      throw error;
    }
  }

  /**
   * Get booking statistics using database aggregation (secure)
   */
  async getBookingStats(providerId: string, period: 'day' | 'week' | 'month' | 'year') {
    try {
      const validatedId = SecureQueryBuilder.validateUUID(providerId, 'providerId');
      
      // Validate period
      const allowedPeriods = ['day', 'week', 'month', 'year'];
      if (!allowedPeriods.includes(period)) {
        throw new Error('Invalid period');
      }

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case 'day':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      // Use database function for efficient aggregation
      const { data, error } = await supabase
        .rpc('get_booking_stats_by_period', {
          p_provider_id: validatedId,
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        });

      if (error) {
        secureLogger.error('Error fetching booking stats', { error, providerId, period });
        throw error;
      }

      return data || [];
    } catch (error) {
      secureLogger.error('Booking stats error', { error });
      throw error;
    }
  }

  /**
   * Bulk update booking status (secure)
   */
  async bulkUpdateStatus(bookingIds: string[], newStatus: BookingStatus, providerId: string) {
    try {
      // Validate all booking IDs
      const validatedIds = bookingIds.map(id => 
        SecureQueryBuilder.validateUUID(id, 'bookingId')
      );

      // Validate provider ID
      const validatedProviderId = SecureQueryBuilder.validateUUID(providerId, 'providerId');

      // Validate status
      const allowedStatuses: BookingStatus[] = ['confirmed', 'cancelled', 'completed'];
      if (!allowedStatuses.includes(newStatus)) {
        throw new Error('Invalid status for bulk update');
      }

      // Update only bookings that belong to the provider
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', validatedIds)
        .eq('provider_id', validatedProviderId)
        .select();

      if (error) {
        secureLogger.error('Error bulk updating bookings', { 
          error, 
          bookingIds: validatedIds, 
          newStatus 
        });
        throw error;
      }

      return data;
    } catch (error) {
      secureLogger.error('Bulk update error', { error });
      throw error;
    }
  }
  /**
   * Get provider performance metrics (secure)
   */
  async getProviderPerformanceMetrics(providerId: string) {
    try {
      const validatedId = SecureQueryBuilder.validateUUID(providerId, 'providerId');
      
      // Get from materialized view for performance
      const { data, error } = await supabase
        .from('provider_performance_summary')
        .select('*')
        .eq('provider_id', validatedId)
        .single();

      if (error) {
        secureLogger.error('Error fetching performance metrics', { error, providerId });
        throw error;
      }

      return data;
    } catch (error) {
      secureLogger.error('Performance metrics error', { error });
      throw error;
    }
  }

  /**
   * Get daily revenue statistics (secure)
   */
  async getDailyRevenueStats(providerId: string, days: number = 30) {
    try {
      const validatedId = SecureQueryBuilder.validateUUID(providerId, 'providerId');
      const validatedDays = Math.min(Math.max(1, days), 365); // Limit to 1-365 days
      
      const { data, error } = await supabase
        .rpc('get_daily_revenue_stats', {
          p_provider_id: validatedId,
          p_days: validatedDays
        });

      if (error) {
        secureLogger.error('Error fetching daily revenue stats', { error, providerId, days });
        throw error;
      }

      return data || [];
    } catch (error) {
      secureLogger.error('Daily revenue stats error', { error });
      throw error;
    }
  }

  /**
   * Get hourly booking patterns (secure)
   */
  async getHourlyBookingPatterns(providerId: string, days: number = 90) {
    try {
      const validatedId = SecureQueryBuilder.validateUUID(providerId, 'providerId');
      const validatedDays = Math.min(Math.max(1, days), 365); // Limit to 1-365 days
      
      const { data, error } = await supabase
        .rpc('get_hourly_booking_patterns', {
          p_provider_id: validatedId,
          p_days: validatedDays
        });

      if (error) {
        secureLogger.error('Error fetching hourly patterns', { error, providerId, days });
        throw error;
      }

      return data || [];
    } catch (error) {
      secureLogger.error('Hourly patterns error', { error });
      throw error;
    }
  }

  /**
   * Get customer retention statistics (secure)
   */
  async getCustomerRetentionStats(providerId: string) {
    try {
      const validatedId = SecureQueryBuilder.validateUUID(providerId, 'providerId');
      
      const { data, error } = await supabase
        .rpc('get_customer_retention_stats', {
          p_provider_id: validatedId
        });

      if (error) {
        secureLogger.error('Error fetching retention stats', { error, providerId });
        throw error;
      }

      return data?.[0] || null; // RPC returns array, we need first row
    } catch (error) {
      secureLogger.error('Customer retention stats error', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const secureBookingService = new SecureBookingService();