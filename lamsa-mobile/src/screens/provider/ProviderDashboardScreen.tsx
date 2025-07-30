import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Text, Card, ActivityIndicator, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { spacing, layout } from '../../constants/spacing';
import { ProviderStackParamList } from '../../navigation/ProviderStackNavigator';
import { ProviderTabParamList } from '../../navigation/ProviderTabNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import { providerBookingService } from '../../services/providerBookingService';
import { getProviderIdForUser } from '../../utils/providerUtils';
import { handleSupabaseError, logError } from '../../utils/errorHandler';
import { LineChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import LanguageToggleButton from '../../components/LanguageToggleButton';
import { notificationService } from '../../services/notificationService';
import { employeeService } from '../../services/employeeService';
import { reviewService } from '../../services/reviewService';
import DonutChart from '../../components/charts/DonutChart';
import BusinessHealthScore from '../../components/dashboard/BusinessHealthScore';
import QuickStatsGrid from '../../components/dashboard/QuickStatsGrid';
import ScheduleTimeline from '../../components/dashboard/ScheduleTimeline';
import SmartAlerts from '../../components/dashboard/SmartAlerts';
import ServicePerformance from '../../components/dashboard/ServicePerformance';
import ClientInsights from '../../components/dashboard/ClientInsights';
import { QuickActions } from '../../components/dashboard/QuickActions';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardMetric {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: string;
  color: string;
  screen?: keyof ProviderStackParamList | keyof ProviderTabParamList;
}


type ProviderDashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<ProviderTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<ProviderStackParamList>
>;

export default function ProviderDashboardScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<ProviderDashboardNavigationProp>();
  const { user } = useAuth();
  const theme = useTheme();
  const locale = i18n.language === 'ar' ? ar : enUS;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [bookingStats, setBookingStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [notificationCount, setNotificationCount] = useState(0);
  const [employeeMetrics, setEmployeeMetrics] = useState<any>(null);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [quickActionsVisible, setQuickActionsVisible] = useState(true);
  
  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const calculateBusinessHealthScore = () => {
    if (!performanceMetrics || !bookingStats) return null;

    // Calculate occupancy rate (booked slots / total slots)
    const totalSlots = 12; // Assuming 12 slots per day (9am-9pm)
    const occupancyRate = Math.round((bookingStats.todayBookings / totalSlots) * 100);

    // Calculate revenue vs target (assuming daily target is 500 JOD)
    const dailyTarget = 500;
    const revenueVsTarget = Math.round((performanceMetrics.revenue_today / dailyTarget) * 100);

    // Customer satisfaction (based on average rating)
    const satisfaction = Math.round((performanceMetrics.avg_rating / 5) * 100);

    // Staff utilization (placeholder - would need real data)
    const staffUtilization = 75; // Mock data

    // Calculate overall score (weighted average)
    const score = Math.round(
      (occupancyRate * 0.3 + revenueVsTarget * 0.3 + satisfaction * 0.3 + staffUtilization * 0.1)
    );

    // Determine trend based on week comparison
    const weeklyChange = calculatePercentageChange(
      performanceMetrics.revenue_today,
      performanceMetrics.revenue_last_7_days / 7
    );
    const trend: 'up' | 'down' | 'stable' = weeklyChange > 5 ? 'up' : weeklyChange < -5 ? 'down' : 'stable';

    return {
      score,
      trend,
      factors: {
        occupancyRate,
        revenueVsTarget,
        customerSatisfaction: satisfaction,
        staffUtilization,
      },
      tip: score < 60 
        ? t('dashboard.healthTipLow') 
        : score < 80 
        ? t('dashboard.healthTipMedium')
        : t('dashboard.healthTipHigh'),
    };
  };
  
  useEffect(() => {
    fetchProviderId();
  }, [user]);
  
  useEffect(() => {
    if (providerId) {
      loadDashboardData();
    }
  }, [providerId, selectedPeriod]);

  useEffect(() => {
    if (user?.id) {
      loadNotificationCount();
      // Subscribe to real-time notifications
      const subscription = notificationService.subscribeToNotifications(user.id, () => {
        loadNotificationCount();
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);
  
  const fetchProviderId = async () => {
    if (!user?.id) return;
    
    try {
      const providerId = await getProviderIdForUser(user.id);
      if (providerId) {
        setProviderId(providerId);
      }
    } catch (error) {
      logError('fetchProviderId', error);
    }
  };
  
  const loadDashboardData = async () => {
    if (!providerId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [metrics, stats, revenue, todayBookings, empMetrics, reviews] = await Promise.all([
        analyticsService.getPerformanceMetrics(providerId),
        providerBookingService.getBookingStats(providerId),
        analyticsService.getDailyRevenue(providerId, 30),
        providerBookingService.getTodayUpcomingBookings(providerId),
        employeeService.getEmployeeMetrics(providerId),
        reviewService.getRecentReviews(providerId, 5)
      ]);
      
      setPerformanceMetrics(metrics);
      setBookingStats(stats);
      setRevenueData(revenue);
      setUpcomingBookings(todayBookings);
      setEmployeeMetrics(empMetrics);
      setRecentReviews(reviews);
    } catch (error) {
      logError('loadDashboardData', error);
      const appError = handleSupabaseError(error);
      // You can show an alert or toast here if needed
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      loadNotificationCount()
    ]);
    setRefreshing(false);
  };

  const loadNotificationCount = async () => {
    if (!user?.id) return;
    
    try {
      const count = await notificationService.getNotificationCount(user.id);
      setNotificationCount(count.unread);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };
  
  const metrics: DashboardMetric[] = performanceMetrics && bookingStats ? [
    {
      label: t('dashboard.todayRevenue'),
      value: `${performanceMetrics.revenue_today.toFixed(2)} ${t('common.jod')}`,
      change: calculatePercentageChange(performanceMetrics.revenue_today, performanceMetrics.revenue_last_7_days / 7),
      changeLabel: t('dashboard.vsAverage'),
      icon: 'cash',
      color: colors.success,
      // screen: 'RevenueAnalytics', // TODO: Add to navigation
    },
    {
      label: t('dashboard.todayBookings'),
      value: bookingStats.todayBookings.toString(),
      change: calculatePercentageChange(bookingStats.todayBookings, bookingStats.weekBookings / 7),
      changeLabel: t('dashboard.vsAverage'),
      icon: 'calendar',
      color: colors.primary,
      // screen: 'BookingAnalytics', // TODO: Add to navigation
    },
    {
      label: t('dashboard.totalCustomers'),
      value: performanceMetrics.unique_customers.toString(),
      change: calculatePercentageChange(performanceMetrics.new_customers_last_30_days, performanceMetrics.unique_customers / 12),
      changeLabel: t('dashboard.newThisMonth'),
      icon: 'people',
      color: colors.info,
      // screen: 'CustomerAnalytics', // TODO: Add to navigation
    },
    {
      label: t('dashboard.avgRating'),
      value: performanceMetrics.avg_rating.toFixed(1),
      change: 0, // Rating changes are typically small
      changeLabel: `${performanceMetrics.total_reviews} ${t('common.reviews')}`,
      icon: 'star',
      color: colors.warning,
      // screen: 'PerformanceAnalytics', // TODO: Add to navigation
    },
  ] : [];
  

  const getQuickStats = () => {
    if (!performanceMetrics || !bookingStats) return [];

    return [
      {
        label: t('dashboard.todaysAppointments'),
        value: `${bookingStats.todayBookings}/${12}`,
        subValue: `${Math.round((bookingStats.todayBookings / 12) * 100)}%`,
        icon: 'calendar-check',
        color: colors.primary,
        onPress: () => navigation.navigate('Bookings'),
      },
      {
        label: t('dashboard.weekRevenue'),
        value: `${performanceMetrics.revenue_last_7_days.toFixed(0)}`,
        subValue: t('common.jod'),
        icon: 'cash-multiple',
        color: colors.success,
        onPress: () => navigation.navigate('More'), // TODO: Navigate to RevenueAnalytics when available
      },
      {
        label: t('dashboard.newClients'),
        value: performanceMetrics.new_customers_this_month.toString(),
        subValue: t('dashboard.thisWeek'),
        icon: 'account-plus',
        color: colors.secondary,
        onPress: () => navigation.navigate('More'), // TODO: Navigate to CustomerAnalytics when available
      },
      {
        label: t('dashboard.avgRating'),
        value: performanceMetrics.avg_rating.toFixed(1),
        subValue: `${performanceMetrics.total_reviews} ${t('dashboard.reviews')}`,
        icon: 'star',
        color: colors.warning,
        onPress: () => navigation.navigate('Profile'), // TODO: Navigate to ReviewsList when available
      },
    ];
  };

  const generateScheduleSlots = (period: 'today' | 'week' | 'month') => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    if (period === 'today') {
      // Hourly slots for today
      const startHour = 9;
      const endHour = 21;

      for (let hour = startHour; hour < endHour; hour++) {
        const isPast = hour < currentHour;
        const isBreak = hour === 13; // Lunch break
        
        // Mock booking data - in real app, this would come from actual bookings
        const hasBooking = !isBreak && !isPast && Math.random() > 0.4;
        
        slots.push({
          time: `${hour}:00`,
          isBooked: hasBooking,
          isBreak,
          isPast,
          booking: hasBooking ? {
            id: `booking-${hour}`,
            customerName: ['Sarah Ahmed', 'Fatima Ali', 'Noor Hassan'][Math.floor(Math.random() * 3)],
            serviceName: ['Hair Cut', 'Manicure', 'Facial'][Math.floor(Math.random() * 3)],
            duration: 60,
            status: hour === currentHour ? 'in-progress' : 'confirmed' as any,
          } : undefined,
        });
      }
    } else if (period === 'week') {
      // Daily slots for the week
      const daysOfWeek = i18n.language === 'ar' 
        ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(now);
        date.setDate(now.getDate() + dayOffset);
        const isPast = dayOffset === 0 && currentHour > 18; // Consider today past if after 6 PM
        const isToday = dayOffset === 0;
        
        // Mock booking count for each day
        const bookingCount = Math.floor(Math.random() * 8) + 2;
        const hasBooking = bookingCount > 0;
        
        slots.push({
          time: daysOfWeek[date.getDay()],
          date: format(date, 'dd/MM', { locale }),
          isBooked: hasBooking,
          isPast,
          isToday,
          bookingCount,
          booking: hasBooking ? {
            id: `day-${dayOffset}`,
            customerName: `${bookingCount} ${t('common.bookings')}`,
            serviceName: isToday ? t('dashboard.inProgress') : '',
            duration: 0,
            status: isToday ? 'in-progress' : 'confirmed' as any,
          } : undefined,
        });
      }
    } else {
      // Weekly summaries for the month
      const weekNames = i18n.language === 'ar' 
        ? ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4']
        : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      
      for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + (weekOffset * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const isPast = weekOffset === 0 && currentDay > 5; // Consider current week past if Friday or later
        const isCurrentWeek = weekOffset === 0;
        
        // Mock weekly stats
        const bookingCount = Math.floor(Math.random() * 30) + 15;
        const revenue = bookingCount * (Math.random() * 50 + 30);
        
        slots.push({
          time: weekNames[weekOffset],
          date: `${format(weekStart, 'dd/MM', { locale })} - ${format(weekEnd, 'dd/MM', { locale })}`,
          isBooked: true,
          isPast,
          isCurrentWeek,
          bookingCount,
          revenue: revenue.toFixed(0),
          booking: {
            id: `week-${weekOffset}`,
            customerName: `${bookingCount} ${t('common.bookings')}`,
            serviceName: `${revenue.toFixed(0)} ${t('common.jod')}`,
            duration: 0,
            status: isCurrentWeek ? 'in-progress' : 'confirmed' as any,
          },
        });
      }
    }

    return slots;
  };

  const generateSmartAlerts = () => {
    const alerts = [];
    
    // Low booking alert
    if (bookingStats && bookingStats.todayBookings < 3) {
      alerts.push({
        id: 'low-bookings',
        type: 'warning' as const,
        title: t('dashboard.lowBookingsAlert'),
        message: t('dashboard.lowBookingsMessage'),
        icon: 'calendar-alert',
        action: {
          label: t('dashboard.promote'),
          onPress: () => navigation.navigate('More'),
        },
      });
    }

    // High performance alert
    if (performanceMetrics && performanceMetrics.avg_rating >= 4.8) {
      alerts.push({
        id: 'high-rating',
        type: 'success' as const,
        title: t('dashboard.highRatingAlert'),
        message: t('dashboard.highRatingMessage'),
        icon: 'star-circle',
      });
    }

    // Revenue opportunity
    if (performanceMetrics && revenueData.length > 0) {
      const avgRevenue = performanceMetrics.revenue_last_7_days / 7;
      if (performanceMetrics.revenue_today < avgRevenue * 0.7) {
        alerts.push({
          id: 'revenue-opportunity',
          type: 'info' as const,
          title: t('dashboard.revenueOpportunity'),
          message: t('dashboard.revenueOpportunityMessage'),
          icon: 'cash-plus',
          action: {
            label: t('dashboard.viewAnalytics'),
            onPress: () => navigation.navigate('More'),
          },
        });
      }
    }

    // New reviews alert
    if (recentReviews && recentReviews.length > 0) {
      const unreadReviews = recentReviews.filter((r: any) => !r.read_at).length;
      if (unreadReviews > 0) {
        alerts.push({
          id: 'new-reviews',
          type: 'info' as const,
          title: t('dashboard.newReviewsAlert'),
          message: t('dashboard.newReviewsMessage', { count: unreadReviews }),
          icon: 'message-star',
          action: {
            label: t('dashboard.viewReviews'),
            onPress: () => navigation.navigate('Profile'),
          },
        });
      }
    }

    return alerts;
  };

  const generateServicePerformanceData = () => {
    // Mock service performance data - in real app, this would come from analytics
    const services = [
      {
        id: '1',
        name: 'Hair Cut & Style',
        nameAr: 'قص وتصفيف الشعر',
        bookings: 45,
        revenue: 1350,
        rating: 4.8,
        trend: 'up' as const,
        categoryIcon: 'content-cut',
      },
      {
        id: '2',
        name: 'Hair Coloring',
        nameAr: 'صبغة الشعر',
        bookings: 32,
        revenue: 2240,
        rating: 4.9,
        trend: 'up' as const,
        categoryIcon: 'palette',
      },
      {
        id: '3',
        name: 'Manicure & Pedicure',
        nameAr: 'مانيكير وباديكير',
        bookings: 28,
        revenue: 840,
        rating: 4.7,
        trend: 'stable' as const,
        categoryIcon: 'hand-heart',
      },
      {
        id: '4',
        name: 'Facial Treatment',
        nameAr: 'علاج الوجه',
        bookings: 22,
        revenue: 1540,
        rating: 4.6,
        trend: 'down' as const,
        categoryIcon: 'face-woman-shimmer',
      },
      {
        id: '5',
        name: 'Makeup',
        nameAr: 'مكياج',
        bookings: 18,
        revenue: 900,
        rating: 4.9,
        trend: 'up' as const,
        categoryIcon: 'brush',
      },
    ];

    const totalBookings = services.reduce((sum, s) => sum + s.bookings, 0);
    
    return { services, totalBookings };
  };

  const generateClientInsights = () => {
    const insights = [];

    // New clients this week
    if (performanceMetrics && performanceMetrics.new_customers_this_month > 0) {
      insights.push({
        id: 'new-clients',
        type: 'new_client' as const,
        title: t('dashboard.newClientsThisWeek'),
        subtitle: t('dashboard.firstTimeVisitors'),
        clients: [
          { id: '1', name: 'Sarah Ahmed', lastVisit: t('common.today') },
          { id: '2', name: 'Fatima Ali', lastVisit: t('common.yesterday') },
          { id: '3', name: 'Noor Hassan', lastVisit: '3 ' + t('common.daysAgo') },
        ],
        action: {
          label: t('dashboard.sendWelcome'),
          onPress: () => navigation.navigate('More'),
        },
      });
    }

    // VIP clients
    insights.push({
      id: 'vip-clients',
      type: 'vip_client' as const,
      title: t('dashboard.topSpenders'),
      subtitle: t('dashboard.yourMostValuableClients'),
      clients: [
        { id: '4', name: 'Layla Khalil', totalSpent: 850, visitCount: 24 },
        { id: '5', name: 'Maya Saeed', totalSpent: 720, visitCount: 18 },
        { id: '6', name: 'Rania Hamdan', totalSpent: 680, visitCount: 15 },
      ],
      action: {
        label: t('dashboard.rewardLoyalty'),
        onPress: () => navigation.navigate('More'),
      },
    });

    // At risk clients
    insights.push({
      id: 'at-risk',
      type: 'at_risk' as const,
      title: t('dashboard.atRiskClients'),
      subtitle: t('dashboard.haventVisitedRecently'),
      clients: [
        { id: '7', name: 'Dina Rashid', lastVisit: '45 ' + t('common.daysAgo') },
        { id: '8', name: 'Hala Yousef', lastVisit: '38 ' + t('common.daysAgo') },
      ],
      action: {
        label: t('dashboard.reachOut'),
        onPress: () => navigation.navigate('More'),
      },
    });

    // Birthday clients
    insights.push({
      id: 'birthdays',
      type: 'birthday' as const,
      title: t('dashboard.upcomingBirthdays'),
      subtitle: t('dashboard.celebrateWithClients'),
      clients: [
        { id: '9', name: 'Yasmin Abbas', lastVisit: t('dashboard.thisWeek') },
        { id: '10', name: 'Reem Nasser', lastVisit: t('dashboard.nextWeek') },
      ],
      action: {
        label: t('dashboard.sendGreetings'),
        onPress: () => navigation.navigate('More'),
      },
    });

    return insights;
  };
  
  const renderMetricCard = (metric: DashboardMetric) => {
    const isPositive = metric.change >= 0;
    
    return (
      <TouchableOpacity
        key={metric.label}
        style={styles.metricCard}
        onPress={() => {
          // TODO: Add analytics screens to navigation
          console.log('Navigate to', metric.screen);
        }}
        activeOpacity={0.8}
      >
        <Card style={[styles.card, { borderLeftColor: metric.color }]}>
          <Card.Content>
            <View style={styles.metricHeader}>
              <View style={[styles.iconContainer, { backgroundColor: metric.color + '20' }]}>
                <Ionicons name={metric.icon as any} size={24} color={metric.color} />
              </View>
              <View style={styles.changeContainer}>
                <Ionicons
                  name={isPositive ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={isPositive ? colors.success : colors.error}
                />
                <Text style={[
                  styles.changeText,
                  { color: isPositive ? colors.success : colors.error }
                ]}>
                  {Math.abs(metric.change)}%
                </Text>
              </View>
            </View>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.changeLabel}>{metric.changeLabel}</Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };
  
  const renderRevenueChart = () => {
    if (!revenueData || revenueData.length === 0) return null;
    
    // Get last 7 days of revenue
    const last7Days = revenueData.slice(0, 7).reverse();
    
    const data = {
      labels: last7Days.map(d => format(new Date(d.date), 'EEE', { locale })),
      datasets: [{
        data: last7Days.map(d => d.revenue),
      }],
    };
    
    return (
      <Card style={styles.chartCard}>
        <Card.Title
          title={t('dashboard.revenueOverview')}
          right={() => (
            <TouchableOpacity onPress={() => navigation.navigate('More')}>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        />
        <Card.Content>
          <LineChart
            data={data}
            width={screenWidth - 64}
            height={180}
            yAxisLabel=""
            yAxisSuffix=" JD"
            chartConfig={{
              backgroundColor: colors.white,
              backgroundGradientFrom: colors.white,
              backgroundGradientTo: colors.white,
              decimalPlaces: 0,
              color: () => colors.primary,
              labelColor: () => colors.text,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: colors.primary,
              },
            }}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>
    );
  };
  
  const renderUpcomingBookings = () => {
    if (!upcomingBookings || upcomingBookings.length === 0) return null;
    
    return (
      <Card style={styles.bookingsCard}>
        <Card.Title
          title={t('dashboard.upcomingBookings')}
          subtitle={`${upcomingBookings.length} ${t('dashboard.bookingsToday')}`}
          right={() => (
            <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
              <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
            </TouchableOpacity>
          )}
        />
        <Card.Content>
          {upcomingBookings.slice(0, 3).map((booking: any) => (
            <View key={booking.id} style={styles.bookingItem}>
              <View style={styles.bookingTime}>
                <Text style={styles.bookingTimeText}>{booking.time}</Text>
              </View>
              <View style={styles.bookingDetails}>
                <Text style={styles.bookingCustomer}>{booking.customerName}</Text>
                <Text style={styles.bookingService}>{booking.serviceName}</Text>
              </View>
              <View style={styles.bookingStatus}>
                <Text style={styles.bookingPrice}>{booking.price} {t('common.jod')}</Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };
  
  
  const renderBookingStatusChart = () => {
    if (!bookingStats) return null;

    const chartData = [
      { label: t('bookings.status.pending'), value: bookingStats.pending || 0, color: colors.warning },
      { label: t('bookings.status.confirmed'), value: bookingStats.confirmed || 0, color: colors.info },
      { label: t('bookings.status.completed'), value: bookingStats.completed || 0, color: colors.success },
      { label: t('bookings.status.cancelled'), value: bookingStats.cancelled || 0, color: colors.error },
    ].filter(item => item.value > 0);

    if (chartData.length === 0) return null;

    const totalBookings = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
      <Card style={styles.chartCard}>
        <Card.Title
          title={t('dashboard.bookingStatus')}
          subtitle={`${totalBookings} ${t('dashboard.totalBookings')}`}
        />
        <Card.Content>
          <View style={styles.donutChartContainer}>
            <DonutChart
              data={chartData}
              size={180}
              strokeWidth={30}
              centerContent={
                <View style={styles.chartCenterContent}>
                  <Text style={styles.chartCenterValue}>{totalBookings}</Text>
                  <Text style={styles.chartCenterLabel}>{t('common.bookings')}</Text>
                </View>
              }
            />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmployeeSection = () => {
    if (!employeeMetrics || employeeMetrics.total_employees === 0) return null;

    return (
      <Card style={styles.employeeCard}>
        <Card.Title
          title={t('dashboard.employeePerformance')}
          subtitle={`${employeeMetrics.active_employees} ${t('dashboard.activeEmployees')}`}
          right={() => (
            <TouchableOpacity onPress={() => navigation.navigate('More')}>
              <Text style={styles.viewAllText}>{t('dashboard.manage')}</Text>
            </TouchableOpacity>
          )}
        />
        <Card.Content>
          <View style={styles.employeeMetricsGrid}>
            <View style={styles.employeeMetricItem}>
              <Ionicons name="people" size={24} color={colors.primary} />
              <Text style={styles.employeeMetricValue}>
                {employeeMetrics.total_employees}
              </Text>
              <Text style={styles.employeeMetricLabel}>{t('dashboard.totalEmployees')}</Text>
            </View>
            <View style={styles.employeeMetricItem}>
              <Ionicons name="calendar" size={24} color={colors.success} />
              <Text style={styles.employeeMetricValue}>
                {employeeMetrics.total_bookings_today}
              </Text>
              <Text style={styles.employeeMetricLabel}>{t('dashboard.bookingsToday')}</Text>
            </View>
          </View>
          
          {employeeMetrics.top_performer && (
            <View style={styles.topPerformerContainer}>
              <View style={styles.topPerformerHeader}>
                <Ionicons name="star" size={20} color={colors.warning} />
                <Text style={styles.topPerformerTitle}>{t('dashboard.topPerformerToday')}</Text>
              </View>
              <View style={styles.topPerformerInfo}>
                <Text style={styles.topPerformerName}>
                  {employeeMetrics.top_performer.employee_name}
                </Text>
                <View style={styles.topPerformerStats}>
                  <Text style={styles.topPerformerStat}>
                    {employeeMetrics.top_performer.bookings_today} {t('common.bookings')}
                  </Text>
                  <Text style={styles.topPerformerDivider}>•</Text>
                  <Text style={styles.topPerformerStat}>
                    {employeeMetrics.top_performer.revenue_today} {t('common.jod')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? colors.warning : colors.gray}
        />
      );
    }
    return <View style={styles.ratingStars}>{stars}</View>;
  };

  const renderRecentReviews = () => {
    if (!recentReviews || recentReviews.length === 0) return null;

    return (
      <Card style={styles.reviewsCard}>
        <Card.Title
          title={t('dashboard.recentReviews')}
          subtitle={`${performanceMetrics?.avg_rating || 0} ${t('dashboard.averageRating')}`}
          right={() => (
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
            </TouchableOpacity>
          )}
        />
        <Card.Content>
          {recentReviews.map((review, index) => (
            <View key={review.id} style={[
              styles.reviewItem,
              index === recentReviews.length - 1 && styles.lastReviewItem
            ]}>
              <View style={styles.reviewHeader}>
                <View>
                  <Text style={styles.reviewerName}>{review.user?.name || t('dashboard.anonymous')}</Text>
                  <View style={styles.reviewMeta}>
                    {renderRatingStars(review.rating)}
                    <Text style={styles.reviewDate}>
                      {format(new Date(review.created_at), 'dd MMM', { locale })}
                    </Text>
                  </View>
                </View>
                {review.service && (
                  <Text style={styles.reviewService}>
                    {i18n.language === 'ar' ? review.service.name_ar : review.service.name_en}
                  </Text>
                )}
              </View>
              {review.comment && (
                <Text style={styles.reviewComment} numberOfLines={2}>
                  {review.comment}
                </Text>
              )}
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderInsights = () => {
    // Generate insights based on actual data
    const insights = [];
    
    if (bookingStats?.todayBookings > 5) {
      insights.push({
        type: 'positive',
        message: t('analytics.insight1')
      });
    }
    
    if (performanceMetrics?.avg_rating >= 4.5) {
      insights.push({
        type: 'positive',
        message: t('analytics.insight2')
      });
    }
    
    if (bookingStats?.monthRevenue > 1000) {
      insights.push({
        type: 'positive',
        message: t('analytics.insight3')
      });
    }
    
    if (insights.length === 0) return null;
    
    return (
      <Card style={styles.insightsCard}>
        <Card.Title title={t('dashboard.todayInsights')} />
        <Card.Content>
          {insights.map((insight: any, index: number) => (
            <View key={index} style={styles.insightItem}>
              <Ionicons
                name={insight.type === 'positive' ? 'checkmark-circle' : 'information-circle'}
                size={20}
                color={insight.type === 'positive' ? colors.success : colors.warning}
              />
              <Text style={styles.insightText}>{insight.message}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  // Show message if no provider profile exists
  if (!providerId) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.gray} />
        <Text style={styles.noProviderText}>{t('dashboard.noProviderProfile')}</Text>
        <Text style={styles.noProviderSubtext}>{t('dashboard.pleaseCompleteProfile')}</Text>
      </View>
    );
  }
  
  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greetingText, { color: theme.colors.onSurfaceVariant }]}>
              {t('dashboard.goodMorning')}
            </Text>
            <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
              {user?.name}
            </Text>
            <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
              {format(new Date(), 'EEEE, d MMMM', { locale })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <LanguageToggleButton style={{ marginRight: 16 }} />
            <TouchableOpacity onPress={() => navigation.navigate('More')}>
              <View style={styles.notificationIcon}>
                <Ionicons name="notifications-outline" size={24} color={theme.colors.onSurface} />
                {notificationCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: theme.colors.error }]}>
                    <Text style={styles.notificationBadgeText}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      
      <View style={styles.periodSelector}>
        {(['today', 'week', 'month'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && [styles.selectedPeriodButton, { backgroundColor: theme.colors.primary }],
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              { color: theme.colors.onSurfaceVariant },
              selectedPeriod === period && [styles.selectedPeriodButtonText, { color: theme.colors.onPrimary }],
            ]}>
              {t(`common.${period}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Business Health Score */}
        {calculateBusinessHealthScore() && (
          <BusinessHealthScore {...calculateBusinessHealthScore()!} />
        )}
        
        {/* Smart Alerts */}
        <SmartAlerts alerts={generateSmartAlerts()} />
        
        {/* Schedule Timeline */}
        <ScheduleTimeline
          slots={generateScheduleSlots(selectedPeriod)}
          period={selectedPeriod}
          onSlotPress={(slot) => {
            if (slot.booking) {
              navigation.navigate('BookingDetails', { bookingId: slot.booking.id });
            } else if (!slot.isBreak && !slot.isPast) {
              navigation.navigate('CreateBooking');
            }
          }}
          onAddPress={() => navigation.navigate('CreateBooking')}
        />
        
        {/* Quick Actions */}
        <QuickActions
          style="inline"
          visible={quickActionsVisible}
          onToggle={() => setQuickActionsVisible(!quickActionsVisible)}
        />
        
        {/* Quick Stats Grid */}
        <QuickStatsGrid stats={getQuickStats()} />
        
        {/* Service Performance */}
        <ServicePerformance 
          {...generateServicePerformanceData()}
          onServicePress={() => navigation.navigate('Services')}
          onViewAllPress={() => navigation.navigate('Services')}
        />
        
        {/* Client Insights */}
        <ClientInsights 
          insights={generateClientInsights()}
          onClientPress={() => navigation.navigate('More')}
        />
        
        {/* Keep existing components temporarily */}
        {renderRevenueChart()}
        {renderUpcomingBookings()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  date: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 6,
  },
  notificationIcon: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedPeriodButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  scrollContent: {
    paddingVertical: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: (screenWidth - 40) / 2,
    padding: 8,
  },
  card: {
    borderLeftWidth: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  changeLabel: {
    fontSize: 12,
    color: colors.gray,
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  bookingsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 16,
  },
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bookingTime: {
    width: 60,
    alignItems: 'center',
  },
  bookingTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bookingDetails: {
    flex: 1,
    marginLeft: 12,
  },
  bookingCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bookingService: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  bookingStatus: {
    alignItems: 'flex-end',
  },
  bookingPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // Commented out - now using QuickActions component styles
  // quickActionsContainer: {
  //   paddingHorizontal: 16,
  //   marginBottom: 16,
  // },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  // quickActionsGrid: {
  //   flexDirection: 'row',
  //   flexWrap: 'wrap',
  //   gap: 12,
  // },
  // quickAction: {
  //   width: (screenWidth - 44) / 4,
  //   alignItems: 'center',
  // },
  // quickActionIcon: {
  //   width: 48,
  //   height: 48,
  //   borderRadius: 24,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   marginBottom: 8,
  // },
  // quickActionLabel: {
  //   fontSize: 12,
  //   color: colors.text,
  //   textAlign: 'center',
  // },
  insightsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  bottomPadding: {
    height: spacing.lg,
  },
  noProviderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  noProviderSubtext: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  employeeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  employeeMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  employeeMetricItem: {
    alignItems: 'center',
  },
  employeeMetricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  employeeMetricLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
  },
  topPerformerContainer: {
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: 12,
  },
  topPerformerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  topPerformerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  topPerformerInfo: {
    marginLeft: 28,
  },
  topPerformerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  topPerformerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  topPerformerStat: {
    fontSize: 14,
    color: colors.gray,
  },
  topPerformerDivider: {
    marginHorizontal: 8,
    color: colors.gray,
  },
  donutChartContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  chartCenterContent: {
    alignItems: 'center',
  },
  chartCenterValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  chartCenterLabel: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  reviewsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastReviewItem: {
    borderBottomWidth: 0,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.gray,
  },
  reviewService: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});