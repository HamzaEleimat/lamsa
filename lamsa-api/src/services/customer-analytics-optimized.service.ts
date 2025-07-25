/**
 * @file customer-analytics-optimized.service.ts
 * @description Optimized customer analytics service using database aggregation functions
 * @author Lamsa Development Team
 * @date Created: 2025-07-20
 */

import { supabase } from '../config/supabase';
import { format } from 'date-fns';
import { secureLogger } from '../utils/secure-logger';

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  churningCustomers: number;
  averageLifetimeValue: number;
  averageBookingsPerCustomer: number;
  topCustomers: Array<{
    userId: string;
    name: string;
    totalSpent: number;
    bookingCount: number;
    lastBookingDate: string;
  }>;
  customerSegments: {
    highValue: number;
    mediumValue: number;
    lowValue: number;
  };
  retentionRate: number;
}

export interface RetentionMetrics {
  period: string;
  cohortSize: number;
  retainedCustomers: number;
  retentionRate: number;
}

export interface CustomerTrends {
  date: string;
  newCustomers: number;
  activeCustomers: number;
  churnedCustomers: number;
  revenue: number;
}

export class CustomerAnalyticsOptimizedService {
  /**
   * Get comprehensive customer metrics using optimized database functions
   */
  async getCustomerMetrics(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CustomerMetrics> {
    try {
      // Use the optimized database function for customer value segments
      const { data: customerData, error } = await supabase.rpc(
        'calculate_customer_value_segments',
        {
          p_provider_id: providerId,
          p_start_date: format(startDate, 'yyyy-MM-dd'),
          p_end_date: format(endDate, 'yyyy-MM-dd')
        }
      );

      if (error) {
        secureLogger.error('Failed to get customer segments', error);
        throw error;
      }

      // Calculate metrics from the returned data
      const totalCustomers = customerData?.length || 0;
      const activeCustomers = customerData?.filter(
        (c: any) => c.recency_segment === 'active'
      ).length || 0;
      const churningCustomers = customerData?.filter(
        (c: any) => c.recency_segment === 'at_risk'
      ).length || 0;
      
      const totalRevenue = customerData?.reduce(
        (sum: number, c: any) => sum + parseFloat(c.total_spent), 
        0
      ) || 0;
      
      const totalBookings = customerData?.reduce(
        (sum: number, c: any) => sum + c.booking_count, 
        0
      ) || 0;

      // Get user details for top customers
      const topCustomerIds = customerData
        ?.sort((a: any, b: any) => parseFloat(b.total_spent) - parseFloat(a.total_spent))
        .slice(0, 10)
        .map((c: any) => c.user_id) || [];

      const { data: userDetails } = await supabase
        .from('users')
        .select('id, name, phone')
        .in('id', topCustomerIds);

      const userMap = new Map(userDetails?.map(u => [u.id, u]) || []);
      
      const topCustomers = customerData
        ?.sort((a: any, b: any) => parseFloat(b.total_spent) - parseFloat(a.total_spent))
        .slice(0, 10)
        .map((c: any) => ({
          userId: c.user_id,
          name: userMap.get(c.user_id)?.name || 'Unknown',
          totalSpent: parseFloat(c.total_spent),
          bookingCount: c.booking_count,
          lastBookingDate: c.last_booking_date
        })) || [];

      // Count customers by segment
      const customerSegments = {
        highValue: customerData?.filter((c: any) => c.value_segment === 'high_value').length || 0,
        mediumValue: customerData?.filter((c: any) => c.value_segment === 'medium_value').length || 0,
        lowValue: customerData?.filter((c: any) => c.value_segment === 'low_value').length || 0
      };

      // Calculate new customers (those whose first booking is within the period)
      const { count: newCustomers } = await supabase
        .from('bookings')
        .select('user_id', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
        .lte('booking_date', format(endDate, 'yyyy-MM-dd'))
        .eq('status', 'completed')
        .filter('user_id', 'in', `(
          SELECT user_id 
          FROM bookings 
          WHERE provider_id = '${providerId}'
          GROUP BY user_id 
          HAVING MIN(booking_date) >= '${format(startDate, 'yyyy-MM-dd')}'
        )`);

      return {
        totalCustomers,
        newCustomers: newCustomers || 0,
        activeCustomers,
        churningCustomers,
        averageLifetimeValue: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
        averageBookingsPerCustomer: totalCustomers > 0 ? totalBookings / totalCustomers : 0,
        topCustomers,
        customerSegments,
        retentionRate: totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0
      };
    } catch (error) {
      secureLogger.error('Error fetching customer metrics', error);
      throw error;
    }
  }

  /**
   * Get customer retention metrics using optimized database function
   */
  async getRetentionMetrics(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RetentionMetrics[]> {
    try {
      const { data, error } = await supabase.rpc(
        'calculate_retention_metrics',
        {
          p_provider_id: providerId,
          p_start_date: format(startDate, 'yyyy-MM-dd'),
          p_end_date: format(endDate, 'yyyy-MM-dd')
        }
      );

      if (error) {
        secureLogger.error('Failed to get retention metrics', error);
        throw error;
      }

      return data?.map((row: any) => ({
        period: row.cohort_month,
        cohortSize: row.cohort_size,
        retainedCustomers: row.retained_customers,
        retentionRate: parseFloat(row.retention_rate)
      })) || [];
    } catch (error) {
      secureLogger.error('Error fetching retention metrics', error);
      throw error;
    }
  }

  /**
   * Get customer trends over time using optimized database function
   */
  async getCustomerTrends(
    providerId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<CustomerTrends[]> {
    try {
      const { data, error } = await supabase.rpc(
        'calculate_booking_trends',
        {
          p_provider_id: providerId,
          p_start_date: format(startDate, 'yyyy-MM-dd'),
          p_end_date: format(endDate, 'yyyy-MM-dd'),
          p_group_by: groupBy
        }
      );

      if (error) {
        secureLogger.error('Failed to get customer trends', error);
        throw error;
      }

      return data?.map((row: any) => ({
        date: row.period,
        newCustomers: row.new_customers,
        activeCustomers: row.unique_customers,
        churnedCustomers: 0, // This would need additional calculation
        revenue: parseFloat(row.total_revenue)
      })) || [];
    } catch (error) {
      secureLogger.error('Error fetching customer trends', error);
      throw error;
    }
  }

  /**
   * Get customer lifetime value distribution
   */
  async getLifetimeValueDistribution(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ range: string; count: number; percentage: number }[]> {
    try {
      const { data: customerData } = await supabase.rpc(
        'calculate_customer_value_segments',
        {
          p_provider_id: providerId,
          p_start_date: format(startDate, 'yyyy-MM-dd'),
          p_end_date: format(endDate, 'yyyy-MM-dd')
        }
      );

      if (!customerData || customerData.length === 0) {
        return [];
      }

      // Define value ranges
      const ranges = [
        { min: 0, max: 50, label: '0-50 JOD' },
        { min: 50, max: 100, label: '50-100 JOD' },
        { min: 100, max: 200, label: '100-200 JOD' },
        { min: 200, max: 500, label: '200-500 JOD' },
        { min: 500, max: Infinity, label: '500+ JOD' }
      ];

      const totalCustomers = customerData.length;
      
      return ranges.map(range => {
        const count = customerData.filter(
          (c: any) => parseFloat(c.total_spent) >= range.min && parseFloat(c.total_spent) < range.max
        ).length;
        
        return {
          range: range.label,
          count,
          percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0
        };
      });
    } catch (error) {
      secureLogger.error('Error fetching lifetime value distribution', error);
      throw error;
    }
  }
}

// Export singleton instance
export const customerAnalyticsOptimizedService = new CustomerAnalyticsOptimizedService();