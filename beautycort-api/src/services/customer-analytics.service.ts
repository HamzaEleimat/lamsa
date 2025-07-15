import { supabase } from '../config/supabase-simple';
import { format, differenceInDays, differenceInMonths } from 'date-fns';

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  activeCustomers: number;
  churnedCustomers: number;
  avgLifetimeValue: number;
  avgVisitsPerCustomer: number;
  retentionRate: number;
  churnRate: number;
}

export interface CustomerSegment {
  segment: 'new' | 'regular' | 'vip' | 'at_risk' | 'lost';
  count: number;
  percentage: number;
  avgLifetimeValue: number;
  avgVisits: number;
  lastVisitDays: number;
  characteristics: string[];
}

export interface CustomerLifetimeValue {
  customerId: string;
  customerName: string;
  totalSpent: number;
  totalVisits: number;
  avgOrderValue: number;
  lifetimeValue: number;
  predictedValue: number;
  segment: string;
  firstVisit: string;
  lastVisit: string;
  daysSinceLastVisit: number;
  favoriteService?: string;
  churnRisk: number;
}

export interface RetentionMetrics {
  period: string;
  cohortSize: number;
  retainedCustomers: number;
  retentionRate: number;
  repeatPurchaseRate: number;
  avgTimeBetweenVisits: number;
}

export interface ChurnRiskCustomer {
  customerId: string;
  customerName: string;
  lastVisit: string;
  daysSinceLastVisit: number;
  totalSpent: number;
  totalVisits: number;
  churnProbability: number;
  riskFactors: string[];
  recommendedActions: string[];
}

export interface CustomerPreferences {
  customerId: string;
  customerName: string;
  favoriteServices: Array<{
    serviceId: string;
    serviceName: string;
    bookingCount: number;
  }>;
  preferredTimeSlots: Array<{
    timeSlot: string;
    frequency: number;
  }>;
  preferredDays: Array<{
    dayOfWeek: number;
    frequency: number;
  }>;
  avgBookingValue: number;
  seasonalPatterns: string[];
}

export interface AcquisitionChannel {
  channel: string;
  newCustomers: number;
  totalRevenue: number;
  avgCustomerValue: number;
  conversionRate: number;
  costPerAcquisition?: number;
  lifetimeValueRatio?: number;
}

export class CustomerAnalyticsService {

  // Get comprehensive customer metrics for a period
  async getCustomerMetrics(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CustomerMetrics> {
    // Get all customers who had bookings in the period
    const { data: periodBookings } = await supabase
      .from('bookings')
      .select('user_id, total_price, booking_date, status')
      .eq('provider_id', providerId)
      .gte('booking_date', format(startDate, 'yyyy-MM-dd'))
      .lte('booking_date', format(endDate, 'yyyy-MM-dd'))
      .eq('status', 'completed');

    // Get all historical bookings for these customers to determine new vs returning
    const customerIds = [...new Set(periodBookings?.map(b => b.user_id) || [])];
    
    if (customerIds.length === 0) {
      return this.getEmptyCustomerMetrics();
    }

    const { data: allBookings } = await supabase
      .from('bookings')
      .select('user_id, total_price, booking_date, status')
      .eq('provider_id', providerId)
      .in('user_id', customerIds)
      .eq('status', 'completed')
      .order('booking_date', { ascending: true });

    // Calculate customer first booking dates
    const customerFirstBookings = new Map();
    allBookings?.forEach(booking => {
      const customerId = booking.user_id;
      if (!customerFirstBookings.has(customerId)) {
        customerFirstBookings.set(customerId, booking.booking_date);
      }
    });

    // Determine new vs returning customers
    const newCustomers = customerIds.filter(customerId => {
      const firstBooking = customerFirstBookings.get(customerId);
      return firstBooking && 
        new Date(firstBooking) >= startDate && 
        new Date(firstBooking) <= endDate;
    });

    const returningCustomers = customerIds.filter(customerId => {
      const firstBooking = customerFirstBookings.get(customerId);
      return firstBooking && new Date(firstBooking) < startDate;
    });

    // Calculate lifetime values
    const customerSpending = new Map();
    const customerVisits = new Map();
    
    allBookings?.forEach(booking => {
      const customerId = booking.user_id;
      customerSpending.set(customerId, (customerSpending.get(customerId) || 0) + Number(booking.total_price));
      customerVisits.set(customerId, (customerVisits.get(customerId) || 0) + 1);
    });

    const totalSpent = Array.from(customerSpending.values()).reduce((sum, spent) => sum + spent, 0);
    const totalVisits = Array.from(customerVisits.values()).reduce((sum, visits) => sum + visits, 0);
    const avgLifetimeValue = customerIds.length > 0 ? totalSpent / customerIds.length : 0;
    const avgVisitsPerCustomer = customerIds.length > 0 ? totalVisits / customerIds.length : 0;

    // Calculate retention and churn (simplified)
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
    const previousPeriodEnd = new Date(endDate);
    previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

    const { data: previousPeriodCustomers } = await supabase
      .from('bookings')
      .select('user_id')
      .eq('provider_id', providerId)
      .gte('booking_date', format(previousPeriodStart, 'yyyy-MM-dd'))
      .lte('booking_date', format(previousPeriodEnd, 'yyyy-MM-dd'))
      .eq('status', 'completed');

    const previousCustomerIds = new Set(previousPeriodCustomers?.map(b => b.user_id) || []);
    const currentCustomerIds = new Set(customerIds);
    
    const retainedCustomers = Array.from(previousCustomerIds).filter(id => currentCustomerIds.has(id));
    const retentionRate = previousCustomerIds.size > 0 ? (retainedCustomers.length / previousCustomerIds.size) * 100 : 0;
    const churnRate = 100 - retentionRate;

    return {
      totalCustomers: customerIds.length,
      newCustomers: newCustomers.length,
      returningCustomers: returningCustomers.length,
      activeCustomers: customerIds.length, // All customers with bookings in period are considered active
      churnedCustomers: previousCustomerIds.size - retainedCustomers.length,
      avgLifetimeValue,
      avgVisitsPerCustomer,
      retentionRate,
      churnRate
    };
  }

  private getEmptyCustomerMetrics(): CustomerMetrics {
    return {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      activeCustomers: 0,
      churnedCustomers: 0,
      avgLifetimeValue: 0,
      avgVisitsPerCustomer: 0,
      retentionRate: 0,
      churnRate: 0
    };
  }

  // Get customer segmentation based on behavior and value
  async getCustomerSegmentation(providerId: string): Promise<CustomerSegment[]> {
    const { data: customerMetrics } = await supabase
      .from('customer_retention_metrics')
      .select('*')
      .eq('provider_id', providerId);

    if (!customerMetrics || customerMetrics.length === 0) {
      return [];
    }

    // Group customers by segment
    const segmentGroups = customerMetrics.reduce((acc, customer) => {
      const segment = customer.segment || 'new';
      if (!acc[segment]) {
        acc[segment] = [];
      }
      acc[segment].push(customer);
      return acc;
    }, {} as Record<string, any[]>);

    const totalCustomers = customerMetrics.length;

    return Object.entries(segmentGroups).map(([segment, customers]) => {
      const avgLifetimeValue = customers.reduce((sum, c: any) => sum + Number(c.lifetime_value || 0), 0) / customers.length;
      const avgVisits = customers.reduce((sum, c: any) => sum + (c.total_visits || 0), 0) / customers.length;
      const avgLastVisitDays = customers.reduce((sum, c: any) => {
        const lastVisit = new Date(c.last_visit_date);
        const daysSince = differenceInDays(new Date(), lastVisit);
        return sum + daysSince;
      }, 0) / customers.length;

      const characteristics = this.getSegmentCharacteristics(segment as any);

      return {
        segment: segment as any,
        count: customers.length,
        percentage: (customers.length / totalCustomers) * 100,
        avgLifetimeValue,
        avgVisits,
        lastVisitDays: avgLastVisitDays,
        characteristics
      };
    });
  }

  private getSegmentCharacteristics(segment: string): string[] {
    const characteristics: Record<string, string[]> = {
      new: ['First-time customers', 'Recently acquired', 'High potential'],
      regular: ['Consistent bookings', 'Moderate spending', 'Loyal customers'],
      vip: ['High lifetime value', 'Frequent visits', 'Premium services'],
      at_risk: ['Declining frequency', 'Potential churn', 'Need attention'],
      lost: ['No recent activity', 'Churned customers', 'Reactivation needed']
    };

    return characteristics[segment] || ['Unknown segment'];
  }

  // Calculate customer lifetime values with predictions
  async getCustomerLifetimeValues(
    providerId: string,
    limit: number = 50
  ): Promise<CustomerLifetimeValue[]> {
    const { data: customers } = await supabase
      .from('customer_retention_metrics')
      .select(`
        customer_id,
        total_spent,
        total_visits,
        lifetime_value,
        segment,
        first_visit_date,
        last_visit_date,
        favorite_service_id,
        churn_risk_score,
        users!inner(name),
        services(name_en)
      `)
      .eq('provider_id', providerId)
      .order('lifetime_value', { ascending: false })
      .limit(limit);

    if (!customers) return [];

    return customers.map(customer => {
      const totalSpent = Number(customer.total_spent || 0);
      const totalVisits = customer.total_visits || 0;
      const avgOrderValue = totalVisits > 0 ? totalSpent / totalVisits : 0;
      const daysSinceLastVisit = differenceInDays(new Date(), new Date(customer.last_visit_date));
      
      // Simple CLV prediction based on historical spending and visit frequency
      const monthsActive = differenceInMonths(new Date(customer.last_visit_date), new Date(customer.first_visit_date)) || 1;
      const avgMonthlySpending = totalSpent / monthsActive;
      const predictedValue = avgMonthlySpending * 24; // 2-year prediction

      return {
        customerId: customer.customer_id,
        customerName: customer.users?.name || 'Unknown',
        totalSpent,
        totalVisits,
        avgOrderValue,
        lifetimeValue: Number(customer.lifetime_value || 0),
        predictedValue,
        segment: customer.segment || 'new',
        firstVisit: customer.first_visit_date,
        lastVisit: customer.last_visit_date,
        daysSinceLastVisit,
        favoriteService: customer.services?.name_en,
        churnRisk: Number(customer.churn_risk_score || 0)
      };
    });
  }

  // Get retention metrics by cohort
  async getRetentionMetrics(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RetentionMetrics[]> {
    // Get customers by first booking month (cohorts)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('user_id, booking_date, total_price')
      .eq('provider_id', providerId)
      .eq('status', 'completed')
      .order('booking_date', { ascending: true });

    if (!bookings) return [];

    // Group customers by first booking month
    const customerCohorts = new Map();
    const customerFirstBookings = new Map();

    bookings.forEach(booking => {
      const customerId = booking.user_id;
      const bookingDate = new Date(booking.booking_date);
      
      if (!customerFirstBookings.has(customerId)) {
        customerFirstBookings.set(customerId, bookingDate);
        const cohortMonth = format(bookingDate, 'yyyy-MM');
        
        if (!customerCohorts.has(cohortMonth)) {
          customerCohorts.set(cohortMonth, new Set());
        }
        customerCohorts.get(cohortMonth).add(customerId);
      }
    });

    // Calculate retention for each cohort
    const retentionMetrics: RetentionMetrics[] = [];

    for (const [cohortMonth, cohortCustomers] of customerCohorts.entries()) {
      const cohortStart = new Date(cohortMonth + '-01');
      const nextMonth = new Date(cohortStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Get bookings in the next month for cohort customers
      const { data: retentionBookings } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('provider_id', providerId)
        .in('user_id', Array.from(cohortCustomers))
        .gte('booking_date', format(nextMonth, 'yyyy-MM-dd'))
        .lt('booking_date', format(new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1), 'yyyy-MM-dd'))
        .eq('status', 'completed');

      const retainedCustomers = new Set(retentionBookings?.map(b => b.user_id) || []);
      const retentionRate = (retainedCustomers.size / cohortCustomers.size) * 100;

      retentionMetrics.push({
        period: cohortMonth,
        cohortSize: cohortCustomers.size,
        retainedCustomers: retainedCustomers.size,
        retentionRate,
        repeatPurchaseRate: retentionRate, // Simplified - same as retention for now
        avgTimeBetweenVisits: 30 // Placeholder - would need more complex calculation
      });
    }

    return retentionMetrics.filter(metric => {
      const metricDate = new Date(metric.period + '-01');
      return metricDate >= startDate && metricDate <= endDate;
    });
  }

  // Identify customers at risk of churning
  async getChurnRiskCustomers(
    providerId: string,
    includeChurned: boolean = false
  ): Promise<ChurnRiskCustomer[]> {
    const churnThreshold = includeChurned ? 0.0 : 0.7;

    const { data: riskCustomers } = await supabase
      .from('customer_retention_metrics')
      .select(`
        customer_id,
        last_visit_date,
        total_spent,
        total_visits,
        churn_risk_score,
        avg_days_between_visits,
        users!inner(name)
      `)
      .eq('provider_id', providerId)
      .gte('churn_risk_score', churnThreshold)
      .order('churn_risk_score', { ascending: false })
      .limit(100);

    if (!riskCustomers) return [];

    return riskCustomers.map(customer => {
      const daysSinceLastVisit = differenceInDays(new Date(), new Date(customer.last_visit_date));
      const riskFactors = this.identifyRiskFactors(customer, daysSinceLastVisit);
      const recommendedActions = this.getRetentionRecommendations(customer, riskFactors);

      return {
        customerId: customer.customer_id,
        customerName: customer.users?.name || 'Unknown',
        lastVisit: customer.last_visit_date,
        daysSinceLastVisit,
        totalSpent: Number(customer.total_spent || 0),
        totalVisits: customer.total_visits || 0,
        churnProbability: Number(customer.churn_risk_score || 0),
        riskFactors,
        recommendedActions
      };
    });
  }

  private identifyRiskFactors(customer: any, daysSinceLastVisit: number): string[] {
    const factors: string[] = [];
    
    if (daysSinceLastVisit > 60) {
      factors.push('Long time since last visit');
    }
    
    if (customer.avg_days_between_visits && daysSinceLastVisit > customer.avg_days_between_visits * 2) {
      factors.push('Visit frequency declined');
    }
    
    if (customer.total_visits < 3) {
      factors.push('Low engagement level');
    }
    
    if (Number(customer.total_spent) < 100) {
      factors.push('Low spending history');
    }

    return factors;
  }

  private getRetentionRecommendations(_customer: any, riskFactors: string[]): string[] {
    const recommendations: string[] = [];
    
    if (riskFactors.includes('Long time since last visit')) {
      recommendations.push('Send personalized win-back offer');
      recommendations.push('Check satisfaction with last service');
    }
    
    if (riskFactors.includes('Low engagement level')) {
      recommendations.push('Offer loyalty program enrollment');
      recommendations.push('Provide service recommendations');
    }
    
    if (riskFactors.includes('Low spending history')) {
      recommendations.push('Offer package deals');
      recommendations.push('Introduce budget-friendly services');
    }

    return recommendations;
  }

  // Get customer preferences and behavior patterns
  async getCustomerPreferences(
    providerId: string,
    customerId: string
  ): Promise<CustomerPreferences | null> {
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        service_id,
        booking_date,
        start_time,
        total_price,
        services!inner(name_en)
      `)
      .eq('provider_id', providerId)
      .eq('user_id', customerId)
      .eq('status', 'completed');

    if (!bookings || bookings.length === 0) return null;

    const { data: customer } = await supabase
      .from('users')
      .select('name')
      .eq('id', customerId)
      .single();

    // Analyze favorite services
    const serviceFrequency = bookings.reduce((acc, booking) => {
      const serviceId = booking.service_id;
      if (!acc[serviceId]) {
        acc[serviceId] = {
          serviceId,
          serviceName: booking.services?.name_en || 'Unknown Service',
          bookingCount: 0
        };
      }
      acc[serviceId].bookingCount++;
      return acc;
    }, {} as Record<string, any>);

    const favoriteServices = Object.values(serviceFrequency)
      .sort((a: any, b: any) => b.bookingCount - a.bookingCount)
      .slice(0, 5);

    // Analyze preferred time slots
    const timeSlotFrequency = bookings.reduce((acc, booking) => {
      const hour = parseInt(booking.start_time.split(':')[0]);
      const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      acc[timeSlot] = (acc[timeSlot] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const preferredTimeSlots = Object.entries(timeSlotFrequency)
      .map(([timeSlot, frequency]) => ({ timeSlot, frequency }))
      .sort((a, b) => b.frequency - a.frequency);

    // Analyze preferred days
    const dayFrequency = bookings.reduce((acc, booking) => {
      const dayOfWeek = new Date(booking.booking_date).getDay();
      acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const preferredDays = Object.entries(dayFrequency)
      .map(([day, frequency]) => ({ dayOfWeek: parseInt(day), frequency }))
      .sort((a, b) => b.frequency - a.frequency);

    const avgBookingValue = bookings.reduce((sum, b) => sum + Number(b.total_price), 0) / bookings.length;

    return {
      customerId,
      customerName: customer?.name || 'Unknown',
      favoriteServices,
      preferredTimeSlots,
      preferredDays,
      avgBookingValue,
      seasonalPatterns: [] // Would need more complex analysis
    };
  }

  // Get customer acquisition channel analysis
  async getAcquisitionChannels(
    _providerId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<AcquisitionChannel[]> {
    // This would require tracking acquisition sources
    // For now, return mock data structure
    const mockChannels: AcquisitionChannel[] = [
      {
        channel: 'Social Media',
        newCustomers: 25,
        totalRevenue: 1500,
        avgCustomerValue: 60,
        conversionRate: 15.5
      },
      {
        channel: 'Word of Mouth',
        newCustomers: 40,
        totalRevenue: 2800,
        avgCustomerValue: 70,
        conversionRate: 35.0
      },
      {
        channel: 'Online Search',
        newCustomers: 15,
        totalRevenue: 900,
        avgCustomerValue: 60,
        conversionRate: 8.2
      }
    ];

    return mockChannels;
  }

  // Update customer retention metrics
  async updateCustomerRetentionMetrics(
    providerId: string,
    customerId: string
  ): Promise<void> {
    // Calculate customer metrics and update the retention table
    const { data: bookings } = await supabase
      .from('bookings')
      .select('booking_date, total_price, service_id')
      .eq('provider_id', providerId)
      .eq('user_id', customerId)
      .eq('status', 'completed')
      .order('booking_date', { ascending: true });

    if (!bookings || bookings.length === 0) return;

    const firstVisit = bookings[0].booking_date;
    const lastVisit = bookings[bookings.length - 1].booking_date;
    const totalVisits = bookings.length;
    const totalSpent = bookings.reduce((sum, b) => sum + Number(b.total_price), 0);

    // Calculate lifetime value using the database function
    const { data: clvResult } = await supabase
      .rpc('calculate_customer_lifetime_value', {
        p_provider_id: providerId,
        p_customer_id: customerId
      });

    const lifetimeValue = clvResult || totalSpent;

    // Calculate average days between visits
    const daysBetweenVisits = bookings.length > 1 
      ? differenceInDays(new Date(lastVisit), new Date(firstVisit)) / (bookings.length - 1)
      : 0;

    // Determine customer segment
    const segment = this.determineCustomerSegment(totalVisits, totalSpent, differenceInDays(new Date(), new Date(lastVisit)));

    // Calculate churn risk
    const churnRisk = this.calculateChurnRisk(totalVisits, daysBetweenVisits, differenceInDays(new Date(), new Date(lastVisit)));

    // Find favorite service
    const serviceFrequency = bookings.reduce((acc, booking) => {
      acc[booking.service_id] = (acc[booking.service_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteServiceId = Object.entries(serviceFrequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    // Update retention metrics
    await supabase
      .from('customer_retention_metrics')
      .upsert({
        provider_id: providerId,
        customer_id: customerId,
        first_visit_date: firstVisit,
        last_visit_date: lastVisit,
        total_visits: totalVisits,
        total_spent: totalSpent,
        lifetime_value: lifetimeValue,
        avg_days_between_visits: Math.round(daysBetweenVisits),
        segment,
        churn_risk_score: churnRisk,
        favorite_service_id: favoriteServiceId
      });
  }

  private determineCustomerSegment(
    totalVisits: number,
    totalSpent: number,
    daysSinceLastVisit: number
  ): string {
    if (daysSinceLastVisit > 180) return 'lost';
    if (daysSinceLastVisit > 90) return 'at_risk';
    if (totalSpent > 1000 && totalVisits > 10) return 'vip';
    if (totalVisits > 3) return 'regular';
    return 'new';
  }

  private calculateChurnRisk(
    totalVisits: number,
    avgDaysBetweenVisits: number,
    daysSinceLastVisit: number
  ): number {
    let risk = 0;

    // Base risk on days since last visit
    if (daysSinceLastVisit > 180) risk += 0.8;
    else if (daysSinceLastVisit > 90) risk += 0.6;
    else if (daysSinceLastVisit > 60) risk += 0.4;
    else if (daysSinceLastVisit > 30) risk += 0.2;

    // Adjust for visit frequency
    if (totalVisits < 2) risk += 0.3;
    else if (totalVisits < 5) risk += 0.1;

    // Adjust for expected visit pattern
    if (avgDaysBetweenVisits > 0 && daysSinceLastVisit > avgDaysBetweenVisits * 2) {
      risk += 0.3;
    }

    return Math.min(1, risk);
  }
}