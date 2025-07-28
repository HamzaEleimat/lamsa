import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  I18nManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnhancedService, ServiceAnalytics } from '../../types/service.types';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  overview: {
    totalServices: number;
    activeServices: number;
    totalBookings: number;
    totalRevenue: number;
    avgRating: number;
    conversionRate: number;
  };
  trends: {
    labels: string[];
    bookings: number[];
    revenue: number[];
    views: number[];
  };
  topServices: Array<{
    service: EnhancedService;
    bookings: number;
    revenue: number;
    views: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    percentage: number;
    color: string;
  }>;
}

export default function ServiceAnalyticsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isRTL = I18nManager.isRTL;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'bookings' | 'revenue' | 'views'>('bookings');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/analytics?period=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.data);
      } else {
        Alert.alert(t('common.error'), t('analytics.failedToLoadAnalytics'));
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert(t('common.error'), t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/analytics/export?period=${selectedPeriod}&format=pdf`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        Alert.alert(t('common.success'), t('analytics.analyticsExported'));
      } else {
        Alert.alert(t('common.error'), t('analytics.failedToExportAnalytics'));
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      Alert.alert(t('common.error'), t('common.somethingWentWrong'));
    }
  };

  const renderOverviewCard = (title: string, value: string, subtitle: string, icon: string, color: string) => (
    <View style={[styles.overviewCard, { borderLeftColor: color }]}>
      <View style={styles.overviewCardContent}>
        <View style={styles.overviewCardHeader}>
          <Text style={styles.overviewCardTitle}>{title}</Text>
          <View style={[styles.overviewCardIcon, { backgroundColor: color }]}>
            <Ionicons name={icon as any} size={20} color={colors.white} />
          </View>
        </View>
        <Text style={styles.overviewCardValue}>{value}</Text>
        <Text style={styles.overviewCardSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );

  const renderTrendsChart = () => {
    if (!analyticsData?.trends) return null;

    const data = {
      labels: analyticsData.trends.labels,
      datasets: [
        {
          data: analyticsData.trends[selectedMetric],
          color: (opacity = 1) => colors.primary,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('analytics.trends')}</Text>
          <View style={styles.metricSelector}>
            {['bookings', 'revenue', 'views'].map(metric => (
              <TouchableOpacity
                key={metric}
                style={[
                  styles.metricButton,
                  selectedMetric === metric && styles.selectedMetricButton,
                ]}
                onPress={() => setSelectedMetric(metric as any)}
              >
                <Text style={[
                  styles.metricButtonText,
                  selectedMetric === metric && styles.selectedMetricButtonText,
                ]}>
                  {t(`analytics.${metric}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <LineChart
          data={data}
          width={width - 32}
          height={220}
          yAxisLabel={selectedMetric === 'revenue' ? t('common.jod') + ' ' : ''}
          chartConfig={{
            backgroundColor: colors.white,
            backgroundGradientFrom: colors.white,
            backgroundGradientTo: colors.white,
            decimalPlaces: selectedMetric === 'revenue' ? 2 : 0,
            color: (opacity = 1) => colors.primary,
            labelColor: (opacity = 1) => colors.text,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: colors.primary,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderTopServicesChart = () => {
    if (!analyticsData?.topServices || analyticsData.topServices.length === 0) return null;

    const data = {
      labels: analyticsData.topServices.slice(0, 5).map(item => 
        i18n.language === 'ar' ? item.service.name_ar : item.service.name_en
      ),
      datasets: [
        {
          data: analyticsData.topServices.slice(0, 5).map(item => item.bookings),
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{t('analytics.topServices')}</Text>
        <BarChart
          data={data}
          width={width - 32}
          height={220}
          yAxisLabel=""
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
          }}
          style={styles.chart}
        />
      </View>
    );
  };

  const renderCategoryBreakdown = () => {
    if (!analyticsData?.categoryBreakdown || analyticsData.categoryBreakdown.length === 0) return null;

    const data = analyticsData.categoryBreakdown.map(item => ({
      name: item.category,
      population: item.count,
      color: item.color,
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{t('analytics.categoryBreakdown')}</Text>
        <PieChart
          data={data}
          width={width - 32}
          height={220}
          chartConfig={{
            backgroundColor: colors.white,
            backgroundGradientFrom: colors.white,
            backgroundGradientTo: colors.white,
            color: (opacity = 1) => colors.primary,
            labelColor: (opacity = 1) => colors.text,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </View>
    );
  };

  const renderServicesList = () => {
    if (!analyticsData?.topServices || analyticsData.topServices.length === 0) return null;

    return (
      <View style={styles.servicesListContainer}>
        <View style={styles.servicesListHeader}>
          <Text style={styles.servicesListTitle}>{t('analytics.servicePerformance')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ServiceList')}>
            <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
          </TouchableOpacity>
        </View>
        
        {analyticsData.topServices.slice(0, 10).map((item, index) => (
          <View key={item.service.id} style={styles.serviceItem}>
            <View style={styles.serviceItemRank}>
              <Text style={styles.serviceRankText}>{index + 1}</Text>
            </View>
            <View style={styles.serviceItemInfo}>
              <Text style={styles.serviceItemName} numberOfLines={1}>
                {i18n.language === 'ar' ? item.service.name_ar : item.service.name_en}
              </Text>
              <Text style={styles.serviceItemPrice}>
                {item.service.price} {t('common.jod')}
              </Text>
            </View>
            <View style={styles.serviceItemStats}>
              <View style={styles.serviceItemStat}>
                <Ionicons name="calendar-outline" size={14} color={colors.gray} />
                <Text style={styles.serviceItemStatValue}>{item.bookings}</Text>
              </View>
              <View style={styles.serviceItemStat}>
                <Ionicons name="cash-outline" size={14} color={colors.gray} />
                <Text style={styles.serviceItemStatValue}>{item.revenue}</Text>
              </View>
              <View style={styles.serviceItemStat}>
                <Ionicons name="eye-outline" size={14} color={colors.gray} />
                <Text style={styles.serviceItemStatValue}>{item.views}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('analytics.serviceAnalytics')}</Text>
        <TouchableOpacity onPress={handleExport}>
          <Ionicons name="download-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {['7d', '30d', '90d'].map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.selectedPeriodButton,
            ]}
            onPress={() => setSelectedPeriod(period as any)}
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
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Overview Cards */}
        {analyticsData && (
          <>
            <View style={styles.overviewContainer}>
              {renderOverviewCard(
                t('analytics.totalServices'),
                analyticsData.overview.totalServices.toString(),
                `${analyticsData.overview.activeServices} ${t('common.active')}`,
                'grid-outline',
                colors.primary
              )}
              {renderOverviewCard(
                t('analytics.totalBookings'),
                analyticsData.overview.totalBookings.toString(),
                t('common.thisMonth'),
                'calendar-outline',
                colors.success
              )}
              {renderOverviewCard(
                t('analytics.totalRevenue'),
                `${analyticsData.overview.totalRevenue} ${t('common.jod')}`,
                t('common.thisMonth'),
                'cash-outline',
                colors.warning
              )}
              {renderOverviewCard(
                t('analytics.conversionRate'),
                `${analyticsData.overview.conversionRate.toFixed(1)}%`,
                t('analytics.viewsToBookings'),
                'trending-up-outline',
                colors.secondary
              )}
            </View>

            {/* Charts */}
            {renderTrendsChart()}
            {renderTopServicesChart()}
            {renderCategoryBreakdown()}
            
            {/* Services List */}
            {renderServicesList()}
          </>
        )}
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: colors.white,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
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
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: (width - 44) / 2,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  overviewCardContent: {
    flex: 1,
  },
  overviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewCardTitle: {
    fontSize: 14,
    color: colors.gray,
    flex: 1,
  },
  overviewCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  overviewCardSubtitle: {
    fontSize: 12,
    color: colors.gray,
  },
  chartContainer: {
    backgroundColor: colors.white,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  metricSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  metricButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
  },
  selectedMetricButton: {
    backgroundColor: colors.primary,
  },
  metricButtonText: {
    fontSize: 12,
    color: colors.text,
  },
  selectedMetricButtonText: {
    color: colors.white,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  servicesListContainer: {
    backgroundColor: colors.white,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  servicesListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  servicesListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  serviceItemRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  serviceItemInfo: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  serviceItemPrice: {
    fontSize: 12,
    color: colors.gray,
  },
  serviceItemStats: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceItemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceItemStatValue: {
    fontSize: 12,
    color: colors.gray,
  },
});