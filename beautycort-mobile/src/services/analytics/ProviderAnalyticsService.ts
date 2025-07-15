import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInDays,
  isWithinInterval,
} from 'date-fns';

export interface DashboardSummary {
  todayRevenue: number;
  revenueChangePercent: number;
  todayBookings: number;
  bookingsChangePercent: number;
  newCustomersToday: number;
  newCustomersChangePercent: number;
  averageRating: number;
  ratingChangePercent: number;
  unreadNotifications: number;
  revenueChart: {
    labels: string[];
    data: number[];
  };
  upcomingBookings: Array<{
    id: string;
    time: string;
    customerName: string;
    serviceName: string;
    price: number;
  }>;
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    message: string;
  }>;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  periodComparison: number;
  revenueByService: Array<{
    serviceName: string;
    revenue: number;
    percentage: number;
  }>;
  revenueByPaymentMethod: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
  revenueChart: {
    labels: string[];
    data: number[];
  };
  projectedRevenue: number;
  averageBookingValue: number;
  topRevenueDay: {
    date: string;
    amount: number;
  };
}

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
  averageLifetimeValue: number;
  customersByGender: {
    male: number;
    female: number;
  };
  customersByAge: Array<{
    range: string;
    count: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    visitCount: number;
    lastVisit: string;
  }>;
  customerGrowth: {
    labels: string[];
    data: number[];
  };
  churnRate: number;
  customerSatisfaction: number;
}

export interface BookingAnalytics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  peakHours: Array<{
    hour: number;
    count: number;
  }>;
  peakDays: Array<{
    day: string;
    count: number;
  }>;
  bookingsByService: Array<{
    serviceName: string;
    count: number;
    revenue: number;
  }>;
  averageBookingDuration: number;
  bookingTrends: {
    labels: string[];
    data: number[];
  };
  bookingSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  noShowRate: number;
}

export interface PerformanceMetrics {
  overallRating: number;
  ratingTrend: {
    labels: string[];
    data: number[];
  };
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviewSentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  responseTime: number;
  completionRate: number;
  customerComplaints: number;
  serviceQualityScore: number;
  competitorComparison: {
    yourScore: number;
    marketAverage: number;
    topPerformer: number;
  };
  growthRecommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potentialImpact: string;
  }>;
}

export class ProviderAnalyticsService {
  private static instance: ProviderAnalyticsService;
  private baseURL: string = 'https://api.beautycort.com'; // TODO: Move to config
  
  private constructor() {}
  
  static getInstance(): ProviderAnalyticsService {
    if (!ProviderAnalyticsService.instance) {
      ProviderAnalyticsService.instance = new ProviderAnalyticsService();
    }
    return ProviderAnalyticsService.instance;
  }
  
  async getDashboardSummary(
    providerId: string, 
    period: 'today' | 'week' | 'month'
  ): Promise<DashboardSummary> {
    // For now, return mock data. In production, this would call the API
    const mockData = await this.generateMockDashboardData(period);
    return mockData;
  }
  
  async getRevenueAnalytics(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueAnalytics> {
    // Mock implementation
    const days = differenceInDays(endDate, startDate);
    const labels = [];
    const data = [];
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      labels.push(format(date, 'MMM d'));
      data.push(Math.floor(Math.random() * 500) + 100);
    }
    
    return {
      totalRevenue: data.reduce((sum, val) => sum + val, 0),
      periodComparison: Math.random() * 40 - 20,
      revenueByService: [
        { serviceName: 'قص شعر', revenue: 2500, percentage: 35 },
        { serviceName: 'صبغة', revenue: 1800, percentage: 25 },
        { serviceName: 'مكياج', revenue: 1500, percentage: 21 },
        { serviceName: 'عناية بالأظافر', revenue: 1000, percentage: 14 },
        { serviceName: 'أخرى', revenue: 350, percentage: 5 },
      ],
      revenueByPaymentMethod: [
        { method: 'نقدي', amount: 4500, count: 120 },
        { method: 'بطاقة', amount: 2000, count: 45 },
        { method: 'محفظة إلكترونية', amount: 650, count: 22 },
      ],
      revenueChart: { labels, data },
      projectedRevenue: 8500,
      averageBookingValue: 42.5,
      topRevenueDay: {
        date: 'الخميس',
        amount: 850,
      },
    };
  }
  
  async getCustomerAnalytics(
    providerId: string,
    period: 'week' | 'month' | 'quarter' | 'year'
  ): Promise<CustomerAnalytics> {
    // Mock implementation
    const totalCustomers = 256;
    const newCustomers = period === 'week' ? 12 : period === 'month' ? 45 : 120;
    
    return {
      totalCustomers,
      newCustomers,
      returningCustomers: totalCustomers - newCustomers,
      retentionRate: 72.5,
      averageLifetimeValue: 385,
      customersByGender: {
        male: 0,
        female: totalCustomers, // Female-only salon
      },
      customersByAge: [
        { range: '18-24', count: 45 },
        { range: '25-34', count: 98 },
        { range: '35-44', count: 67 },
        { range: '45-54', count: 32 },
        { range: '55+', count: 14 },
      ],
      topCustomers: [
        {
          id: '1',
          name: 'سارة أحمد',
          totalSpent: 680,
          visitCount: 18,
          lastVisit: '2024-01-15',
        },
        {
          id: '2',
          name: 'نور الهدى',
          totalSpent: 520,
          visitCount: 14,
          lastVisit: '2024-01-18',
        },
        {
          id: '3',
          name: 'ريم محمد',
          totalSpent: 475,
          visitCount: 12,
          lastVisit: '2024-01-10',
        },
      ],
      customerGrowth: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        data: [8, 12, 15, 10],
      },
      churnRate: 8.5,
      customerSatisfaction: 4.6,
    };
  }
  
  async getBookingAnalytics(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BookingAnalytics> {
    // Mock implementation
    const totalBookings = 142;
    const cancelledBookings = 8;
    
    return {
      totalBookings,
      completedBookings: totalBookings - cancelledBookings - 3, // 3 no-shows
      cancelledBookings,
      cancellationRate: (cancelledBookings / totalBookings) * 100,
      peakHours: [
        { hour: 10, count: 18 },
        { hour: 11, count: 22 },
        { hour: 14, count: 16 },
        { hour: 15, count: 24 },
        { hour: 16, count: 20 },
        { hour: 17, count: 15 },
      ],
      peakDays: [
        { day: 'الخميس', count: 28 },
        { day: 'الجمعة', count: 32 },
        { day: 'السبت', count: 25 },
        { day: 'الأحد', count: 20 },
      ],
      bookingsByService: [
        { serviceName: 'قص شعر', count: 45, revenue: 1350 },
        { serviceName: 'صبغة', count: 32, revenue: 1920 },
        { serviceName: 'مكياج', count: 28, revenue: 1680 },
        { serviceName: 'عناية بالأظافر', count: 37, revenue: 740 },
      ],
      averageBookingDuration: 75, // minutes
      bookingTrends: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [18, 20, 19, 28, 32, 25, 20],
      },
      bookingSources: [
        { source: 'تطبيق', count: 98, percentage: 69 },
        { source: 'واتساب', count: 28, percentage: 20 },
        { source: 'هاتف', count: 16, percentage: 11 },
      ],
      noShowRate: 2.1,
    };
  }
  
  async getPerformanceMetrics(
    providerId: string,
    period: 'month' | 'quarter' | 'year'
  ): Promise<PerformanceMetrics> {
    // Mock implementation
    return {
      overallRating: 4.7,
      ratingTrend: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [4.5, 4.6, 4.6, 4.7, 4.8, 4.7],
      },
      ratingDistribution: {
        5: 128,
        4: 45,
        3: 12,
        2: 3,
        1: 1,
      },
      reviewSentiment: {
        positive: 85,
        neutral: 12,
        negative: 3,
      },
      responseTime: 15, // minutes
      completionRate: 97.9,
      customerComplaints: 3,
      serviceQualityScore: 92,
      competitorComparison: {
        yourScore: 92,
        marketAverage: 78,
        topPerformer: 95,
      },
      growthRecommendations: [
        {
          priority: 'high',
          title: 'أضف خدمات العناية بالبشرة',
          description: '70% من عملائك يسألون عن خدمات العناية بالبشرة',
          potentialImpact: 'زيادة الإيرادات بنسبة 25%',
        },
        {
          priority: 'high',
          title: 'قدم باقات خاصة للعرائس',
          description: 'موسم الأعراس قادم وهناك طلب متزايد',
          potentialImpact: 'زيادة متوسط قيمة الحجز بنسبة 40%',
        },
        {
          priority: 'medium',
          title: 'حسّن أوقات الانتظار',
          description: '15% من العملاء ذكروا أوقات الانتظار في التقييمات',
          potentialImpact: 'تحسين التقييم إلى 4.9',
        },
        {
          priority: 'medium',
          title: 'أضف برنامج ولاء',
          description: 'كافئ عملائك المخلصين لزيادة التكرار',
          potentialImpact: 'زيادة معدل الاحتفاظ بنسبة 20%',
        },
      ],
    };
  }
  
  private async generateMockDashboardData(period: 'today' | 'week' | 'month'): Promise<DashboardSummary> {
    const now = new Date();
    let revenueData = [];
    let labels = [];
    
    if (period === 'today') {
      // Hourly data for today
      for (let i = 8; i <= 20; i++) {
        labels.push(`${i}:00`);
        revenueData.push(Math.floor(Math.random() * 100) + 20);
      }
    } else if (period === 'week') {
      // Daily data for the week
      labels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      revenueData = labels.map(() => Math.floor(Math.random() * 500) + 200);
    } else {
      // Weekly data for the month
      labels = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
      revenueData = labels.map(() => Math.floor(Math.random() * 2000) + 1000);
    }
    
    const todayRevenue = revenueData[revenueData.length - 1];
    const yesterdayRevenue = revenueData[revenueData.length - 2] || todayRevenue * 0.9;
    
    return {
      todayRevenue,
      revenueChangePercent: ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100,
      todayBookings: Math.floor(Math.random() * 15) + 8,
      bookingsChangePercent: Math.random() * 30 - 10,
      newCustomersToday: Math.floor(Math.random() * 5) + 1,
      newCustomersChangePercent: Math.random() * 50 - 20,
      averageRating: 4.7,
      ratingChangePercent: Math.random() * 5 - 1,
      unreadNotifications: Math.floor(Math.random() * 5),
      revenueChart: {
        labels,
        data: revenueData,
      },
      upcomingBookings: [
        {
          id: '1',
          time: '10:00',
          customerName: 'سارة أحمد',
          serviceName: 'قص وتسريحة',
          price: 45,
        },
        {
          id: '2',
          time: '11:30',
          customerName: 'نور الهدى',
          serviceName: 'صبغة شعر',
          price: 120,
        },
        {
          id: '3',
          time: '14:00',
          customerName: 'ريم محمد',
          serviceName: 'مكياج سهرة',
          price: 80,
        },
      ],
      insights: [
        {
          type: 'positive',
          message: 'حجوزاتك اليوم أعلى بنسبة 20% من المتوسط',
        },
        {
          type: 'positive',
          message: 'تقييمك هذا الأسبوع تحسن إلى 4.8 نجوم',
        },
        {
          type: 'neutral',
          message: 'ذروة الحجوزات لديك بين 3-6 مساءً',
        },
      ],
    };
  }
  
  // Helper method to get date ranges
  getDateRange(period: 'today' | 'week' | 'month' | 'quarter' | 'year'): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);
    
    switch (period) {
      case 'today':
        start = startOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
        end = endOfWeek(now, { weekStartsOn: 0 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarter':
        start = startOfMonth(subMonths(now, 2));
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = startOfDay(now);
    }
    
    return { start, end };
  }
}