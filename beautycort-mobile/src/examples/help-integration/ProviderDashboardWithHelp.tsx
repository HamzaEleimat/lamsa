import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import HelpIntegrationWrapper from '../../components/help/HelpIntegrationWrapper';
import { useScreenHelp } from '../../contexts/HelpContext';

// Example integration of help system into Provider Dashboard
export default function ProviderDashboardWithHelp() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [dashboardData, setDashboardData] = useState({
    todayBookings: 0,
    weeklyRevenue: 0,
    monthlyBookings: 0,
    rating: 0,
    completedServices: 0,
    pendingBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Use screen-specific help with dashboard state
  const screenHelp = useScreenHelp('ProviderDashboard', {
    hasBookings: dashboardData.todayBookings > 0,
    weeklyRevenue: dashboardData.weeklyRevenue,
    isNewProvider: dashboardData.completedServices < 5,
    hasRating: dashboardData.rating > 0,
    profileComplete: user?.profileComplete || false,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Mock dashboard data for demo
      setDashboardData({
        todayBookings: 2,
        weeklyRevenue: 150,
        monthlyBookings: 12,
        rating: 4.7,
        completedServices: 8,
        pendingBookings: 1,
      });
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

  // Custom help actions for dashboard
  const customHelpActions = [
    {
      id: 'dashboard-tour',
      title: 'Dashboard Overview Tour',
      titleAr: 'جولة نظرة عامة على لوحة التحكم',
      icon: 'map',
      action: () => {
        screenHelp.startTour('dashboard-overview');
      },
      color: colors.primary,
    },
    {
      id: 'analytics-help',
      title: 'Understanding Your Analytics',
      titleAr: 'فهم تحليلاتك',
      icon: 'bar-chart',
      action: () => {
        screenHelp.markContentViewed('analytics-guide');
        navigation.navigate('VideoTutorials', { videoId: 'analytics-deep-dive' });
      },
      color: colors.secondary,
    },
    {
      id: 'booking-management',
      title: 'Managing Bookings',
      titleAr: 'إدارة الحجوزات',
      icon: 'calendar',
      action: () => {
        screenHelp.markContentViewed('booking-management-guide');
        navigation.navigate('BestPractices', { section: 'booking-management' });
      },
      color: colors.warning,
    },
    {
      id: 'revenue-tips',
      title: 'Increase Your Revenue',
      titleAr: 'زيادة إيراداتك',
      icon: 'trending-up',
      action: () => {
        screenHelp.markContentViewed('revenue-optimization');
        navigation.navigate('CommunityTips', { category: 'growth' });
      },
      color: colors.success,
    },
  ];

  const helpContent = {
    title: 'Dashboard Help',
    titleAr: 'مساعدة لوحة التحكم',
    description: 'Learn how to use your dashboard to track performance and grow your business',
    descriptionAr: 'تعلم كيفية استخدام لوحة التحكم لتتبع الأداء وتنمية عملك',
  };

  const renderMetricCard = (
    title: string,
    titleAr: string,
    value: string | number,
    icon: string,
    color: string,
    onPress?: () => void,
    helpId?: string
  ) => (
    <Card style={[styles.metricCard, { borderLeftColor: color }]}>
      <TouchableOpacity
        style={styles.metricContent}
        onPress={() => {
          if (helpId) {
            screenHelp.trackHelpInteraction('metric_viewed', helpId);
          }
          onPress?.();
        }}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.metricHeader}>
          <View style={[styles.metricIcon, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon as any} size={24} color={color} />
          </View>
          {onPress && (
            <TouchableOpacity
              style={styles.metricHelp}
              onPress={() => {
                screenHelp.markContentViewed(`${helpId}-help`);
                navigation.navigate('VideoTutorials', { search: titleAr });
              }}
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>
          {isRTL ? titleAr : title}
        </Text>
      </TouchableOpacity>
    </Card>
  );

  const renderQuickAction = (title: string, titleAr: string, icon: string, onPress: () => void, helpTip?: string) => (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={() => {
        screenHelp.trackHelpInteraction('quick_action', title.toLowerCase().replace(' ', '_'));
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon as any} size={24} color={colors.primary} />
      </View>
      <Text style={styles.quickActionText}>
        {isRTL ? titleAr : title}
      </Text>
      {helpTip && (
        <View style={styles.helpTip}>
          <Ionicons name="help-circle" size={12} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );

  // Show onboarding tips for new providers
  const renderOnboardingTips = () => {
    if (screenHelp.shouldShowOnboarding() || dashboardData.completedServices < 5) {
      return (
        <Card style={styles.onboardingCard}>
          <View style={styles.onboardingContent}>
            <View style={styles.onboardingHeader}>
              <Ionicons name="star" size={24} color={colors.warning} />
              <Text style={styles.onboardingTitle}>
                {t('welcomeToBeautyCort')}
              </Text>
            </View>
            <Text style={styles.onboardingDescription}>
              {t('getStartedWithTheseTips')}
            </Text>
            <View style={styles.onboardingActions}>
              <TouchableOpacity
                style={styles.onboardingAction}
                onPress={() => {
                  screenHelp.startTour('provider-onboarding');
                }}
              >
                <Ionicons name="play-circle" size={16} color={colors.primary} />
                <Text style={styles.onboardingActionText}>{t('startTour')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.onboardingAction}
                onPress={() => {
                  navigation.navigate('BestPractices');
                }}
              >
                <Ionicons name="book" size={16} color={colors.secondary} />
                <Text style={styles.onboardingActionText}>{t('readGuide')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      );
    }
    return null;
  };

  return (
    <HelpIntegrationWrapper
      screenName="ProviderDashboard"
      userState={{
        hasBookings: dashboardData.todayBookings > 0,
        weeklyRevenue: dashboardData.weeklyRevenue,
        isNewProvider: dashboardData.completedServices < 5,
        hasRating: dashboardData.rating > 0,
        profileComplete: user?.profileComplete || false,
      }}
      showHelpButton={true}
      helpButtonPosition="floating"
      helpButtonSize="medium"
      showTooltips={true}
      helpContent={helpContent}
      customHelpActions={customHelpActions}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>
              {t('goodMorning')} {user?.name}! 👋
            </Text>
            <Text style={styles.headerSubtitle}>
              {t('dashboardSubtitle')}
            </Text>
          </View>
          
          {/* Header help button for quick access */}
          <TouchableOpacity
            style={styles.headerHelpButton}
            onPress={() => {
              screenHelp.markContentViewed('dashboard-quick-help');
              navigation.navigate('FAQScreen', { category: 'dashboard' });
            }}
          >
            <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Onboarding Tips */}
          {renderOnboardingTips()}

          {/* Key Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('todayOverview')}</Text>
            <View style={styles.metricsRow}>
              {renderMetricCard(
                'Today Bookings',
                'حجوزات اليوم',
                dashboardData.todayBookings,
                'calendar',
                colors.primary,
                () => navigation.navigate('BookingManagement'),
                'today_bookings'
              )}
              {renderMetricCard(
                'Pending',
                'معلقة',
                dashboardData.pendingBookings,
                'time',
                colors.warning,
                () => navigation.navigate('BookingManagement', { filter: 'pending' }),
                'pending_bookings'
              )}
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('thisWeekPerformance')}</Text>
              <TouchableOpacity
                style={styles.sectionHelp}
                onPress={() => {
                  screenHelp.markContentViewed('performance-metrics-help');
                  navigation.navigate('VideoTutorials', { videoId: 'analytics-deep-dive' });
                }}
              >
                <Ionicons name="help-circle-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.sectionHelpText}>{t('learnMore')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricsRow}>
              {renderMetricCard(
                'Revenue',
                'الإيرادات',
                `${dashboardData.weeklyRevenue} ${t('jod')}`,
                'wallet',
                colors.success,
                () => navigation.navigate('RevenueAnalytics'),
                'weekly_revenue'
              )}
              {renderMetricCard(
                'Rating',
                'التقييم',
                `${dashboardData.rating}/5`,
                'star',
                colors.warning,
                () => navigation.navigate('ReviewsAndRatings'),
                'provider_rating'
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
            <View style={styles.quickActionsGrid}>
              {renderQuickAction(
                'Add Service',
                'إضافة خدمة',
                'add-circle',
                () => navigation.navigate('AddService'),
                'Learn about effective service creation'
              )}
              {renderQuickAction(
                'View Schedule',
                'عرض الجدول',
                'calendar',
                () => navigation.navigate('WeeklyAvailability'),
                'Manage your availability'
              )}
              {renderQuickAction(
                'Analytics',
                'التحليلات',
                'bar-chart',
                () => navigation.navigate('Analytics'),
                'Understand your business data'
              )}
              {renderQuickAction(
                'Messages',
                'الرسائل',
                'chatbubbles',
                () => navigation.navigate('Messages'),
                'Communicate with customers'
              )}
            </View>
          </View>

          {/* Contextual Help Based on Provider State */}
          {screenHelp.contextualHelp.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('recommendedForYou')}</Text>
              {screenHelp.contextualHelp.slice(0, 2).map((helpItem, index) => (
                <Card key={index} style={styles.helpSuggestionCard}>
                  <TouchableOpacity
                    style={styles.helpSuggestionContent}
                    onPress={() => {
                      screenHelp.markContentViewed(helpItem.id);
                      navigation.navigate('HelpContent', { contentId: helpItem.id });
                    }}
                  >
                    <View style={styles.helpSuggestionIcon}>
                      <Ionicons name="lightbulb" size={20} color={colors.warning} />
                    </View>
                    <View style={styles.helpSuggestionText}>
                      <Text style={styles.helpSuggestionTitle}>
                        {isRTL ? helpItem.titleAr : helpItem.title}
                      </Text>
                      <Text style={styles.helpSuggestionDescription}>
                        {isRTL ? helpItem.descriptionAr : helpItem.description}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </HelpIntegrationWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  headerHelpButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  onboardingCard: {
    margin: 20,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  onboardingContent: {
    padding: 16,
  },
  onboardingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  onboardingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  onboardingDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  onboardingActions: {
    flexDirection: 'row',
    gap: 16,
  },
  onboardingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  onboardingActionText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionHelp: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHelpText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  metricContent: {
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricHelp: {
    padding: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
  },
  helpTip: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  helpSuggestionCard: {
    marginBottom: 8,
    backgroundColor: colors.warning + '08',
    borderWidth: 1,
    borderColor: colors.warning + '20',
  },
  helpSuggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  helpSuggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  helpSuggestionText: {
    flex: 1,
  },
  helpSuggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  helpSuggestionDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
});