import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import { providerBookingService } from '../../services/providerBookingService';
import { getProviderIdForUser } from '../../utils/providerUtils';
import { handleSupabaseError, logError } from '../../utils/errorHandler';
import { LineChart } from 'react-native-chart-kit';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import LanguageToggleButton from '../../components/LanguageToggleButton';
import { notificationService } from '../../services/notificationService';
import { employeeService } from '../../services/employeeService';
import { reviewService } from '../../services/reviewService';
import DonutChart from '../../components/charts/DonutChart';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardMetric {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: string;
  color: string;
  screen?: string;
}

interface QuickAction {
  label: string;
  icon: string;
  color: string;
  screen: string;
}

export default function ProviderDashboardScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
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
  
  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
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
      screen: 'RevenueAnalytics',
    },
    {
      label: t('dashboard.todayBookings'),
      value: bookingStats.todayBookings.toString(),
      change: calculatePercentageChange(bookingStats.todayBookings, bookingStats.weekBookings / 7),
      changeLabel: t('dashboard.vsAverage'),
      icon: 'calendar',
      color: colors.primary,
      screen: 'BookingAnalytics',
    },
    {
      label: t('dashboard.totalCustomers'),
      value: performanceMetrics.unique_customers.toString(),
      change: calculatePercentageChange(performanceMetrics.new_customers_last_30_days, performanceMetrics.unique_customers / 12),
      changeLabel: t('dashboard.newThisMonth'),
      icon: 'people',
      color: colors.info,
      screen: 'CustomerAnalytics',
    },
    {
      label: t('dashboard.avgRating'),
      value: performanceMetrics.avg_rating.toFixed(1),
      change: 0, // Rating changes are typically small
      changeLabel: `${performanceMetrics.total_reviews} ${t('common.reviews')}`,
      icon: 'star',
      color: colors.warning,
      screen: 'PerformanceAnalytics',
    },
  ] : [];
  
  const quickActions: QuickAction[] = [
    {
      label: t('dashboard.viewAllBookings'),
      icon: 'calendar-sharp',
      color: colors.primary,
      screen: 'BookingsList',
    },
    {
      label: t('dashboard.addService'),
      icon: 'add-circle',
      color: colors.success,
      screen: 'ServiceForm',
    },
    {
      label: t('dashboard.viewReviews'),
      icon: 'star',
      color: colors.warning,
      screen: 'ReviewsList',
    },
    {
      label: t('settings.notificationsText'),
      icon: 'notifications',
      color: colors.secondary,
      screen: 'NotificationPreferences',
    },
  ];
  
  const renderMetricCard = (metric: DashboardMetric) => {
    const isPositive = metric.change >= 0;
    
    return (
      <TouchableOpacity
        key={metric.label}
        style={styles.metricCard}
        onPress={() => metric.screen && navigation.navigate(metric.screen as any)}
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
          right={(props) => (
            <TouchableOpacity onPress={() => navigation.navigate('RevenueAnalytics' as any)}>
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
              color: (opacity = 1) => colors.primary,
              labelColor: (opacity = 1) => colors.text,
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
          right={(props) => (
            <TouchableOpacity onPress={() => navigation.navigate('Bookings' as any)}>
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
  
  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.quickAction}
            onPress={() => navigation.navigate(action.screen as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon as any} size={24} color={action.color} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
  
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
          right={(props) => (
            <TouchableOpacity onPress={() => navigation.navigate('EmployeeList' as any)}>
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
          right={(props) => (
            <TouchableOpacity onPress={() => navigation.navigate('ReviewsList' as any)}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>
            {t('dashboard.goodMorning')}
          </Text>
          <Text style={styles.userName}>
            {user?.name}
          </Text>
          <Text style={styles.date}>
            {format(new Date(), 'EEEE, d MMMM', { locale })}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <LanguageToggleButton style={{ marginRight: 16 }} />
          <TouchableOpacity onPress={() => navigation.navigate('NotificationCenter' as any)}>
            <View style={styles.notificationIcon}>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
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
              selectedPeriod === period && styles.selectedPeriodButton,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.selectedPeriodButtonText,
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
        <View style={styles.metricsGrid}>
          {metrics.map(renderMetricCard)}
        </View>
        
        {renderRevenueChart()}
        {renderBookingStatusChart()}
        {renderEmployeeSection()}
        {renderUpcomingBookings()}
        {renderRecentReviews()}
        {renderQuickActions()}
        {renderInsights()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.white,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
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
    paddingVertical: 16,
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
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: (screenWidth - 44) / 4,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
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
    height: 100,
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