import { supabase } from '../config/supabase-simple';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

export interface RevenueSummary {
  totalRevenue: number;
  netRevenue: number;
  platformFees: number;
  refunds: number;
  cashRevenue: number;
  cardRevenue: number;
  walletRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  tipRevenue: number;
  profitMargin: number;
  averageOrderValue: number;
  totalTransactions: number;
}

export interface RevenueTimeline {
  date: string;
  revenue: number;
  fees: number;
  net: number;
  transactions: number;
}

export interface ServiceRevenueBreakdown {
  serviceId: string;
  serviceName: string;
  serviceNameAr: string;
  revenue: number;
  percentage: number;
  bookingsCount: number;
  averagePrice: number;
  growth: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  revenue: number;
  percentage: number;
  transactionCount: number;
  averageValue: number;
}

export interface RevenueProjection {
  projectedRevenue: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

export interface TaxReport {
  totalIncome: number;
  deductibleExpenses: number;
  taxableIncome: number;
  estimatedTax: number;
  vatCollected: number;
  quarterlyBreakdown: Array<{
    quarter: string;
    income: number;
    tax: number;
  }>;
}

export class RevenueService {

  // Generate comprehensive revenue summary for a period
  async getRevenueSummary(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueSummary> {
    // Get revenue summaries from cache first
    const { data: summaries } = await supabase
      .from('revenue_summaries')
      .select('*')
      .eq('provider_id', providerId)
      .gte('summary_date', format(startDate, 'yyyy-MM-dd'))
      .lte('summary_date', format(endDate, 'yyyy-MM-dd'));

    if (summaries && summaries.length > 0) {
      return this.calculateSummaryFromCache(summaries);
    }

    // Calculate from bookings if no cache
    return await this.calculateRevenueFromBookings(providerId, startDate, endDate);
  }

  private calculateSummaryFromCache(summaries: any[]): RevenueSummary {
    const totalRevenue = summaries.reduce((sum, s) => sum + Number(s.total_revenue), 0);
    const netRevenue = summaries.reduce((sum, s) => sum + Number(s.net_revenue), 0);
    const platformFees = summaries.reduce((sum, s) => sum + Number(s.platform_fees), 0);
    const refunds = summaries.reduce((sum, s) => sum + Number(s.refunds), 0);
    const cashRevenue = summaries.reduce((sum, s) => sum + Number(s.cash_revenue), 0);
    const cardRevenue = summaries.reduce((sum, s) => sum + Number(s.card_revenue), 0);
    const walletRevenue = summaries.reduce((sum, s) => sum + Number(s.wallet_revenue), 0);
    const serviceRevenue = summaries.reduce((sum, s) => sum + Number(s.service_revenue), 0);
    const productRevenue = summaries.reduce((sum, s) => sum + Number(s.product_revenue), 0);
    const tipRevenue = summaries.reduce((sum, s) => sum + Number(s.tip_revenue), 0);

    const totalTransactions = summaries.length; // Simplified - would need actual transaction count
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const profitMargin = totalRevenue > 0 ? (netRevenue / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      netRevenue,
      platformFees,
      refunds,
      cashRevenue,
      cardRevenue,
      walletRevenue,
      serviceRevenue,
      productRevenue,
      tipRevenue,
      profitMargin,
      averageOrderValue,
      totalTransactions
    };
  }

  private async calculateRevenueFromBookings(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueSummary> {
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        total_price,
        provider_earnings,
        platform_fee,
        payment_method,
        status
      `)
      .eq('provider_id', providerId)
      .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
      .lte('booking_date', format(endDate, 'yyyy-MM-dd'))
      .eq('status', 'completed');

    if (!bookings) {
      return this.getEmptyRevenueSummary();
    }

    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
    const netRevenue = bookings.reduce((sum, b) => sum + Number(b.provider_earnings || 0), 0);
    const platformFees = bookings.reduce((sum, b) => sum + Number(b.platform_fee || 0), 0);

    // Group by payment method
    const paymentBreakdown = bookings.reduce((acc, booking) => {
      const method = booking.payment_method || 'cash';
      const amount = Number(booking.total_price || 0);
      acc[method] = (acc[method] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    const totalTransactions = bookings.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const profitMargin = totalRevenue > 0 ? (netRevenue / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      netRevenue,
      platformFees,
      refunds: 0, // Would need refunds tracking
      cashRevenue: paymentBreakdown.cash || 0,
      cardRevenue: paymentBreakdown.card || 0,
      walletRevenue: paymentBreakdown.wallet || 0,
      serviceRevenue: totalRevenue, // Assuming all revenue is from services for now
      productRevenue: 0,
      tipRevenue: 0,
      profitMargin,
      averageOrderValue,
      totalTransactions
    };
  }

  private getEmptyRevenueSummary(): RevenueSummary {
    return {
      totalRevenue: 0,
      netRevenue: 0,
      platformFees: 0,
      refunds: 0,
      cashRevenue: 0,
      cardRevenue: 0,
      walletRevenue: 0,
      serviceRevenue: 0,
      productRevenue: 0,
      tipRevenue: 0,
      profitMargin: 0,
      averageOrderValue: 0,
      totalTransactions: 0
    };
  }

  // Generate revenue timeline with specified grouping
  async getRevenueTimeline(
    providerId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<RevenueTimeline[]> {
    let intervals: Date[];
    
    switch (groupBy) {
      case 'day':
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
        break;
      case 'week':
        intervals = eachWeekOfInterval({ start: startDate, end: endDate });
        break;
      case 'month':
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
        break;
    }

    const timeline: RevenueTimeline[] = [];

    for (const date of intervals) {
      const periodStart = groupBy === 'day' ? startOfDay(date) :
                         groupBy === 'week' ? startOfWeek(date) :
                         startOfMonth(date);
      const periodEnd = groupBy === 'day' ? endOfDay(date) :
                       groupBy === 'week' ? endOfWeek(date) :
                       endOfMonth(date);

      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_price, platform_fee, provider_earnings')
        .eq('provider_id', providerId)
        .gte('booking_date', format(periodStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(periodEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed');

      const revenue = bookings?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0;
      const fees = bookings?.reduce((sum, b) => sum + Number(b.platform_fee || 0), 0) || 0;
      const net = bookings?.reduce((sum, b) => sum + Number(b.provider_earnings || 0), 0) || 0;
      const transactions = bookings?.length || 0;

      timeline.push({
        date: format(date, 'yyyy-MM-dd'),
        revenue,
        fees,
        net,
        transactions
      });
    }

    return timeline;
  }

  // Get service revenue breakdown
  async getServiceRevenueBreakdown(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ServiceRevenueBreakdown[]> {
    const { data: serviceRevenue } = await supabase
      .from('bookings')
      .select(`
        total_price,
        services!inner(id, name_en, name_ar)
      `)
      .eq('provider_id', providerId)
      .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
      .lte('booking_date', format(endDate, 'yyyy-MM-dd'))
      .eq('status', 'completed');

    if (!serviceRevenue) return [];

    // Group by service
    const serviceGroups = serviceRevenue.reduce((acc, booking) => {
      const serviceId = booking.services.id;
      if (!acc[serviceId]) {
        acc[serviceId] = {
          serviceId,
          serviceName: booking.services.name_en,
          serviceNameAr: booking.services.name_ar,
          revenue: 0,
          bookingsCount: 0,
          totalPrice: 0
        };
      }
      acc[serviceId].revenue += Number(booking.total_price || 0);
      acc[serviceId].bookingsCount += 1;
      acc[serviceId].totalPrice += Number(booking.total_price || 0);
      return acc;
    }, {} as Record<string, any>);

    const totalRevenue = Object.values(serviceGroups).reduce((sum: number, group: any) => sum + group.revenue, 0);

    // Convert to array and calculate percentages
    return Object.values(serviceGroups).map((group: any) => ({
      serviceId: group.serviceId,
      serviceName: group.serviceName,
      serviceNameAr: group.serviceNameAr,
      revenue: group.revenue,
      percentage: totalRevenue > 0 ? (group.revenue / totalRevenue) * 100 : 0,
      bookingsCount: group.bookingsCount,
      averagePrice: group.bookingsCount > 0 ? group.totalPrice / group.bookingsCount : 0,
      growth: 0 // Would need historical data to calculate growth
    }));
  }

  // Get payment method breakdown
  async getPaymentMethodBreakdown(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PaymentMethodBreakdown[]> {
    const { data: payments } = await supabase
      .from('bookings')
      .select('total_price, payment_method')
      .eq('provider_id', providerId)
      .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
      .lte('booking_date', format(endDate, 'yyyy-MM-dd'))
      .eq('status', 'completed');

    if (!payments) return [];

    const methodGroups = payments.reduce((acc, payment) => {
      const method = payment.payment_method || 'cash';
      if (!acc[method]) {
        acc[method] = {
          revenue: 0,
          transactionCount: 0
        };
      }
      acc[method].revenue += Number(payment.total_price || 0);
      acc[method].transactionCount += 1;
      return acc;
    }, {} as Record<string, any>);

    const totalRevenue = Object.values(methodGroups).reduce((sum: number, group: any) => sum + group.revenue, 0);

    return Object.entries(methodGroups).map(([method, data]: [string, any]) => ({
      method,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      transactionCount: data.transactionCount,
      averageValue: data.transactionCount > 0 ? data.revenue / data.transactionCount : 0
    }));
  }

  // Generate tax report
  async getTaxReport(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TaxReport> {
    const summary = await this.getRevenueSummary(providerId, startDate, endDate);
    
    // Tax calculations for Jordan (simplified)
    const taxRate = 0.16; // 16% income tax rate in Jordan
    const vatRate = 0.16; // 16% VAT rate
    
    const totalIncome = summary.totalRevenue;
    const deductibleExpenses = summary.platformFees; // Simplified - would include other business expenses
    const taxableIncome = totalIncome - deductibleExpenses;
    const estimatedTax = taxableIncome * taxRate;
    const vatCollected = totalIncome * vatRate;

    // Generate quarterly breakdown
    const quarterlyBreakdown = await this.generateQuarterlyBreakdown(providerId, startDate, endDate);

    return {
      totalIncome,
      deductibleExpenses,
      taxableIncome,
      estimatedTax,
      vatCollected,
      quarterlyBreakdown
    };
  }

  private async generateQuarterlyBreakdown(
    providerId: string,
    startDate: Date,
    endDate: Date
  ) {
    // Simplified quarterly breakdown - would need more sophisticated logic
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const breakdown = [];

    for (const quarter of quarters) {
      // This is a simplified implementation
      // In reality, you'd calculate actual quarterly dates and revenue
      breakdown.push({
        quarter,
        income: 0, // Would calculate actual quarterly income
        tax: 0     // Would calculate actual quarterly tax
      });
    }

    return breakdown;
  }

  // Get pending payouts
  async getPendingPayouts(providerId: string) {
    const { data: pendingPayouts } = await supabase
      .from('revenue_summaries')
      .select('*')
      .eq('provider_id', providerId)
      .eq('payout_status', 'pending')
      .order('summary_date', { ascending: true });

    if (!pendingPayouts) return [];

    const totalPending = pendingPayouts.reduce((sum, payout) => sum + Number(payout.net_revenue), 0);
    const oldestPending = pendingPayouts[0]?.summary_date;

    return {
      totalAmount: totalPending,
      payoutCount: pendingPayouts.length,
      oldestDate: oldestPending,
      details: pendingPayouts.map(payout => ({
        date: payout.summary_date,
        amount: Number(payout.net_revenue),
        fees: Number(payout.platform_fees),
        paymentMethod: 'bank_transfer' // Would come from provider settings
      }))
    };
  }

  // Project future revenue based on historical data
  async getRevenueProjection(
    providerId: string,
    projectionDays: number = 30
  ): Promise<RevenueProjection> {
    // Get historical data for the last 90 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const historicalRevenue = await this.getRevenueTimeline(providerId, startDate, endDate, 'day');
    
    if (historicalRevenue.length === 0) {
      return {
        projectedRevenue: 0,
        confidence: 0,
        factors: ['Insufficient historical data'],
        recommendations: ['Complete more bookings to improve projection accuracy']
      };
    }

    // Simple linear regression for projection
    const avgDailyRevenue = historicalRevenue.reduce((sum, day) => sum + day.revenue, 0) / historicalRevenue.length;
    const projectedRevenue = avgDailyRevenue * projectionDays;
    
    // Calculate confidence based on revenue consistency
    const variance = historicalRevenue.reduce((sum, day) => {
      return sum + Math.pow(day.revenue - avgDailyRevenue, 2);
    }, 0) / historicalRevenue.length;
    
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = avgDailyRevenue > 0 ? standardDeviation / avgDailyRevenue : 1;
    const confidence = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));

    const factors = [
      'Historical booking patterns',
      'Seasonal trends',
      'Service popularity'
    ];

    const recommendations = [
      'Focus on high-revenue services',
      'Optimize booking schedule for peak hours',
      'Consider promotional campaigns for slow periods'
    ];

    return {
      projectedRevenue,
      confidence,
      factors,
      recommendations
    };
  }

  // Cache revenue data for faster dashboard loading
  async cacheRevenueSummary(
    providerId: string,
    date: Date,
    summary: RevenueSummary
  ): Promise<void> {
    await supabase
      .from('revenue_summaries')
      .upsert({
        provider_id: providerId,
        summary_date: format(date, 'yyyy-MM-dd'),
        total_revenue: summary.totalRevenue,
        net_revenue: summary.netRevenue,
        platform_fees: summary.platformFees,
        cash_revenue: summary.cashRevenue,
        card_revenue: summary.cardRevenue,
        wallet_revenue: summary.walletRevenue,
        service_revenue: summary.serviceRevenue,
        product_revenue: summary.productRevenue,
        tip_revenue: summary.tipRevenue,
        refunds: summary.refunds
      });
  }

  // Update real-time revenue metrics
  async updateRealtimeRevenue(
    providerId: string,
    bookingAmount: number,
    paymentMethod: string
  ): Promise<void> {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Update revenue summary for today
    const { data: todaySummary } = await supabase
      .from('revenue_summaries')
      .select('*')
      .eq('provider_id', providerId)
      .eq('summary_date', today)
      .single();

    const currentRevenue = todaySummary ? Number(todaySummary.total_revenue) : 0;
    const newTotalRevenue = currentRevenue + bookingAmount;

    await supabase
      .from('revenue_summaries')
      .upsert({
        provider_id: providerId,
        summary_date: today,
        total_revenue: newTotalRevenue,
        [`${paymentMethod}_revenue`]: (todaySummary?.[`${paymentMethod}_revenue`] || 0) + bookingAmount
      });

    // Update real-time metrics
    await supabase
      .from('provider_realtime_metrics')
      .upsert({
        provider_id: providerId,
        todays_revenue: newTotalRevenue,
        last_updated: new Date().toISOString()
      });
  }
}