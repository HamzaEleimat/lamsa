import { supabase } from '../config/supabase-simple';
import { format } from 'date-fns/index.js';
import { RevenueService } from './revenue.service';
import { CustomerAnalyticsService } from './customer-analytics.service';
import { ReviewAnalyticsService } from './review-analytics.service';
import { performanceInsightsService } from './performance-insights.service';

export interface PeriodStatistics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  grossRevenue: number;
  netRevenue: number;
  platformFees: number;
  refunds: number;
  uniqueCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  avgRating: number;
  totalReviews: number;
  fiveStarReviews: number;
  avgBookingDuration: number;
  totalServiceHours: number;
}

export interface GrowthMetrics {
  bookingsGrowth: number;
  revenueGrowth: number;
  customersGrowth: number;
  ratingGrowth: number;
  efficiencyGrowth: number;
}

export interface ServicePerformance {
  serviceId: string;
  serviceName: string;
  serviceNameAr: string;
  bookingsCount: number;
  completedCount: number;
  revenue: number;
  avgRating: number;
  rebookingRate: number;
  onTimeRate: number;
  popularityRank: number;
  revenueRank: number;
}

export interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  avgLifetimeValue: number;
  avgVisits: number;
}

export interface BookingPattern {
  patternType: string;
  patternKey: string;
  avgBookings: number;
  avgRevenue: number;
  avgOccupancyRate: number;
  peakScore: number;
  suggestedStaffCount?: number;
  suggestedPriceModifier?: number;
}

export class AnalyticsService {
  private revenueService: RevenueService;
  private customerAnalyticsService: CustomerAnalyticsService;
  private reviewAnalyticsService: ReviewAnalyticsService;

  constructor() {
    this.revenueService = new RevenueService();
    this.customerAnalyticsService = new CustomerAnalyticsService();
    this.reviewAnalyticsService = new ReviewAnalyticsService();
  }

  // Get statistics for a specific period
  async getPeriodStatistics(
    providerId: string,
    startDate: Date,
    endDate: Date,
    period: string
  ): Promise<PeriodStatistics> {
    // First try to get from cache
    // const cacheKey = `${providerId}-${format(startDate, 'yyyy-MM-dd')}-${period}`; // Commented out to suppress unused variable warning
    
    const { data: cachedData } = await supabase
      .from('provider_analytics_cache')
      .select('*')
      .eq('provider_id', providerId)
      .eq('metric_date', format(startDate, 'yyyy-MM-dd'))
      .eq('period_type', period)
      .single();

    if (cachedData) {
      return {
        totalBookings: cachedData.total_bookings,
        completedBookings: cachedData.completed_bookings,
        cancelledBookings: cachedData.cancelled_bookings,
        noShowBookings: cachedData.no_show_bookings,
        grossRevenue: Number(cachedData.gross_revenue),
        netRevenue: Number(cachedData.net_revenue),
        platformFees: Number(cachedData.platform_fees),
        refunds: Number(cachedData.refunds || 0),
        uniqueCustomers: cachedData.unique_customers,
        newCustomers: cachedData.new_customers,
        returningCustomers: cachedData.returning_customers,
        avgRating: Number(cachedData.avg_rating || 0),
        totalReviews: cachedData.total_reviews,
        fiveStarReviews: cachedData.five_star_reviews,
        avgBookingDuration: cachedData.avg_booking_duration,
        totalServiceHours: Number(cachedData.total_service_hours || 0)
      };
    }

    // Calculate from raw data if not cached
    return await this.calculatePeriodStatistics(providerId, startDate, endDate, period);
  }

  private async calculatePeriodStatistics(
    providerId: string,
    startDate: Date,
    endDate: Date,
    period: string
  ): Promise<PeriodStatistics> {
    // Get booking metrics
    const { data: bookingData } = await supabase
      .from('bookings')
      .select(`
        *,
        users!inner(id),
        services!inner(duration_minutes)
      `)
      .eq('provider_id', providerId)
      .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
      .lte('booking_date', format(endDate, 'yyyy-MM-dd'));

    // Get review metrics
    const { data: reviewData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('provider_id', providerId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Calculate metrics
    const totalBookings = bookingData?.length || 0;
    const completedBookings = bookingData?.filter(b => b.status === 'completed').length || 0;
    const cancelledBookings = bookingData?.filter(b => b.status === 'cancelled').length || 0;
    const noShowBookings = bookingData?.filter(b => b.status === 'no_show').length || 0;
    
    const grossRevenue = bookingData?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;
    const netRevenue = bookingData?.reduce((sum, b) => sum + Number(b.provider_earnings || 0), 0) || 0;
    const platformFees = bookingData?.reduce((sum, b) => sum + Number(b.platform_fee || 0), 0) || 0;

    const uniqueCustomers = new Set(bookingData?.map(b => b.user_id) || []).size;
    
    // Calculate new vs returning customers
    const customerFirstBookings = new Map();
    bookingData?.forEach(booking => {
      const customerId = booking.user_id;
      if (!customerFirstBookings.has(customerId) || 
          new Date(booking.booking_date) < customerFirstBookings.get(customerId)) {
        customerFirstBookings.set(customerId, new Date(booking.booking_date));
      }
    });

    const newCustomers = Array.from(customerFirstBookings.values())
      .filter(date => date >= startDate && date <= endDate).length;
    const returningCustomers = uniqueCustomers - newCustomers;

    // Review metrics
    const totalReviews = reviewData?.length || 0;
    const avgRating = totalReviews > 0 && reviewData
      ? reviewData.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0;
    const fiveStarReviews = reviewData?.filter(r => r.rating === 5).length || 0;

    // Duration metrics
    const avgBookingDuration = completedBookings > 0
      ? bookingData
          ?.filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (b.services?.duration_minutes || 0), 0) / completedBookings
      : 0;

    const totalServiceHours = (avgBookingDuration * completedBookings) / 60;

    const stats: PeriodStatistics = {
      totalBookings,
      completedBookings,
      cancelledBookings,
      noShowBookings,
      grossRevenue,
      netRevenue,
      platformFees,
      refunds: 0, // Would need to implement refunds tracking
      uniqueCustomers,
      newCustomers,
      returningCustomers,
      avgRating,
      totalReviews,
      fiveStarReviews,
      avgBookingDuration,
      totalServiceHours
    };

    // Cache the results
    await this.cacheStatistics(providerId, startDate, period, stats);

    return stats;
  }

  private async cacheStatistics(
    providerId: string,
    date: Date,
    period: string,
    stats: PeriodStatistics
  ): Promise<void> {
    await supabase
      .from('provider_analytics_cache')
      .upsert({
        provider_id: providerId,
        metric_date: format(date, 'yyyy-MM-dd'),
        period_type: period,
        total_bookings: stats.totalBookings,
        completed_bookings: stats.completedBookings,
        cancelled_bookings: stats.cancelledBookings,
        no_show_bookings: stats.noShowBookings,
        gross_revenue: stats.grossRevenue,
        net_revenue: stats.netRevenue,
        platform_fees: stats.platformFees,
        refunds: stats.refunds,
        unique_customers: stats.uniqueCustomers,
        new_customers: stats.newCustomers,
        returning_customers: stats.returningCustomers,
        avg_rating: stats.avgRating,
        total_reviews: stats.totalReviews,
        five_star_reviews: stats.fiveStarReviews,
        avg_booking_duration: stats.avgBookingDuration,
        total_service_hours: stats.totalServiceHours
      });
  }

  // Calculate growth metrics by comparing two periods
  calculateGrowth(current: PeriodStatistics, previous: PeriodStatistics): GrowthMetrics {
    const calculatePercentageGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      bookingsGrowth: calculatePercentageGrowth(current.totalBookings, previous.totalBookings),
      revenueGrowth: calculatePercentageGrowth(current.grossRevenue, previous.grossRevenue),
      customersGrowth: calculatePercentageGrowth(current.uniqueCustomers, previous.uniqueCustomers),
      ratingGrowth: calculatePercentageGrowth(current.avgRating, previous.avgRating),
      efficiencyGrowth: calculatePercentageGrowth(current.totalServiceHours, previous.totalServiceHours)
    };
  }

  // Get service performance metrics
  async getServicePerformance(
    providerId: string,
    startDate: Date,
    endDate: Date,
    limit: number,
    sortBy: string
  ): Promise<ServicePerformance[]> {
    const { data: serviceMetrics } = await supabase
      .from('service_performance_metrics')
      .select(`
        *,
        services!inner(name_en, name_ar)
      `)
      .eq('provider_id', providerId)
      .gte('metric_date', format(startDate, 'yyyy-MM-dd'))
      .lte('metric_date', format(endDate, 'yyyy-MM-dd'))
      .order(sortBy === 'revenue' ? 'revenue_total' : 'bookings_count', { ascending: false })
      .limit(limit);

    return serviceMetrics?.map(metric => ({
      serviceId: metric.service_id,
      serviceName: metric.services.name_en,
      serviceNameAr: metric.services.name_ar,
      bookingsCount: metric.bookings_count,
      completedCount: metric.completed_count,
      revenue: Number(metric.revenue_total),
      avgRating: Number(metric.avg_rating || 0),
      rebookingRate: Number(metric.rebooking_rate || 0),
      onTimeRate: Number(metric.on_time_rate || 0),
      popularityRank: metric.popularity_rank,
      revenueRank: metric.revenue_rank
    })) || [];
  }

  // Get customer segments
  async getCustomerSegments(providerId: string): Promise<CustomerSegment[]> {
    const { data: segments } = await supabase
      .from('customer_retention_metrics')
      .select(`
        segment,
        total_visits,
        total_spent,
        lifetime_value
      `)
      .eq('provider_id', providerId);

    if (!segments) return [];

    const segmentCounts = segments.reduce((acc, customer) => {
      const segment = customer.segment || 'new';
      if (!acc[segment]) {
        acc[segment] = {
          count: 0,
          totalSpent: 0,
          totalVisits: 0,
          totalLifetimeValue: 0
        };
      }
      acc[segment].count++;
      acc[segment].totalSpent += Number(customer.total_spent || 0);
      acc[segment].totalVisits += customer.total_visits || 0;
      acc[segment].totalLifetimeValue += Number(customer.lifetime_value || 0);
      return acc;
    }, {} as any);

    const totalCustomers = segments.length;

    return Object.entries(segmentCounts).map(([segment, data]: [string, any]) => ({
      segment,
      count: data.count,
      percentage: (data.count / totalCustomers) * 100,
      avgLifetimeValue: data.totalLifetimeValue / data.count,
      avgVisits: data.totalVisits / data.count
    }));
  }

  // Get booking patterns for optimization
  async getBookingPatterns(providerId: string): Promise<BookingPattern[]> {
    const { data: patterns } = await supabase
      .from('booking_patterns')
      .select('*')
      .eq('provider_id', providerId)
      .order('peak_score', { ascending: false });

    return patterns?.map(pattern => ({
      patternType: pattern.pattern_type,
      patternKey: pattern.pattern_key,
      avgBookings: Number(pattern.avg_bookings),
      avgRevenue: Number(pattern.avg_revenue),
      avgOccupancyRate: Number(pattern.avg_occupancy_rate),
      peakScore: Number(pattern.peak_score),
      suggestedStaffCount: pattern.suggested_staff_count,
      suggestedPriceModifier: Number(pattern.suggested_price_modifier)
    })) || [];
  }

  // Get review insights with sentiment analysis
  async getReviewInsights(providerId: string) {
    return await this.reviewAnalyticsService.getReviewAnalytics(providerId);
  }

  // Check and award achievements
  async checkAndAwardAchievements(providerId: string): Promise<string[]> {
    try {
      const { data: achievements } = await supabase
        .rpc('check_provider_achievements', { p_provider_id: providerId });
      
      return achievements || [];
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  // Get revenue report with detailed breakdown
  async getRevenueReport(
    providerId: string,
    startDate: Date,
    endDate: Date,
    groupBy: string
  ) {
    const summary = await this.revenueService.getRevenueSummary(providerId, startDate, endDate);
    const timeline = await this.revenueService.getRevenueTimeline(providerId, startDate, endDate, groupBy as any);

    return {
      summary,
      timeline
    };
  }

  // Additional methods for other analytics features
  async getStatisticsTrends(_providerId: string, _startDate: Date, _endDate: Date) {
    // Implementation for trends analysis
    return {};
  }

  async getRetentionMetrics(providerId: string, startDate: Date, endDate: Date) {
    return await this.customerAnalyticsService.getRetentionMetrics(providerId, startDate, endDate);
  }

  async getCustomerLifetimeValues(providerId: string) {
    return await this.customerAnalyticsService.getCustomerLifetimeValues(providerId);
  }

  async getChurnRiskCustomers(providerId: string, includeChurned: boolean) {
    return await this.customerAnalyticsService.getChurnRiskCustomers(providerId, includeChurned);
  }

  async getTopCustomers(providerId: string, limit: number) {
    return await this.customerAnalyticsService.getCustomerLifetimeValues(providerId, limit);
  }

  async getCustomerAcquisitionChannels(providerId: string, startDate: Date, endDate: Date) {
    return await this.customerAnalyticsService.getAcquisitionChannels(providerId, startDate, endDate);
  }

  async getServiceRevenueBreakdown(providerId: string, startDate: Date, endDate: Date) {
    return await this.revenueService.getServiceRevenueBreakdown(providerId, startDate, endDate);
  }

  async getPaymentMethodBreakdown(providerId: string, startDate: Date, endDate: Date) {
    return await this.revenueService.getPaymentMethodBreakdown(providerId, startDate, endDate);
  }

  async getTaxReport(providerId: string, startDate: Date, endDate: Date) {
    return await this.revenueService.getTaxReport(providerId, startDate, endDate);
  }

  async getPendingPayouts(providerId: string) {
    return await this.revenueService.getPendingPayouts(providerId);
  }

  async getServiceComparisons(_providerId: string, _startDate: Date, _endDate: Date) {
    // Implementation for service performance comparisons
    return {};
  }

  async getUnderperformingServices(_providerId: string, _startDate: Date, _endDate: Date) {
    // Implementation for underperforming services
    return [];
  }

  async getServiceRecommendations(_providerId: string) {
    // Implementation for service recommendations
    return [];
  }

  async getPeakHours(_providerId: string) {
    // Implementation for peak hours analysis
    return {};
  }

  async getSeasonalTrends(_providerId: string) {
    // Implementation for seasonal trends
    return {};
  }

  async getCompetitorAnalysis(_providerId: string) {
    // Implementation for competitor analysis
    return {};
  }

  async getImprovementSuggestions(providerId: string) {
    return await performanceInsightsService.getOptimizationSuggestions(providerId);
  }

  async getProviderAchievements(_providerId: string) {
    // This would be handled by the gamification service
    return [];
  }

  async getLeaderboard(_providerId: string) {
    // This would be handled by the gamification service
    return {};
  }

  async exportData(
    _providerId: string,
    _dataType: string,
    _startDate: Date,
    _endDate: Date,
    _format: string
  ) {
    // Implementation for data export
    return '';
  }
}