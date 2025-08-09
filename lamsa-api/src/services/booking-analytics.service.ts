/**
 * Booking Analytics Service
 * Handles analytics, reporting, and dashboard methods for bookings
 */

import { supabase } from '../config/supabase';
import { BookingError } from '../types/booking-errors';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { secureLogger } from '../utils/secure-logger';

export interface AnalyticsFilters {
  period: string;
  startDate?: Date;
  endDate?: Date;
  providerId?: string;
  groupBy?: string;
  includeProviderBreakdown?: boolean;
}

export interface CustomerDashboardData {
  summary: {
    totalBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
  };
  upcomingBookings: any[];
  recentBookings: any[];
  favoriteProviders: any[];
  bookingHistory: {
    thisMonth: number;
    lastMonth: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface ProviderDashboardData {
  summary: {
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    revenue: number;
  };
  todayBookings: any[];
  upcomingBookings: any[];
  recentCustomers: any[];
  performance: {
    conversionRate: number;
    averageRating: number;
    repeatCustomers: number;
  };
}

export interface AdminDashboardData {
  summary: {
    totalBookings: number;
    totalRevenue: number;
    activeProviders: number;
    activeCustomers: number;
    platformFees: number;
  };
  recentBookings: any[];
  topProviders: any[];
  topServices: any[];
  systemHealth: {
    bookingSuccess: number;
    averageResponse: number;
    errorRate: number;
  };
}

export interface BookingAnalytics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  platformFees: number;
  averageBookingValue: number;
  periodComparison: {
    bookings: { current: number; previous: number; change: number };
    revenue: { current: number; previous: number; change: number };
  };
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    bookingCount: number;
    revenue: number;
  }>;
  topProviders: Array<{
    providerId: string;
    providerName: string;
    bookingCount: number;
    revenue: number;
    rating: number;
  }>;
}

export class BookingAnalyticsService {
  /**
   * Get customer dashboard data
   */
  async getCustomerDashboard(userId: string, period: string): Promise<CustomerDashboardData> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      // Get booking summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('bookings')
        .select('status')
        .eq('user_id', userId)
        .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
        .lte('booking_date', format(endDate, 'yyyy-MM-dd'));

      if (summaryError) {
        throw new BookingError('Failed to fetch booking summary', 500);
      }

      const summary = {
        totalBookings: summaryData?.length || 0,
        upcomingBookings: summaryData?.filter(b => ['pending', 'confirmed'].includes(b.status)).length || 0,
        completedBookings: summaryData?.filter(b => b.status === 'completed').length || 0,
        cancelledBookings: summaryData?.filter(b => b.status === 'cancelled').length || 0
      };

      // Get upcoming bookings
      const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          amount,
          providers:provider_id(business_name_en, business_name_ar),
          services:service_id(name_en, name_ar)
        `)
        .eq('user_id', userId)
        .gte('booking_date', format(new Date(), 'yyyy-MM-dd'))
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5);

      // Get recent bookings
      const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          status,
          amount,
          providers:provider_id(business_name_en, business_name_ar),
          services:service_id(name_en, name_ar)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get favorite providers (most booked)
      const { data: favoriteProviders } = await supabase
        .from('bookings')
        .select(`
          provider_id,
          providers:provider_id(business_name_en, business_name_ar, avatar_url)
        `)
        .eq('user_id', userId)
        .not('status', 'eq', 'cancelled');

      const providerCounts: Record<string, any> = {};
      favoriteProviders?.forEach(booking => {
        const providerId = booking.provider_id;
        if (!providerCounts[providerId]) {
          providerCounts[providerId] = {
            providerId,
            providerName: (booking.providers as any)?.business_name_en || (booking.providers as any)?.business_name_ar,
            avatarUrl: (booking.providers as any)?.avatar_url,
            bookingCount: 0
          };
        }
        providerCounts[providerId].bookingCount++;
      });

      const topProviders = Object.values(providerCounts)
        .sort((a: any, b: any) => b.bookingCount - a.bookingCount)
        .slice(0, 3);

      // Get booking history trend
      const thisMonthStart = startOfMonth(new Date());
      const thisMonthEnd = endOfMonth(new Date());
      const lastMonthStart = startOfMonth(subDays(new Date(), 30));
      const lastMonthEnd = endOfMonth(subDays(new Date(), 30));

      const [thisMonthBookings, lastMonthBookings] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte('booking_date', format(thisMonthStart, 'yyyy-MM-dd'))
          .lte('booking_date', format(thisMonthEnd, 'yyyy-MM-dd')),
        supabase
          .from('bookings')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte('booking_date', format(lastMonthStart, 'yyyy-MM-dd'))
          .lte('booking_date', format(lastMonthEnd, 'yyyy-MM-dd'))
      ]);

      const thisMonth = thisMonthBookings.count || 0;
      const lastMonth = lastMonthBookings.count || 0;
      const trend = thisMonth > lastMonth ? 'up' : thisMonth < lastMonth ? 'down' : 'stable';

      return {
        summary,
        upcomingBookings: upcomingBookings || [],
        recentBookings: recentBookings || [],
        favoriteProviders: topProviders,
        bookingHistory: {
          thisMonth,
          lastMonth,
          trend
        }
      };

    } catch (error) {
      secureLogger.error('Failed to fetch customer dashboard', error);
      throw new BookingError('Failed to fetch customer dashboard', 500);
    }
  }

  /**
   * Get provider dashboard data
   */
  async getProviderDashboard(providerId: string, period: string): Promise<ProviderDashboardData> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      // Get booking summary with revenue
      const { data: summaryData, error: summaryError } = await supabase
        .from('bookings')
        .select('status, provider_fee')
        .eq('provider_id', providerId)
        .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
        .lte('booking_date', format(endDate, 'yyyy-MM-dd'));

      if (summaryError) {
        throw new BookingError('Failed to fetch booking summary', 500);
      }

      const summary = {
        totalBookings: summaryData?.length || 0,
        pendingBookings: summaryData?.filter(b => b.status === 'pending').length || 0,
        confirmedBookings: summaryData?.filter(b => b.status === 'confirmed').length || 0,
        completedBookings: summaryData?.filter(b => b.status === 'completed').length || 0,
        revenue: summaryData
          ?.filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + Number(b.provider_fee || 0), 0) || 0
      };

      // Get today's bookings
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          amount,
          users:user_id(name, phone),
          services:service_id(name_en, name_ar)
        `)
        .eq('provider_id', providerId)
        .eq('booking_date', today)
        .order('start_time', { ascending: true });

      // Get upcoming bookings
      const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          amount,
          users:user_id(name, phone),
          services:service_id(name_en, name_ar)
        `)
        .eq('provider_id', providerId)
        .gt('booking_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);

      // Get recent customers
      const { data: recentCustomers } = await supabase
        .from('bookings')
        .select(`
          user_id,
          created_at,
          users:user_id(name, phone, avatar_url)
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Remove duplicates and get unique recent customers
      const uniqueCustomers = recentCustomers
        ?.filter((booking, index, self) => 
          self.findIndex(b => b.user_id === booking.user_id) === index
        )
        .slice(0, 5) || [];

      // Get performance metrics
      const { data: completedBookingsData } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('provider_id', providerId)
        .eq('status', 'completed');

      const { data: totalBookingsData } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('provider_id', providerId)
        .not('status', 'eq', 'cancelled');

      const { data: reviewData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', providerId);

      // Calculate repeat customers
      const customerBookings: Record<string, number> = {};
      completedBookingsData?.forEach(booking => {
        customerBookings[booking.user_id] = (customerBookings[booking.user_id] || 0) + 1;
      });
      const repeatCustomers = Object.values(customerBookings).filter(count => count > 1).length;

      const performance = {
        conversionRate: totalBookingsData?.length 
          ? Math.round((completedBookingsData?.length || 0) / totalBookingsData.length * 100) 
          : 0,
        averageRating: reviewData?.length 
          ? Math.round(reviewData.reduce((sum, r) => sum + r.rating, 0) / reviewData.length * 10) / 10
          : 0,
        repeatCustomers
      };

      return {
        summary,
        todayBookings: todayBookings || [],
        upcomingBookings: upcomingBookings || [],
        recentCustomers: uniqueCustomers,
        performance
      };

    } catch (error) {
      secureLogger.error('Failed to fetch provider dashboard', error);
      throw new BookingError('Failed to fetch provider dashboard', 500);
    }
  }

  /**
   * Get admin dashboard data
   */
  async getAdminDashboard(period: string): Promise<AdminDashboardData> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      // Get booking summary with fees
      const { data: summaryData, error: summaryError } = await supabase
        .from('bookings')
        .select('amount, platform_fee, status')
        .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
        .lte('booking_date', format(endDate, 'yyyy-MM-dd'));

      if (summaryError) {
        throw new BookingError('Failed to fetch booking summary', 500);
      }

      const totalRevenue = summaryData
        ?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.amount || 0), 0) || 0;

      const platformFees = summaryData
        ?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.platform_fee || 0), 0) || 0;

      // Get active providers and customers count
      const [activeProviders, activeCustomers] = await Promise.all([
        supabase
          .from('providers')
          .select('id', { count: 'exact' })
          .eq('verified', true)
          .eq('active', true),
        supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('active', true)
      ]);

      const summary = {
        totalBookings: summaryData?.length || 0,
        totalRevenue,
        activeProviders: activeProviders.count || 0,
        activeCustomers: activeCustomers.count || 0,
        platformFees
      };

      // Get recent bookings
      const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          status,
          amount,
          created_at,
          users:user_id(name),
          providers:provider_id(business_name_en, business_name_ar),
          services:service_id(name_en, name_ar)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get top providers by revenue
      const { data: providerRevenue } = await supabase
        .from('bookings')
        .select(`
          provider_id,
          provider_fee,
          providers:provider_id(business_name_en, business_name_ar)
        `)
        .eq('status', 'completed')
        .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
        .lte('booking_date', format(endDate, 'yyyy-MM-dd'));

      const providerStats: Record<string, any> = {};
      providerRevenue?.forEach(booking => {
        const providerId = booking.provider_id;
        if (!providerStats[providerId]) {
          providerStats[providerId] = {
            providerId,
            providerName: (booking.providers as any)?.business_name_en || (booking.providers as any)?.business_name_ar,
            revenue: 0,
            bookingCount: 0
          };
        }
        providerStats[providerId].revenue += Number(booking.provider_fee || 0);
        providerStats[providerId].bookingCount++;
      });

      const topProviders = Object.values(providerStats)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get top services
      const { data: serviceBookings } = await supabase
        .from('bookings')
        .select(`
          service_id,
          amount,
          services:service_id(name_en, name_ar)
        `)
        .eq('status', 'completed')
        .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
        .lte('booking_date', format(endDate, 'yyyy-MM-dd'));

      const serviceStats: Record<string, any> = {};
      serviceBookings?.forEach(booking => {
        const serviceId = booking.service_id;
        if (!serviceStats[serviceId]) {
          serviceStats[serviceId] = {
            serviceId,
            serviceName: (booking.services as any)?.name_en || (booking.services as any)?.name_ar,
            revenue: 0,
            bookingCount: 0
          };
        }
        serviceStats[serviceId].revenue += Number(booking.amount || 0);
        serviceStats[serviceId].bookingCount++;
      });

      const topServices = Object.values(serviceStats)
        .sort((a: any, b: any) => b.bookingCount - a.bookingCount)
        .slice(0, 5);

      // System health metrics (placeholder)
      const systemHealth = {
        bookingSuccess: 95, // Placeholder - should be calculated from actual data
        averageResponse: 150, // Placeholder - ms
        errorRate: 0.5 // Placeholder - %
      };

      return {
        summary,
        recentBookings: recentBookings || [],
        topProviders,
        topServices,
        systemHealth
      };

    } catch (error) {
      secureLogger.error('Failed to fetch admin dashboard', error);
      throw new BookingError('Failed to fetch admin dashboard', 500);
    }
  }

  /**
   * Get comprehensive booking analytics
   */
  async getBookingAnalytics(filters: AnalyticsFilters): Promise<BookingAnalytics> {
    try {
      const { startDate, endDate } = this.getPeriodDates(filters.period, filters.startDate, filters.endDate);
      
      // Get current period data
      let query = supabase
        .from('bookings')
        .select(`
          status,
          amount,
          platform_fee,
          provider_id,
          service_id,
          providers:provider_id(business_name_en, business_name_ar),
          services:service_id(name_en, name_ar)
        `)
        .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
        .lte('booking_date', format(endDate, 'yyyy-MM-dd'));

      if (filters.providerId) {
        query = query.eq('provider_id', filters.providerId);
      }

      const { data: currentPeriodData, error } = await query;

      if (error) {
        throw new BookingError('Failed to fetch analytics data', 500);
      }

      // Calculate metrics
      const totalBookings = currentPeriodData?.length || 0;
      const completedBookings = currentPeriodData?.filter(b => b.status === 'completed').length || 0;
      const cancelledBookings = currentPeriodData?.filter(b => b.status === 'cancelled').length || 0;
      
      const totalRevenue = currentPeriodData
        ?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.amount || 0), 0) || 0;

      const platformFees = currentPeriodData
        ?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.platform_fee || 0), 0) || 0;

      const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

      // Get previous period for comparison
      const previousStartDate = this.getPreviousPeriodStartDate(startDate, filters.period);
      const previousEndDate = this.getPreviousPeriodEndDate(endDate, filters.period);

      let previousQuery = supabase
        .from('bookings')
        .select('status, amount')
        .gte('booking_date', format(previousStartDate, 'yyyy-MM-dd'))
        .lte('booking_date', format(previousEndDate, 'yyyy-MM-dd'));

      if (filters.providerId) {
        previousQuery = previousQuery.eq('provider_id', filters.providerId);
      }

      const { data: previousPeriodData } = await previousQuery;

      const previousBookings = previousPeriodData?.length || 0;
      const previousRevenue = previousPeriodData
        ?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.amount || 0), 0) || 0;

      // Top services and providers
      const topServices = this.calculateTopServices(currentPeriodData || []);
      const topProviders = await this.calculateTopProviders(currentPeriodData || []);

      return {
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        platformFees,
        averageBookingValue,
        periodComparison: {
          bookings: {
            current: totalBookings,
            previous: previousBookings,
            change: previousBookings > 0 ? ((totalBookings - previousBookings) / previousBookings) * 100 : 0
          },
          revenue: {
            current: totalRevenue,
            previous: previousRevenue,
            change: previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
          }
        },
        topServices,
        topProviders
      };

    } catch (error) {
      secureLogger.error('Failed to fetch booking analytics', error);
      throw new BookingError('Failed to fetch booking analytics', 500);
    }
  }

  /**
   * Get period date range
   */
  private getPeriodDates(period: string, customStartDate?: Date, customEndDate?: Date) {
    if (customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    const now = new Date();
    
    switch (period) {
      case 'today':
        return { startDate: now, endDate: now };
      case 'week':
        return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
      case 'month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'last7days':
        return { startDate: subDays(now, 6), endDate: now };
      case 'last30days':
        return { startDate: subDays(now, 29), endDate: now };
      default:
        return { startDate: subDays(now, 29), endDate: now };
    }
  }

  private getPreviousPeriodStartDate(currentStartDate: Date, period: string): Date {
    const daysDiff = Math.floor((new Date().getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24));
    return subDays(currentStartDate, daysDiff + 1);
  }

  private getPreviousPeriodEndDate(currentEndDate: Date, period: string): Date {
    const daysDiff = Math.floor((new Date().getTime() - currentEndDate.getTime()) / (1000 * 60 * 60 * 24));
    return subDays(currentEndDate, daysDiff + 1);
  }

  private calculateTopServices(bookings: any[]) {
    const serviceStats: Record<string, any> = {};
    
    bookings
      .filter(b => b.status === 'completed')
      .forEach(booking => {
        const serviceId = booking.service_id;
        if (!serviceStats[serviceId]) {
          serviceStats[serviceId] = {
            serviceId,
            serviceName: booking.services?.name_en || booking.services?.name_ar || 'Unknown',
            bookingCount: 0,
            revenue: 0
          };
        }
        serviceStats[serviceId].bookingCount++;
        serviceStats[serviceId].revenue += Number(booking.amount || 0);
      });

    return Object.values(serviceStats)
      .sort((a: any, b: any) => b.bookingCount - a.bookingCount)
      .slice(0, 5);
  }

  private async calculateTopProviders(bookings: any[]) {
    const providerStats: Record<string, any> = {};
    
    bookings
      .filter(b => b.status === 'completed')
      .forEach(booking => {
        const providerId = booking.provider_id;
        if (!providerStats[providerId]) {
          providerStats[providerId] = {
            providerId,
            providerName: booking.providers?.business_name_en || booking.providers?.business_name_ar || 'Unknown',
            bookingCount: 0,
            revenue: 0,
            rating: 0
          };
        }
        providerStats[providerId].bookingCount++;
        providerStats[providerId].revenue += Number(booking.amount || 0);
      });

    // Get ratings for top providers
    const topProviderIds = Object.keys(providerStats);
    if (topProviderIds.length > 0) {
      const { data: ratings } = await supabase
        .from('reviews')
        .select('provider_id, rating')
        .in('provider_id', topProviderIds);

      ratings?.forEach(review => {
        if (providerStats[review.provider_id]) {
          providerStats[review.provider_id].rating = review.rating || 0;
        }
      });
    }

    return Object.values(providerStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);
  }
}

export const bookingAnalyticsService = new BookingAnalyticsService();