import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, Card, ActivityIndicator, SegmentedButtons, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import { ProviderAnalyticsService, BookingAnalytics } from '../../services/analytics/ProviderAnalyticsService';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { startOfMonth, endOfMonth } from 'date-fns';

const { width: screenWidth } = Dimensions.get('window');

export default function BookingAnalyticsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState<BookingAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedView, setSelectedView] = useState<'overview' | 'patterns' | 'services'>('overview');
  
  const analyticsService = ProviderAnalyticsService.getInstance();
  
  useEffect(() => {
    loadBookingData();
  }, [selectedPeriod]);
  
  const loadBookingData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const range = analyticsService.getDateRange(selectedPeriod as any);
      const data = await analyticsService.getBookingAnalytics(user.id, range.start, range.end);
      setBookingData(data);
    } catch (error) {
      console.error('Error loading booking data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderOverviewMetrics = () => {
    if (!bookingData) return null;
    
    const completionRate = bookingData.totalBookings > 0
      ? ((bookingData.completedBookings / bookingData.totalBookings) * 100).toFixed(1)
      : '0';
    
    return (
      <View style={styles.metricsContainer}>
        <Card style={styles.metricCard}>
          <Card.Content>
            <View style={styles.metricHeader}>
              <Ionicons name="calendar" size={24} color={theme.colors.primary} />
              <Text style={styles.metricLabel}>{t('totalBookings')}</Text>
            </View>
            <Text style={styles.metricValue}>{bookingData.totalBookings}</Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.metricCard}>
          <Card.Content>
            <View style={styles.metricHeader}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              <Text style={styles.metricLabel}>{t('completionRate')}</Text>
            </View>
            <Text style={styles.metricValue}>{completionRate}%</Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.metricCard}>
          <Card.Content>
            <View style={styles.metricHeader}>
              <Ionicons name="close-circle" size={24} color={theme.colors.error} />
              <Text style={styles.metricLabel}>{t('cancellationRate')}</Text>
            </View>
            <Text style={styles.metricValue}>{bookingData.cancellationRate.toFixed(1)}%</Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.metricCard}>
          <Card.Content>
            <View style={styles.metricHeader}>
              <Ionicons name="time" size={24} color={theme.colors.tertiary} />
              <Text style={styles.metricLabel}>{t('avgDuration')}</Text>
            </View>
            <Text style={styles.metricValue}>{bookingData.averageBookingDuration} {t('min')}</Text>
          </Card.Content>
        </Card>
      </View>
    );
  };
  
  const renderBookingTrends = () => {
    if (!bookingData?.bookingTrends) return null;
    
    const data = {
      labels: bookingData.bookingTrends.labels,
      datasets: [{
        data: bookingData.bookingTrends.data,
      }],
    };
    
    return (
      <Card style={styles.chartCard}>
        <Card.Title title={t('bookingTrends')} />
        <Card.Content>
          <LineChart
            data={data}
            width={screenWidth - 64}
            height={200}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => theme.colors.primary,
              labelColor: (opacity = 1) => theme.colors.onSurface,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: theme.colors.primary,
              },
            }}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>
    );
  };
  
  const renderPeakHours = () => {
    if (!bookingData?.peakHours) return null;
    
    const data = {
      labels: bookingData.peakHours.map(h => `${h.hour}:00`),
      datasets: [{
        data: bookingData.peakHours.map(h => h.count),
      }],
    };
    
    // Create heatmap visualization
    const maxCount = Math.max(...bookingData.peakHours.map(h => h.count));
    
    return (
      <Card style={styles.heatmapCard}>
        <Card.Title 
          title={t('peakHours')}
          subtitle={t('bookingDensity')}
        />
        <Card.Content>
          <View style={styles.heatmapContainer}>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <View key={day} style={styles.heatmapRow}>
                <Text style={styles.dayLabel}>
                  {t(`day${day}`)}
                </Text>
                <View style={styles.heatmapCells}>
                  {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => {
                    const hourData = bookingData.peakHours.find(h => h.hour === hour);
                    const intensity = hourData ? hourData.count / maxCount : 0;
                    
                    return (
                      <View
                        key={hour}
                        style={[
                          styles.heatmapCell,
                          {
                            backgroundColor: theme.colors.primary + Math.round(intensity * 255).toString(16).padStart(2, '0'),
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
          
          <View style={styles.heatmapLegend}>
            <Text style={styles.legendLabel}>{t('low')}</Text>
            <View style={styles.legendGradient} />
            <Text style={styles.legendLabel}>{t('high')}</Text>
          </View>
          
          <View style={styles.peakHoursList}>
            <Text style={styles.peakHoursTitle}>{t('busiestTimes')}</Text>
            {bookingData.peakHours.slice(0, 3).map((hour, index) => (
              <View key={index} style={styles.peakHourItem}>
                <View style={styles.peakHourRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text style={styles.peakHourTime}>{hour.hour}:00 - {hour.hour + 1}:00</Text>
                <Text style={styles.peakHourCount}>{hour.count} {t('bookings')}</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderServiceBookings = () => {
    if (!bookingData?.bookingsByService) return null;
    
    return (
      <Card style={styles.servicesCard}>
        <Card.Title title={t('bookingsByService')} />
        <Card.Content>
          {bookingData.bookingsByService.map((service, index) => (
            <View key={index} style={styles.serviceItem}>
              <View style={styles.serviceRank}>
                <Text style={styles.serviceRankText}>{index + 1}</Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.serviceName}</Text>
                <View style={styles.serviceStats}>
                  <Text style={styles.serviceStat}>
                    {service.count} {t('bookings')}
                  </Text>
                  <Text style={styles.statDivider}>•</Text>
                  <Text style={styles.serviceStat}>
                    {service.revenue} {t('jod')}
                  </Text>
                </View>
              </View>
              <View style={styles.servicePercentageContainer}>
                <Text style={styles.servicePercentage}>
                  {((service.count / bookingData.totalBookings) * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };
  
  const renderBookingSources = () => {
    if (!bookingData?.bookingSources) return null;
    
    return (
      <Card style={styles.sourcesCard}>
        <Card.Title title={t('bookingSources')} />
        <Card.Content>
          {bookingData.bookingSources.map((source, index) => (
            <View key={index} style={styles.sourceItem}>
              <View style={styles.sourceIcon}>
                <Ionicons
                  name={
                    source.source === 'تطبيق' ? 'phone-portrait' :
                    source.source === 'واتساب' ? 'logo-whatsapp' :
                    'call'
                  }
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceName}>{source.source}</Text>
                <View style={styles.sourceBarContainer}>
                  <View
                    style={[
                      styles.sourceBar,
                      { width: `${source.percentage}%` },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.sourceCount}>{source.count}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };
  
  const renderInsights = () => {
    if (!bookingData) return null;
    
    const insights = [
      {
        icon: 'trending-up',
        color: theme.colors.primary,
        text: t('bookingInsight1', { day: bookingData.peakDays[0]?.day }),
      },
      {
        icon: 'time',
        color: theme.colors.tertiary,
        text: t('bookingInsight2', { time: bookingData.peakHours[0]?.hour }),
      },
      {
        icon: 'alert-circle',
        color: theme.colors.error,
        text: t('bookingInsight3', { rate: bookingData.noShowRate.toFixed(1) }),
      },
    ];
    
    return (
      <Card style={styles.insightsCard}>
        <Card.Title title={t('bookingInsights')} />
        <Card.Content>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Ionicons name={insight.icon as any} size={20} color={insight.color} />
              <Text style={styles.insightText}>{insight.text}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bookingAnalytics')}</Text>
        <TouchableOpacity onPress={() => console.log('Export')}>
          <Ionicons name="download-outline" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>
      
      <SegmentedButtons
        value={selectedPeriod}
        onValueChange={(value) => setSelectedPeriod(value as any)}
        buttons={[
          { value: 'week', label: t('week') },
          { value: 'month', label: t('month') },
          { value: 'quarter', label: t('quarter') },
        ]}
        style={styles.periodSelector}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderOverviewMetrics()}
        {renderBookingTrends()}
        {renderPeakHours()}
        {renderServiceBookings()}
        {renderBookingSources()}
        {renderInsights()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  periodSelector: {
    margin: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  metricCard: {
    width: (screenWidth - 48) / 2,
    margin: 8,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  heatmapCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  heatmapContainer: {
    marginBottom: 16,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayLabel: {
    width: 50,
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  heatmapCells: {
    flexDirection: 'row',
    flex: 1,
    gap: 2,
  },
  heatmapCell: {
    flex: 1,
    height: 20,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceVariant,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  legendLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  legendGradient: {
    width: 100,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    opacity: 0.5,
  },
  peakHoursList: {
    marginTop: 16,
  },
  peakHoursTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  peakHourItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  peakHourRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
  },
  peakHourTime: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  peakHourCount: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  servicesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  serviceRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  serviceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  serviceStat: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  statDivider: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginHorizontal: 8,
  },
  servicePercentageContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceVariant,
  },
  servicePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sourcesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  sourceBarContainer: {
    height: 6,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sourceBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  sourceCount: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginLeft: 12,
  },
  insightsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 50,
  },
});