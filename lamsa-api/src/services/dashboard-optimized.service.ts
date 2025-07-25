/**
 * @file dashboard-optimized.service.ts
 * @description Optimized dashboard service using database aggregation functions
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 */

import { supabase } from '../config/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { secureLogger } from '../utils/secure-logger';

export interface DashboardMetrics {
  overview: {
    totalBookings: number;
    totalRevenue: number;
    totalCustomers: number;
    averageRating: number;
    todayBookings: number;
    todayRevenue: number;
    weekGrowth: number;
    monthGrowth: number;
  };
  bookingsByStatus: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
  revenueByPeriod: Array<{
    date: string;
    revenue: number;
    bookings: number;
  }>;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    bookingCount: number;
    revenue: number;
  }>;
  customerStats: {
    newCustomers: number;
    returningCustomers: number;
    averageBookingsPerCustomer: number;
  };
  upcomingBookings: Array<{
    id: string;
    customerName: string;
    serviceName: string;
    bookingDate: string;
    startTime: string;
    status: string;
  }>;
}

export class DashboardOptimizedService {
  /**
   * Get comprehensive dashboard metrics using optimized queries
   */
  async getDashboardMetrics(
    providerId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<DashboardMetrics> {
    try {
      // Get overall metrics using the booking trends function
      const { data: periodData, error: periodError } = await supabase.rpc(
        'calculate_booking_trends',
        {
          p_provider_id: providerId,
          p_start_date: format(dateRange.start, 'yyyy-MM-dd'),
          p_end_date: format(dateRange.end, 'yyyy-MM-dd'),
          p_group_by: 'day'
        }
      );

      if (periodError) {
        secureLogger.error('Failed to get period data', periodError);
        throw periodError;
      }

      // Calculate totals from period data
      const totalBookings = periodData?.reduce((sum: number, day: any) => sum + day.booking_count, 0) || 0;
      const totalRevenue = periodData?.reduce((sum: number, day: any) => sum + parseFloat(day.total_revenue), 0) || 0;
      const totalCustomers = new Set(periodData?.flatMap((day: any) => day.unique_customers) || []).size;

      // Get today's data
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayData = periodData?.find((day: any) => day.period === today);
      const todayBookings = todayData?.booking_count || 0;
      const todayRevenue = parseFloat(todayData?.total_revenue || '0');

      // Get bookings by status
      const { data: statusData, error: statusError } = await supabase
        .from('bookings')
        .select('status', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .gte('booking_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('booking_date', format(dateRange.end, 'yyyy-MM-dd'));

      if (statusError) {
        secureLogger.error('Failed to get status data', statusError);
      }

      // Get bookings grouped by status
      const { data: statusCounts } = await supabase
        .from('bookings')
        .select('status')
        .eq('provider_id', providerId)
        .gte('booking_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('booking_date', format(dateRange.end, 'yyyy-MM-dd'));

      const bookingsByStatus = {
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0
      };

      statusCounts?.forEach((booking: any) => {
        if (booking.status in bookingsByStatus) {
          bookingsByStatus[booking.status as keyof typeof bookingsByStatus]++;
        }
      });

      // Get average rating
      const { data: ratingData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', providerId);

      const averageRating = ratingData && ratingData.length > 0
        ? ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length
        : 0;

      // Calculate growth rates
      const lastWeekStart = subDays(dateRange.start, 7);
      const lastMonthStart = subDays(dateRange.start, 30);

      const { data: lastWeekData } = await supabase.rpc(
        'calculate_booking_trends',
        {
          p_provider_id: providerId,
          p_start_date: format(lastWeekStart, 'yyyy-MM-dd'),
          p_end_date: format(subDays(dateRange.start, 1), 'yyyy-MM-dd'),
          p_group_by: 'week'
        }
      );

      const lastWeekRevenue = parseFloat(lastWeekData?.[0]?.total_revenue || '0');
      const weekGrowth = lastWeekRevenue > 0 
        ? ((totalRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
        : 0;

      const { data: lastMonthData } = await supabase.rpc(
        'calculate_booking_trends',
        {
          p_provider_id: providerId,
          p_start_date: format(lastMonthStart, 'yyyy-MM-dd'),
          p_end_date: format(subDays(dateRange.start, 1), 'yyyy-MM-dd'),
          p_group_by: 'month'
        }
      );

      const lastMonthRevenue = parseFloat(lastMonthData?.[0]?.total_revenue || '0');
      const monthGrowth = lastMonthRevenue > 0 
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      // Get top services
      const { data: topServicesData } = await supabase
        .from('bookings')
        .select(`
          service_id,
          services!inner(name_en, name_ar),
          total_amount
        `)
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .gte('booking_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('booking_date', format(dateRange.end, 'yyyy-MM-dd'));

      const serviceStats = new Map();
      topServicesData?.forEach((booking: any) => {
        const serviceId = booking.service_id;
        if (!serviceStats.has(serviceId)) {
          serviceStats.set(serviceId, {
            serviceId,
            serviceName: booking.services.name_en,
            bookingCount: 0,
            revenue: 0
          });
        }
        const stats = serviceStats.get(serviceId);
        stats.bookingCount++;
        stats.revenue += booking.total_amount;
      });

      const topServices = Array.from(serviceStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get customer stats from period data
      const newCustomers = periodData?.reduce((sum: number, day: any) => sum + day.new_customers, 0) || 0;
      const uniqueCustomers = new Set(
        periodData?.flatMap((day: any) => Array(day.unique_customers).fill(null)) || []
      ).size;
      const returningCustomers = Math.max(0, uniqueCustomers - newCustomers);
      const averageBookingsPerCustomer = uniqueCustomers > 0 ? totalBookings / uniqueCustomers : 0;

      // Get upcoming bookings
      const { data: upcomingData } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          status,
          users!inner(name),
          services!inner(name_en)
        `)
        .eq('provider_id', providerId)
        .gte('booking_date', format(new Date(), 'yyyy-MM-dd'))
        .in('status', ['confirmed', 'pending'])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);

      const upcomingBookings = upcomingData?.map((booking: any) => ({
        id: booking.id,
        customerName: booking.users.name,
        serviceName: booking.services.name_en,
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        status: booking.status
      })) || [];

      // Format revenue by period
      const revenueByPeriod = periodData?.map((day: any) => ({
        date: day.period,
        revenue: parseFloat(day.total_revenue),
        bookings: day.booking_count
      })) || [];

      return {
        overview: {
          totalBookings,
          totalRevenue,
          totalCustomers,
          averageRating,
          todayBookings,
          todayRevenue,
          weekGrowth,
          monthGrowth
        },
        bookingsByStatus,
        revenueByPeriod,
        topServices,
        customerStats: {
          newCustomers,
          returningCustomers,
          averageBookingsPerCustomer
        },
        upcomingBookings
      };
    } catch (error) {
      secureLogger.error('Error fetching dashboard metrics', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific period
   */
  async getPerformanceMetrics(
    providerId: string,
    period: 'day' | 'week' | 'month',
    date: Date = new Date()
  ): Promise<any> {
    try {
      let startDate: Date;
      let endDate: Date;

      if (period === 'day') {
        startDate = startOfDay(date);
        endDate = endOfDay(date);
      } else if (period === 'week') {
        startDate = subDays(date, 7);
        endDate = date;
      } else {
        startDate = subDays(date, 30);
        endDate = date;
      }

      const { data, error } = await supabase.rpc(
        'calculate_booking_trends',
        {
          p_provider_id: providerId,
          p_start_date: format(startDate, 'yyyy-MM-dd'),
          p_end_date: format(endDate, 'yyyy-MM-dd'),
          p_group_by: period
        }
      );

      if (error) {
        secureLogger.error('Failed to get performance metrics', error);
        throw error;
      }

      return data;
    } catch (error) {
      secureLogger.error('Error fetching performance metrics', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dashboardOptimizedService = new DashboardOptimizedService();