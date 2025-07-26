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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import { providerBookingService } from '../../services/providerBookingService';
import { LineChart } from 'react-native-chart-kit';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

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
  
  useEffect(() => {
    fetchProviderId();
  }, [user]);
  
  useEffect(() => {
    if (providerId) {
      loadDashboardData();
    }
  }, [providerId, selectedPeriod]);
  
  const fetchProviderId = async () => {
    if (!user?.email) return;
    
    try {
      // Import supabase from services
      const { supabase } = await import('../../services/supabase');
      
      // Get provider ID from providers table using email
      const { data, error } = await supabase
        .from('providers')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (error) {
        console.error('Error fetching provider ID:', error);
        return;
      }
      
      if (data) {
        setProviderId(data.id);
      }
    } catch (error) {
      console.error('Error in fetchProviderId:', error);
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
      const [metrics, stats, revenue, todayBookings] = await Promise.all([
        analyticsService.getPerformanceMetrics(providerId),
        providerBookingService.getBookingStats(providerId),
        analyticsService.getDailyRevenue(providerId, 30),
        providerBookingService.getTodayUpcomingBookings(providerId)
      ]);
      
      setPerformanceMetrics(metrics);
      setBookingStats(stats);
      setRevenueData(revenue);
      setUpcomingBookings(todayBookings);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };
  
  const metrics: DashboardMetric[] = performanceMetrics && bookingStats ? [
    {
      label: t('todayRevenue'),
      value: `${performanceMetrics.revenue_today.toFixed(2)} ${t('jod')}`,
      change: calculatePercentageChange(performanceMetrics.revenue_today, performanceMetrics.revenue_last_7_days / 7),
      changeLabel: t('vsAverage'),
      icon: 'cash',
      color: colors.success,
      screen: 'RevenueAnalytics',
    },
    {
      label: t('todayBookings'),
      value: bookingStats.todayBookings.toString(),
      change: calculatePercentageChange(bookingStats.todayBookings, bookingStats.weekBookings / 7),
      changeLabel: t('vsAverage'),
      icon: 'calendar',
      color: colors.primary,
      screen: 'BookingAnalytics',
    },
    {
      label: t('totalCustomers'),
      value: performanceMetrics.unique_customers.toString(),
      change: calculatePercentageChange(performanceMetrics.new_customers_last_30_days, performanceMetrics.unique_customers / 12),
      changeLabel: t('newThisMonth'),
      icon: 'people',
      color: colors.info,
      screen: 'CustomerAnalytics',
    },
    {
      label: t('avgRating'),
      value: performanceMetrics.avg_rating.toFixed(1),
      change: 0, // Rating changes are typically small
      changeLabel: `${performanceMetrics.total_reviews} ${t('reviews')}`,
      icon: 'star',
      color: colors.warning,
      screen: 'PerformanceAnalytics',
    },
  ] : [];
  
  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  
  const quickActions: QuickAction[] = [
    {
      label: t('viewAllBookings'),
      icon: 'calendar-sharp',
      color: colors.primary,
      screen: 'BookingsList',
    },
    {
      label: t('addService'),
      icon: 'add-circle',
      color: colors.success,
      screen: 'ServiceForm',
    },
    {
      label: t('viewReviews'),
      icon: 'star',
      color: colors.warning,
      screen: 'ReviewsList',
    },
    {
      label: t('notifications'),
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
          title={t('revenueOverview')}
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
          title={t('upcomingBookings')}
          subtitle={`${upcomingBookings.length} ${t('bookingsToday')}`}
          right={(props) => (
            <TouchableOpacity onPress={() => navigation.navigate('Bookings' as any)}>
              <Text style={styles.viewAllText}>{t('viewAll')}</Text>
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
                <Text style={styles.bookingPrice}>{booking.price} {t('jod')}</Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };
  
  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
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
  
  const renderInsights = () => {
    if (!dashboardData?.insights) return null;
    
    return (
      <Card style={styles.insightsCard}>
        <Card.Title title={t('todayInsights')} />
        <Card.Content>
          {dashboardData.insights.map((insight: any, index: number) => (
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
        <Text style={styles.noProviderText}>{t('noProviderProfile')}</Text>
        <Text style={styles.noProviderSubtext}>{t('pleaseCompleteProfile')}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {t('goodMorning')}, {user?.name}
          </Text>
          <Text style={styles.date}>
            {format(new Date(), 'EEEE, d MMMM', { locale })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('NotificationCenter' as any)}>
          <View style={styles.notificationIcon}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {dashboardData?.unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {dashboardData.unreadNotifications}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
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
              {t(period)}
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
        {renderUpcomingBookings()}
        {renderQuickActions()}
        {renderInsights()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: colors.white,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  date: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
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
    paddingVertical: 8,
    gap: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
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
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  metricCard: {
    width: (screenWidth - 32) / 2,
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
});