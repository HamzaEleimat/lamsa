import { supabase } from './supabase';
import { validateUUID } from '../utils/validation';

export interface PerformanceMetrics {
  provider_id: string;
  provider_name: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  bookings_last_30_days: number;
  bookings_last_7_days: number;
  bookings_today: number;
  total_revenue: number;
  revenue_last_30_days: number;
  revenue_last_7_days: number;
  revenue_today: number;
  avg_booking_value: number;
  avg_rating: number;
  total_reviews: number;
  unique_customers: number;
  new_customers_last_30_days: number;
  cancellation_rate: number;
  completion_rate: number;
}

export interface ServiceAnalytics {
  service_id: string;
  provider_id: string;
  name_en: string;
  name_ar: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  category_name_en: string;
  category_name_ar: string;
  total_bookings: number;
  completed_bookings: number;
  bookings_last_30_days: number;
  total_revenue: number;
  revenue_last_30_days: number;
  avg_rating: number;
  total_reviews: number;
  popularity_score: number;
}

export interface DailyRevenue {
  provider_id: string;
  date: string;
  total_bookings: number;
  completed_bookings: number;
  revenue: number;
  platform_fees: number;
  net_earnings: number;
}

export interface HourlyPattern {
  provider_id: string;
  hour: number;
  day_of_week: number;
  booking_count: number;
  avg_booking_value: number;
}

export interface CustomerRetention {
  provider_id: string;
  total_customers: number;
  one_time_customers: number;
  repeat_customers: number;
  loyal_customers: number;
  retention_rate: number;
  avg_customer_lifetime_value: number;
}

export interface PopularTimeSlot {
  provider_id: string;
  time_slot: string;
  booking_count: number;
  avg_booking_value: number;
  popular_services: string;
}

export class AnalyticsService {
  /**
   * Get provider performance metrics
   */
  async getPerformanceMetrics(providerId: string): Promise<PerformanceMetrics | null> {
    try {
      // Validate provider ID before making API call
      const validatedId = validateUUID(providerId, 'providerId');
      
      const { data, error } = await supabase
        .from('provider_performance_metrics')
        .select('*')
        .eq('provider_id', validatedId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return null;
    }
  }

  /**
   * Get service analytics for a provider
   */
  async getServiceAnalytics(providerId: string): Promise<ServiceAnalytics[]> {
    try {
      // Validate provider ID before making API call
      const validatedId = validateUUID(providerId, 'providerId');
      
      const { data, error } = await supabase
        .from('service_performance_analytics')
        .select('*')
        .eq('provider_id', validatedId)
        .order('popularity_score', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching service analytics:', error);
      return [];
    }
  }

  /**
   * Get daily revenue trends
   */
  async getDailyRevenue(
    providerId: string, 
    days: number = 30
  ): Promise<DailyRevenue[]> {
    try {
      // Validate provider ID
      const validatedId = validateUUID(providerId, 'providerId');
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('provider_daily_revenue')
        .select('*')
        .eq('provider_id', validatedId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching daily revenue:', error);
      return [];
    }
  }

  /**
   * Get hourly booking patterns
   */
  async getHourlyPatterns(providerId: string): Promise<HourlyPattern[]> {
    try {
      // Validate provider ID
      const validatedId = validateUUID(providerId, 'providerId');
      
      const { data, error } = await supabase
        .from('provider_hourly_patterns')
        .select('*')
        .eq('provider_id', validatedId)
        .order('booking_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching hourly patterns:', error);
      return [];
    }
  }

  /**
   * Get customer retention metrics
   */
  async getCustomerRetention(providerId: string): Promise<CustomerRetention | null> {
    try {
      // Validate provider ID
      const validatedId = validateUUID(providerId, 'providerId');
      
      const { data, error } = await supabase
        .from('provider_customer_retention')
        .select('*')
        .eq('provider_id', validatedId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching customer retention:', error);
      return null;
    }
  }

  /**
   * Get popular time slots
   */
  async getPopularTimeSlots(providerId: string): Promise<PopularTimeSlot[]> {
    try {
      // Validate provider ID
      const validatedId = validateUUID(providerId, 'providerId');
      
      const { data, error } = await supabase
        .from('provider_popular_timeslots')
        .select('*')
        .eq('provider_id', validatedId)
        .order('booking_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching popular time slots:', error);
      return [];
    }
  }

  /**
   * Get revenue comparison (this week vs last week)
   */
  async getRevenueComparison(providerId: string): Promise<{
    currentWeek: number;
    lastWeek: number;
    percentageChange: number;
  }> {
    try {
      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay());
      
      const lastWeekStart = new Date(currentWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      
      const lastWeekEnd = new Date(currentWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

      // Get current week revenue
      // Validate provider ID
      const validatedId = validateUUID(providerId, 'providerId');
      
      const { data: currentWeekData, error: currentError } = await supabase
        .from('provider_daily_revenue')
        .select('revenue')
        .eq('provider_id', validatedId)
        .gte('date', currentWeekStart.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0]);

      if (currentError) throw currentError;

      // Get last week revenue
      const { data: lastWeekData, error: lastError } = await supabase
        .from('provider_daily_revenue')
        .select('revenue')
        .eq('provider_id', validatedId)
        .gte('date', lastWeekStart.toISOString().split('T')[0])
        .lte('date', lastWeekEnd.toISOString().split('T')[0]);

      if (lastError) throw lastError;

      const currentWeek = currentWeekData?.reduce((sum, day) => sum + day.revenue, 0) || 0;
      const lastWeek = lastWeekData?.reduce((sum, day) => sum + day.revenue, 0) || 0;
      
      const percentageChange = lastWeek > 0 
        ? ((currentWeek - lastWeek) / lastWeek) * 100 
        : currentWeek > 0 ? 100 : 0;

      return {
        currentWeek,
        lastWeek,
        percentageChange: Math.round(percentageChange * 10) / 10
      };
    } catch (error) {
      console.error('Error fetching revenue comparison:', error);
      return {
        currentWeek: 0,
        lastWeek: 0,
        percentageChange: 0
      };
    }
  }

  /**
   * Get peak hours for scheduling optimization
   */
  async getPeakHours(providerId: string): Promise<{
    hour: number;
    dayOfWeek: number;
    bookingCount: number;
  }[]> {
    try {
      // Validate provider ID first
      const validatedId = validateUUID(providerId, 'providerId');
      
      const patterns = await this.getHourlyPatterns(validatedId);
      
      // Group by hour and find the busiest times
      const hourlyStats = patterns.reduce((acc, pattern) => {
        if (!acc[pattern.hour]) {
          acc[pattern.hour] = {
            hour: pattern.hour,
            totalBookings: 0,
            days: []
          };
        }
        acc[pattern.hour].totalBookings += pattern.booking_count;
        acc[pattern.hour].days.push({
          dayOfWeek: pattern.day_of_week,
          bookingCount: pattern.booking_count
        });
        return acc;
      }, {} as Record<number, any>);

      // Convert to array and sort by total bookings
      const peakHours = Object.values(hourlyStats)
        .sort((a: any, b: any) => b.totalBookings - a.totalBookings)
        .slice(0, 5) // Top 5 peak hours
        .flatMap((hour: any) => 
          hour.days.map((day: any) => ({
            hour: hour.hour,
            dayOfWeek: day.dayOfWeek,
            bookingCount: day.bookingCount
          }))
        );

      return peakHours;
    } catch (error) {
      console.error('Error fetching peak hours:', error);
      return [];
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();