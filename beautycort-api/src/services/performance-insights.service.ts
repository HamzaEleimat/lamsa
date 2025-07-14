import { supabase } from '../config/supabase-simple';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { AnalyticsService } from './analytics.service';

export interface PerformanceInsight {
  id: string;
  type: 'improvement' | 'opportunity' | 'warning' | 'success';
  category: 'revenue' | 'customer' | 'service' | 'efficiency' | 'quality';
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
  recommendations: string[];
  recommendationsAr: string[];
  data: any;
  priority: number;
  actionable: boolean;
  estimatedROI?: string;
}

export interface MarketIntelligence {
  marketPosition: {
    categoryRank: number;
    cityRank: number;
    totalCompetitors: number;
    marketShare: number;
  };
  competitorAnalysis: {
    averagePrice: number;
    pricePosition: 'below' | 'competitive' | 'premium';
    serviceGaps: string[];
    advantages: string[];
  };
  marketTrends: {
    demandPattern: 'growing' | 'stable' | 'declining';
    seasonalTrends: Array<{
      period: string;
      demand: number;
      recommendation: string;
    }>;
    emergingServices: string[];
  };
}

export interface OptimizationSuggestion {
  area: string;
  currentState: any;
  targetState: any;
  actions: string[];
  expectedImpact: string;
  timeframe: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PredictiveAnalytics {
  revenueForecasting: {
    nextMonth: number;
    nextQuarter: number;
    confidence: number;
    factors: string[];
  };
  demandPrediction: {
    peakDays: string[];
    slowDays: string[];
    optimalPricing: Array<{
      timeSlot: string;
      suggestedMultiplier: number;
    }>;
  };
  customerBehavior: {
    churnRisk: number;
    acquisitionTrend: 'improving' | 'stable' | 'declining';
    lifetimeValueTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

export class PerformanceInsightsService {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  // Generate comprehensive performance insights
  async generatePerformanceInsights(providerId: string): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    // Gather data for analysis
    const [
      revenueInsights,
      customerInsights,
      serviceInsights,
      efficiencyInsights,
      qualityInsights
    ] = await Promise.all([
      this.analyzeRevenuePerformance(providerId),
      this.analyzeCustomerPerformance(providerId),
      this.analyzeServicePerformance(providerId),
      this.analyzeEfficiency(providerId),
      this.analyzeQuality(providerId)
    ]);

    insights.push(...revenueInsights);
    insights.push(...customerInsights);
    insights.push(...serviceInsights);
    insights.push(...efficiencyInsights);
    insights.push(...qualityInsights);

    // Sort by priority and impact
    return insights.sort((a, b) => {
      if (a.impact !== b.impact) {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      }
      return b.priority - a.priority;
    });
  }

  private async analyzeRevenuePerformance(providerId: string): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    // Get revenue data for analysis
    const currentMonth = new Date();
    const lastMonth = subMonths(currentMonth, 1);
    
    const [currentRevenue, previousRevenue] = await Promise.all([
      this.analyticsService.getRevenueReport(providerId, startOfMonth(currentMonth), endOfMonth(currentMonth), 'day'),
      this.analyticsService.getRevenueReport(providerId, startOfMonth(lastMonth), endOfMonth(lastMonth), 'day')
    ]);

    const revenueGrowth = previousRevenue.summary.totalRevenue > 0 
      ? ((currentRevenue.summary.totalRevenue - previousRevenue.summary.totalRevenue) / previousRevenue.summary.totalRevenue) * 100
      : 0;

    // Revenue growth insight
    if (revenueGrowth < -10) {
      insights.push({
        id: 'revenue_decline',
        type: 'warning',
        category: 'revenue',
        title: 'Revenue Decline Detected',
        titleAr: 'انخفاض في الإيرادات',
        description: `Revenue has decreased by ${Math.abs(revenueGrowth).toFixed(1)}% compared to last month`,
        descriptionAr: `انخفضت الإيرادات بنسبة ${Math.abs(revenueGrowth).toFixed(1)}% مقارنة بالشهر الماضي`,
        impact: 'high',
        confidence: 85,
        recommendations: [
          'Review pricing strategy',
          'Launch promotional campaigns',
          'Analyze customer feedback',
          'Introduce new services'
        ],
        recommendationsAr: [
          'مراجعة استراتيجية التسعير',
          'إطلاق حملات ترويجية',
          'تحليل تعليقات العملاء',
          'تقديم خدمات جديدة'
        ],
        data: { currentRevenue: currentRevenue.summary.totalRevenue, previousRevenue: previousRevenue.summary.totalRevenue, growth: revenueGrowth },
        priority: 90,
        actionable: true,
        estimatedROI: '15-25% revenue recovery'
      });
    } else if (revenueGrowth > 15) {
      insights.push({
        id: 'revenue_growth',
        type: 'success',
        category: 'revenue',
        title: 'Strong Revenue Growth',
        titleAr: 'نمو قوي في الإيرادات',
        description: `Revenue has increased by ${revenueGrowth.toFixed(1)}% compared to last month`,
        descriptionAr: `زادت الإيرادات بنسبة ${revenueGrowth.toFixed(1)}% مقارنة بالشهر الماضي`,
        impact: 'medium',
        confidence: 90,
        recommendations: [
          'Scale successful strategies',
          'Consider premium service offerings',
          'Invest in marketing to sustain growth'
        ],
        recommendationsAr: [
          'توسيع الاستراتيجيات الناجحة',
          'النظر في تقديم خدمات متميزة',
          'الاستثمار في التسويق للحفاظ على النمو'
        ],
        data: { growth: revenueGrowth },
        priority: 70,
        actionable: true
      });
    }

    // Pricing optimization
    const serviceBreakdown = await this.analyticsService.getServiceRevenueBreakdown(providerId, startOfMonth(currentMonth), endOfMonth(currentMonth));
    const lowPerformingServices = serviceBreakdown.filter(s => s.percentage < 10 && s.bookingsCount > 0);
    
    if (lowPerformingServices.length > 0) {
      insights.push({
        id: 'pricing_optimization',
        type: 'opportunity',
        category: 'revenue',
        title: 'Pricing Optimization Opportunity',
        titleAr: 'فرصة تحسين التسعير',
        description: 'Some services have low revenue contribution despite bookings',
        descriptionAr: 'بعض الخدمات لها مساهمة منخفضة في الإيرادات رغم وجود حجوزات',
        impact: 'medium',
        confidence: 75,
        recommendations: [
          'Review pricing for underperforming services',
          'Consider bundling low-revenue services',
          'Analyze competitor pricing'
        ],
        recommendationsAr: [
          'مراجعة تسعير الخدمات ضعيفة الأداء',
          'النظر في تجميع الخدمات منخفضة الإيرادات',
          'تحليل أسعار المنافسين'
        ],
        data: { lowPerformingServices },
        priority: 60,
        actionable: true,
        estimatedROI: '10-20% revenue increase'
      });
    }

    return insights;
  }

  private async analyzeCustomerPerformance(providerId: string): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    // Get customer analytics
    const customerMetrics = await this.analyticsService.getCustomerSegments(providerId);
    const churnRiskCustomers = await this.analyticsService.getChurnRiskCustomers(providerId, false);
    
    // High churn risk
    const highRiskCustomers = churnRiskCustomers.filter(c => c.churnProbability > 0.7);
    if (highRiskCustomers.length > 0) {
      insights.push({
        id: 'high_churn_risk',
        type: 'warning',
        category: 'customer',
        title: 'High Customer Churn Risk',
        titleAr: 'خطر عالي لفقدان العملاء',
        description: `${highRiskCustomers.length} customers at high risk of churning`,
        descriptionAr: `${highRiskCustomers.length} عميل معرض لخطر عالي للمغادرة`,
        impact: 'high',
        confidence: 80,
        recommendations: [
          'Reach out to at-risk customers',
          'Offer retention incentives',
          'Improve service quality',
          'Implement loyalty program'
        ],
        recommendationsAr: [
          'التواصل مع العملاء المعرضين للخطر',
          'تقديم حوافز للاحتفاظ بالعملاء',
          'تحسين جودة الخدمة',
          'تطبيق برنامج ولاء'
        ],
        data: { highRiskCount: highRiskCustomers.length, customers: highRiskCustomers.slice(0, 5) },
        priority: 85,
        actionable: true,
        estimatedROI: '20-30% customer retention'
      });
    }

    // Customer acquisition analysis
    const newCustomerSegment = customerMetrics.find(s => s.segment === 'new');
    if (newCustomerSegment && newCustomerSegment.percentage < 20) {
      insights.push({
        id: 'low_acquisition',
        type: 'opportunity',
        category: 'customer',
        title: 'Low Customer Acquisition',
        titleAr: 'اكتساب عملاء منخفض',
        description: 'New customer acquisition is below optimal levels',
        descriptionAr: 'اكتساب العملاء الجدد أقل من المستويات المثلى',
        impact: 'medium',
        confidence: 70,
        recommendations: [
          'Increase marketing efforts',
          'Implement referral program',
          'Improve online presence',
          'Offer new customer discounts'
        ],
        recommendationsAr: [
          'زيادة الجهود التسويقية',
          'تطبيق برنامج إحالة',
          'تحسين الوجود الرقمي',
          'تقديم خصومات للعملاء الجدد'
        ],
        data: { newCustomerPercentage: newCustomerSegment.percentage },
        priority: 65,
        actionable: true
      });
    }

    return insights;
  }

  private async analyzeServicePerformance(providerId: string): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    const servicePerformance = await this.analyticsService.getServicePerformance(providerId, startOfMonth(new Date()), endOfMonth(new Date()), 20, 'bookings');
    
    // Underperforming services
    const underperformingServices = servicePerformance.filter(s => s.avgRating < 4.0 && s.bookingsCount > 5);
    if (underperformingServices.length > 0) {
      insights.push({
        id: 'underperforming_services',
        type: 'improvement',
        category: 'service',
        title: 'Services Need Quality Improvement',
        titleAr: 'خدمات تحتاج تحسين الجودة',
        description: `${underperformingServices.length} services have ratings below 4.0 stars`,
        descriptionAr: `${underperformingServices.length} خدمات لها تقييمات أقل من 4.0 نجوم`,
        impact: 'high',
        confidence: 90,
        recommendations: [
          'Review service delivery process',
          'Provide additional staff training',
          'Gather customer feedback',
          'Update service descriptions'
        ],
        recommendationsAr: [
          'مراجعة عملية تقديم الخدمة',
          'توفير تدريب إضافي للموظفين',
          'جمع تعليقات العملاء',
          'تحديث أوصاف الخدمات'
        ],
        data: { services: underperformingServices },
        priority: 80,
        actionable: true
      });
    }

    // Popular services analysis
    const topServices = servicePerformance.slice(0, 3);
    if (topServices.length > 0) {
      insights.push({
        id: 'capitalize_popular_services',
        type: 'opportunity',
        category: 'service',
        title: 'Capitalize on Popular Services',
        titleAr: 'الاستفادة من الخدمات الشائعة',
        description: 'Focus marketing and capacity on your most popular services',
        descriptionAr: 'ركز التسويق والطاقة الاستيعابية على خدماتك الأكثر شعبية',
        impact: 'medium',
        confidence: 85,
        recommendations: [
          'Increase capacity for popular services',
          'Create service packages',
          'Train more staff in these services',
          'Promote these services more heavily'
        ],
        recommendationsAr: [
          'زيادة القدرة للخدمات الشائعة',
          'إنشاء حزم خدمات',
          'تدريب المزيد من الموظفين على هذه الخدمات',
          'الترويج لهذه الخدمات بشكل أكبر'
        ],
        data: { topServices },
        priority: 55,
        actionable: true
      });
    }

    return insights;
  }

  private async analyzeEfficiency(providerId: string): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    // Get booking patterns
    const bookingPatterns = await this.analyticsService.getBookingPatterns(providerId);
    const peakHours = bookingPatterns.filter(p => p.patternType === 'hourly' && p.peakScore > 0.8);
    const lowUtilizationHours = bookingPatterns.filter(p => p.patternType === 'hourly' && p.avgOccupancyRate < 30);
    
    if (lowUtilizationHours.length > 0) {
      insights.push({
        id: 'low_utilization',
        type: 'opportunity',
        category: 'efficiency',
        title: 'Low Utilization Time Slots',
        titleAr: 'فترات زمنية منخفضة الاستغلال',
        description: 'Some time slots have very low booking rates',
        descriptionAr: 'بعض الفترات الزمنية لها معدلات حجز منخفضة جداً',
        impact: 'medium',
        confidence: 80,
        recommendations: [
          'Offer discounts during slow hours',
          'Create special promotions',
          'Consider reduced hours',
          'Use time for staff training or maintenance'
        ],
        recommendationsAr: [
          'تقديم خصومات خلال الساعات البطيئة',
          'إنشاء عروض خاصة',
          'النظر في تقليل ساعات العمل',
          'استخدام الوقت لتدريب الموظفين أو الصيانة'
        ],
        data: { lowUtilizationHours },
        priority: 50,
        actionable: true
      });
    }

    return insights;
  }

  private async analyzeQuality(providerId: string): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    // Get review analytics
    const reviewAnalytics = await this.analyticsService.getReviewInsights(providerId);
    
    if (reviewAnalytics.averageRating < 4.0) {
      insights.push({
        id: 'low_overall_rating',
        type: 'warning',
        category: 'quality',
        title: 'Overall Rating Below Target',
        titleAr: 'التقييم العام أقل من المستهدف',
        description: `Average rating is ${reviewAnalytics.averageRating.toFixed(1)}, below the 4.0 target`,
        descriptionAr: `متوسط التقييم ${reviewAnalytics.averageRating.toFixed(1)}، أقل من المستهدف 4.0`,
        impact: 'high',
        confidence: 95,
        recommendations: [
          'Focus on service quality improvement',
          'Address common complaints',
          'Implement quality control measures',
          'Train staff on customer service'
        ],
        recommendationsAr: [
          'التركيز على تحسين جودة الخدمة',
          'معالجة الشكاوى الشائعة',
          'تطبيق إجراءات مراقبة الجودة',
          'تدريب الموظفين على خدمة العملاء'
        ],
        data: { averageRating: reviewAnalytics.averageRating },
        priority: 95,
        actionable: true
      });
    }

    // Response rate analysis
    if (reviewAnalytics.responseRate < 50) {
      insights.push({
        id: 'low_response_rate',
        type: 'improvement',
        category: 'quality',
        title: 'Low Review Response Rate',
        titleAr: 'معدل رد منخفض على التقييمات',
        description: `Only ${reviewAnalytics.responseRate.toFixed(1)}% of reviews have responses`,
        descriptionAr: `فقط ${reviewAnalytics.responseRate.toFixed(1)}% من التقييمات لديها ردود`,
        impact: 'medium',
        confidence: 90,
        recommendations: [
          'Set up review notification system',
          'Create response templates',
          'Allocate time daily for review responses',
          'Train staff on review management'
        ],
        recommendationsAr: [
          'إعداد نظام إشعارات التقييمات',
          'إنشاء قوالب للردود',
          'تخصيص وقت يومي للرد على التقييمات',
          'تدريب الموظفين على إدارة التقييمات'
        ],
        data: { responseRate: reviewAnalytics.responseRate },
        priority: 45,
        actionable: true
      });
    }

    return insights;
  }

  // Get market intelligence
  async getMarketIntelligence(providerId: string): Promise<MarketIntelligence> {
    // Get provider info
    const { data: provider } = await supabase
      .from('providers')
      .select('city, rating')
      .eq('id', providerId)
      .single();

    if (!provider) {
      throw new Error('Provider not found');
    }

    // Get competitors in same city
    const { data: competitors } = await supabase
      .from('providers')
      .select('rating, id')
      .eq('city', provider.city)
      .neq('id', providerId)
      .eq('verified', true)
      .eq('active', true);

    const totalCompetitors = competitors?.length || 0;
    const betterRatedCompetitors = competitors?.filter(c => c.rating > provider.rating).length || 0;
    const categoryRank = betterRatedCompetitors + 1;
    
    // Mock market share calculation (in real scenario, would use more complex data)
    const marketShare = totalCompetitors > 0 ? Math.max(1, 100 / (totalCompetitors + 1)) : 100;

    return {
      marketPosition: {
        categoryRank,
        cityRank: categoryRank, // Simplified
        totalCompetitors,
        marketShare
      },
      competitorAnalysis: {
        averagePrice: 150, // Would calculate from actual data
        pricePosition: 'competitive',
        serviceGaps: ['Advanced facial treatments', 'Bridal packages'],
        advantages: ['Higher rating', 'Faster response time']
      },
      marketTrends: {
        demandPattern: 'growing',
        seasonalTrends: [
          { period: 'Wedding Season', demand: 85, recommendation: 'Increase bridal service capacity' },
          { period: 'Summer', demand: 70, recommendation: 'Focus on skincare and sun protection' },
          { period: 'Holidays', demand: 90, recommendation: 'Offer gift packages' }
        ],
        emergingServices: ['Microblading', 'Lash extensions', 'Korean skincare']
      }
    };
  }

  // Generate optimization suggestions
  async getOptimizationSuggestions(providerId: string): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Get current performance data
    const [bookingPatterns, servicePerformance] = await Promise.all([
      this.analyticsService.getBookingPatterns(providerId),
      this.analyticsService.getServicePerformance(providerId, startOfMonth(new Date()), endOfMonth(new Date()), 10, 'revenue')
    ]);

    // Scheduling optimization
    const peakHours = bookingPatterns.filter(p => p.patternType === 'hourly' && p.peakScore > 0.7);
    if (peakHours.length > 0) {
      suggestions.push({
        area: 'Scheduling Optimization',
        currentState: { utilizationRate: 60, peakHourCapacity: 'Limited' },
        targetState: { utilizationRate: 80, peakHourCapacity: 'Optimized' },
        actions: [
          'Add more staff during peak hours',
          'Implement dynamic pricing',
          'Offer incentives for off-peak bookings'
        ],
        expectedImpact: '15-25% revenue increase',
        timeframe: '2-4 weeks',
        difficulty: 'medium'
      });
    }

    // Service portfolio optimization
    if (servicePerformance.length > 0) {
      const topPerformer = servicePerformance[0];
      suggestions.push({
        area: 'Service Portfolio',
        currentState: { topServiceRevenue: topPerformer.revenue, diversification: 'Limited' },
        targetState: { topServiceRevenue: topPerformer.revenue * 1.3, diversification: 'Optimized' },
        actions: [
          'Expand capacity for top-performing services',
          'Create service bundles',
          'Phase out underperforming services'
        ],
        expectedImpact: '20-30% revenue increase',
        timeframe: '1-2 months',
        difficulty: 'easy'
      });
    }

    return suggestions;
  }

  // Generate predictive analytics
  async getPredictiveAnalytics(providerId: string): Promise<PredictiveAnalytics> {
    // Get historical data for predictions
    const historicalRevenue = await this.analyticsService.getRevenueReport(
      providerId, 
      subMonths(new Date(), 6), 
      new Date(), 
      'month'
    );

    const avgMonthlyRevenue = historicalRevenue.timeline.reduce((sum, month) => sum + month.revenue, 0) / historicalRevenue.timeline.length;
    const revenueGrowthRate = historicalRevenue.timeline.length > 1 
      ? (historicalRevenue.timeline[historicalRevenue.timeline.length - 1].revenue - historicalRevenue.timeline[0].revenue) / historicalRevenue.timeline[0].revenue
      : 0;

    // Simple forecasting (in production, would use more sophisticated ML models)
    const nextMonthRevenue = avgMonthlyRevenue * (1 + revenueGrowthRate);
    const nextQuarterRevenue = nextMonthRevenue * 3;

    return {
      revenueForecasting: {
        nextMonth: nextMonthRevenue,
        nextQuarter: nextQuarterRevenue,
        confidence: 75,
        factors: ['Historical growth rate', 'Seasonal patterns', 'Market trends']
      },
      demandPrediction: {
        peakDays: ['Thursday', 'Friday', 'Saturday'],
        slowDays: ['Monday', 'Tuesday'],
        optimalPricing: [
          { timeSlot: 'Peak Hours (4-8 PM)', suggestedMultiplier: 1.2 },
          { timeSlot: 'Off-Peak (9-11 AM)', suggestedMultiplier: 0.8 }
        ]
      },
      customerBehavior: {
        churnRisk: 15, // Percentage
        acquisitionTrend: 'stable',
        lifetimeValueTrend: 'increasing'
      }
    };
  }

  // Generate comprehensive business intelligence report
  async generateBusinessIntelligenceReport(providerId: string) {
    const [
      insights,
      marketIntelligence,
      optimizations,
      predictions
    ] = await Promise.all([
      this.generatePerformanceInsights(providerId),
      this.getMarketIntelligence(providerId),
      this.getOptimizationSuggestions(providerId),
      this.getPredictiveAnalytics(providerId)
    ]);

    return {
      summary: {
        totalInsights: insights.length,
        highPriorityInsights: insights.filter(i => i.impact === 'high').length,
        actionableInsights: insights.filter(i => i.actionable).length,
        marketRank: marketIntelligence.marketPosition.categoryRank,
        optimizationOpportunities: optimizations.length
      },
      insights,
      marketIntelligence,
      optimizations,
      predictions,
      generatedAt: new Date().toISOString()
    };
  }
}

export const performanceInsightsService = new PerformanceInsightsService();