import { DateRange } from '../../src/services/analytics/ProviderAnalyticsService';

// Test analytics data
export const mockAnalyticsData = {
  // Key metrics data
  keyMetrics: {
    today: {
      revenue: 285,
      bookings: 12,
      newCustomers: 3,
      reviewScore: 4.8,
    },
    week: {
      revenue: 1420,
      bookings: 58,
      newCustomers: 15,
      reviewScore: 4.7,
    },
    month: {
      revenue: 5680,
      bookings: 234,
      newCustomers: 62,
      reviewScore: 4.8,
    },
  },

  // Revenue analytics data
  revenueData: {
    daily: [
      { date: '2024-01-08', amount: 180 },
      { date: '2024-01-09', amount: 220 },
      { date: '2024-01-10', amount: 195 },
      { date: '2024-01-11', amount: 310 },
      { date: '2024-01-12', amount: 420 },
      { date: '2024-01-13', amount: 380 },
      { date: '2024-01-14', amount: 285 },
    ],
    weekly: [
      { week: 'Week 1', amount: 1250 },
      { week: 'Week 2', amount: 1420 },
      { week: 'Week 3', amount: 1380 },
      { week: 'Week 4', amount: 1630 },
    ],
    monthly: [
      { month: 'Oct', amount: 4890 },
      { month: 'Nov', amount: 5230 },
      { month: 'Dec', amount: 5680 },
      { month: 'Jan', amount: 1990 },
    ],
  },

  // Service performance data
  servicePerformance: [
    {
      id: 'service-1',
      name: 'قص شعر نسائي',
      nameEn: 'Women\'s Haircut',
      bookings: 89,
      revenue: 1335,
      averageRating: 4.9,
      growthRate: 15,
    },
    {
      id: 'service-2',
      name: 'صبغة شعر',
      nameEn: 'Hair Coloring',
      bookings: 45,
      revenue: 2025,
      averageRating: 4.7,
      growthRate: -5,
    },
    {
      id: 'service-3',
      name: 'مكياج سهرة',
      nameEn: 'Evening Makeup',
      bookings: 67,
      revenue: 2345,
      averageRating: 4.8,
      growthRate: 22,
    },
    {
      id: 'service-4',
      name: 'مانيكير وباديكير',
      nameEn: 'Manicure & Pedicure',
      bookings: 33,
      revenue: 825,
      averageRating: 4.6,
      growthRate: 8,
    },
  ],

  // Booking patterns data
  bookingPatterns: {
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      bookings: hour >= 9 && hour <= 20 ? Math.floor(Math.random() * 10 + 5) : 0,
    })),
    daily: [
      { day: 'الأحد', bookings: 18 },
      { day: 'الإثنين', bookings: 22 },
      { day: 'الثلاثاء', bookings: 25 },
      { day: 'الأربعاء', bookings: 28 },
      { day: 'الخميس', bookings: 35 },
      { day: 'الجمعة', bookings: 15 },
      { day: 'السبت', bookings: 32 },
    ],
    peakHours: [
      { hour: 10, day: 0, intensity: 0.3 },
      { hour: 11, day: 0, intensity: 0.5 },
      { hour: 14, day: 0, intensity: 0.4 },
      { hour: 16, day: 0, intensity: 0.7 },
      { hour: 18, day: 0, intensity: 0.9 },
      { hour: 19, day: 0, intensity: 1.0 },
      // ... more data points
    ],
  },

  // Customer analytics data
  customerAnalytics: {
    totalCustomers: 1247,
    newCustomers: 62,
    returningCustomers: 1185,
    retentionRate: 68,
    averageLifetimeValue: 125,
    topCustomers: [
      {
        id: 'customer-1',
        name: 'سارة أحمد',
        visits: 24,
        totalSpent: 480,
        lastVisit: '2024-01-10',
      },
      {
        id: 'customer-2',
        name: 'منى الزعبي',
        visits: 18,
        totalSpent: 360,
        lastVisit: '2024-01-12',
      },
      {
        id: 'customer-3',
        name: 'هند الخطيب',
        visits: 15,
        totalSpent: 295,
        lastVisit: '2024-01-14',
      },
    ],
    segments: [
      { name: 'VIP', count: 45, percentage: 3.6 },
      { name: 'Regular', count: 380, percentage: 30.5 },
      { name: 'Occasional', count: 520, percentage: 41.7 },
      { name: 'New', count: 302, percentage: 24.2 },
    ],
  },

  // Review analytics data
  reviewAnalytics: {
    averageRating: 4.8,
    totalReviews: 234,
    ratingDistribution: {
      5: 180,
      4: 40,
      3: 10,
      2: 3,
      1: 1,
    },
    recentReviews: [
      {
        id: 'review-1',
        customerName: 'فاطمة الخالدي',
        rating: 5,
        comment: 'خدمة ممتازة والموظفات محترمات',
        date: '2024-01-14',
        sentiment: 'positive',
      },
      {
        id: 'review-2',
        customerName: 'نور الحسن',
        rating: 4,
        comment: 'جيد لكن الانتظار طويل أحياناً',
        date: '2024-01-13',
        sentiment: 'neutral',
      },
    ],
    sentimentAnalysis: {
      positive: 85,
      neutral: 12,
      negative: 3,
    },
    commonKeywords: [
      { word: 'ممتاز', count: 45 },
      { word: 'محترم', count: 38 },
      { word: 'نظيف', count: 32 },
      { word: 'سريع', count: 28 },
      { word: 'مريح', count: 25 },
    ],
  },

  // Competitor insights data
  competitorInsights: {
    marketPosition: 2,
    totalCompetitors: 15,
    averageMarketRating: 4.2,
    averageMarketPrice: 25,
    strengths: [
      'Higher rating than 87% of competitors',
      'More services offered',
      'Better response time',
    ],
    weaknesses: [
      'Prices 15% above market average',
      'Limited parking compared to competitors',
    ],
    opportunities: [
      'Add express services',
      'Expand working hours',
      'Introduce loyalty program',
    ],
  },

  // Growth recommendations
  growthRecommendations: [
    {
      id: 'rec-1',
      priority: 'high',
      title: 'تحسين أوقات الذروة',
      titleEn: 'Optimize Peak Hours',
      description: 'لديك طلب مرتفع في المساء. فكر في إضافة موظفين',
      descriptionEn: 'You have high demand in evenings. Consider adding staff',
      potentialImpact: '20% increase in revenue',
    },
    {
      id: 'rec-2',
      priority: 'medium',
      title: 'برنامج ولاء',
      titleEn: 'Loyalty Program',
      description: 'أطلق برنامج نقاط لزيادة الاحتفاظ بالعملاء',
      descriptionEn: 'Launch points program to increase customer retention',
      potentialImpact: '15% increase in repeat bookings',
    },
    {
      id: 'rec-3',
      priority: 'low',
      title: 'توسيع الخدمات',
      titleEn: 'Expand Services',
      description: 'أضف خدمات العناية بالأظافر المتقدمة',
      descriptionEn: 'Add advanced nail care services',
      potentialImpact: '10% new customer acquisition',
    },
  ],

  // Payment methods distribution
  paymentMethods: [
    { method: 'نقدي', percentage: 65 },
    { method: 'بطاقة', percentage: 25 },
    { method: 'محفظة', percentage: 10 },
  ],

  // Cancellation analytics
  cancellationAnalytics: {
    rate: 8.5,
    reasons: [
      { reason: 'تغيير الموعد', count: 15 },
      { reason: 'ظروف طارئة', count: 8 },
      { reason: 'وجدت بديل', count: 3 },
      { reason: 'أخرى', count: 2 },
    ],
  },
};

// Helper functions for generating test data
export const generateMockMetrics = (period: DateRange) => {
  const multiplier = period === 'day' ? 1 : period === 'week' ? 7 : 30;
  return {
    revenue: Math.floor(Math.random() * 200 * multiplier + 100 * multiplier),
    bookings: Math.floor(Math.random() * 10 * multiplier + 5 * multiplier),
    newCustomers: Math.floor(Math.random() * 5 * multiplier + 2 * multiplier),
    reviewScore: +(Math.random() * 0.5 + 4.5).toFixed(1),
  };
};

export const generateMockRevenueData = (days: number) => {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      amount: Math.floor(Math.random() * 300 + 100),
    });
  }
  
  return data;
};

export const generateMockBookingHeatmap = () => {
  const heatmapData = [];
  
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      if (hour >= 9 && hour <= 20) {
        const intensity = 
          hour === 11 || hour === 19 ? 0.9 + Math.random() * 0.1 :
          hour >= 17 && hour <= 20 ? 0.7 + Math.random() * 0.2 :
          hour >= 10 && hour <= 16 ? 0.4 + Math.random() * 0.3 :
          0.1 + Math.random() * 0.2;
          
        heatmapData.push({
          hour,
          day,
          intensity: Math.min(1, intensity),
        });
      }
    }
  }
  
  return heatmapData;
};

// Performance benchmarks
export const performanceBenchmarks = {
  loadTime: {
    dashboard: 500, // ms
    analytics: 800,
    notifications: 300,
  },
  memoryUsage: {
    idle: 50, // MB
    active: 120,
    peak: 200,
  },
  apiResponseTime: {
    fast: 100, // ms
    average: 300,
    slow: 1000,
  },
};

// Edge case scenarios for testing
export const edgeCaseAnalytics = {
  // No data scenario
  emptyData: {
    revenue: 0,
    bookings: 0,
    newCustomers: 0,
    reviewScore: 0,
  },
  
  // Maximum values
  maxValues: {
    revenue: 999999,
    bookings: 9999,
    newCustomers: 999,
    reviewScore: 5.0,
  },
  
  // Negative growth
  negativeGrowth: {
    currentPeriod: 1000,
    previousPeriod: 1500,
    growthRate: -33.33,
  },
  
  // Data with gaps
  gappyData: [
    { date: '2024-01-01', amount: 100 },
    { date: '2024-01-02', amount: null },
    { date: '2024-01-03', amount: 150 },
    { date: '2024-01-04', amount: undefined },
    { date: '2024-01-05', amount: 200 },
  ],
};