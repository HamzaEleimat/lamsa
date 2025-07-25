import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  SegmentedButtons,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MetricCard from '../../components/analytics/MetricCard';
import TrendChart from '../../components/analytics/TrendChart';
import ComparisonChart from '../../components/analytics/ComparisonChart';
import DateRangePicker from '../../components/analytics/DateRangePicker';
import i18n from '../../i18n';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type TimeRange = 'week' | 'month' | 'year';

const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleDateRangeChange = (range: { startDate: Date; endDate: Date }) => {
    setDateRange(range);
    setShowDatePicker(false);
  };

  const renderMetrics = () => (
    <View style={styles.metricsContainer}>
      <MetricCard
        title={i18n.t('analytics.totalRevenue')}
        value="2,450"
        unit="JOD"
        trend={{ value: 12.5, isPositive: true }}
        icon="cash"
        style={styles.metricCard}
      />
      <MetricCard
        title={i18n.t('analytics.totalBookings')}
        value="48"
        trend={{ value: 8.3, isPositive: true }}
        icon="calendar-check"
        style={styles.metricCard}
      />
      <MetricCard
        title={i18n.t('analytics.avgRating')}
        value="4.8"
        unit="/5"
        trend={{ value: 0.2, isPositive: true }}
        icon="star"
        style={styles.metricCard}
      />
      <MetricCard
        title={i18n.t('analytics.repeatClients')}
        value="32%"
        trend={{ value: 5.1, isPositive: true }}
        icon="account-group"
        style={styles.metricCard}
      />
    </View>
  );

  const renderCharts = () => (
    <>
      {/* Revenue Trend Chart */}
      <Surface style={styles.chartCard} elevation={1}>
        <View style={styles.chartHeader}>
          <Text variant="titleMedium" style={styles.chartTitle}>
            {i18n.t('analytics.revenueTrend')}
          </Text>
          <IconButton
            icon="information-outline"
            size={20}
            onPress={() => console.log('Show revenue info')}
          />
        </View>
        <TrendChart
          data={[
            { label: 'Mon', value: 320 },
            { label: 'Tue', value: 380 },
            { label: 'Wed', value: 340 },
            { label: 'Thu', value: 420 },
            { label: 'Fri', value: 480 },
            { label: 'Sat', value: 520 },
            { label: 'Sun', value: 390 },
          ]}
          height={200}
          color={theme.colors.primary}
          showGrid
          animate
        />
      </Surface>

      {/* Service Comparison Chart */}
      <Surface style={styles.chartCard} elevation={1}>
        <View style={styles.chartHeader}>
          <Text variant="titleMedium" style={styles.chartTitle}>
            {i18n.t('analytics.servicePerformance')}
          </Text>
          <IconButton
            icon="information-outline"
            size={20}
            onPress={() => console.log('Show service info')}
          />
        </View>
        <ComparisonChart
          data={[
            { label: i18n.t('services.haircut'), value: 35, percentage: 29 },
            { label: i18n.t('services.coloring'), value: 28, percentage: 23 },
            { label: i18n.t('services.styling'), value: 25, percentage: 21 },
            { label: i18n.t('services.treatment'), value: 18, percentage: 15 },
            { label: i18n.t('services.other'), value: 14, percentage: 12 },
          ]}
          height={250}
          showPercentage
          colors={[
            theme.colors.primary,
            theme.colors.secondary,
            theme.colors.tertiary,
            theme.colors.primaryContainer,
            theme.colors.secondaryContainer,
          ]}
        />
      </Surface>

      {/* Booking Patterns */}
      <Surface style={styles.chartCard} elevation={1}>
        <View style={styles.chartHeader}>
          <Text variant="titleMedium" style={styles.chartTitle}>
            {i18n.t('analytics.bookingPatterns')}
          </Text>
          <IconButton
            icon="information-outline"
            size={20}
            onPress={() => console.log('Show booking patterns info')}
          />
        </View>
        <TrendChart
          data={[
            { label: '8AM', value: 2 },
            { label: '10AM', value: 5 },
            { label: '12PM', value: 8 },
            { label: '2PM', value: 12 },
            { label: '4PM', value: 15 },
            { label: '6PM', value: 10 },
            { label: '8PM', value: 4 },
          ]}
          height={200}
          color={theme.colors.secondary}
          showGrid
          animate
          curved
        />
      </Surface>
    </>
  );

  const renderInsights = () => (
    <Surface style={styles.insightsCard} elevation={1}>
      <Text variant="titleMedium" style={styles.insightsTitle}>
        {i18n.t('analytics.keyInsights')}
      </Text>
      <View style={styles.insightItem}>
        <MaterialCommunityIcons
          name="trending-up"
          size={24}
          color={theme.colors.primary}
        />
        <Text variant="bodyMedium" style={styles.insightText}>
          {i18n.t('analytics.insight1')}
        </Text>
      </View>
      <View style={styles.insightItem}>
        <MaterialCommunityIcons
          name="clock-alert-outline"
          size={24}
          color={theme.colors.secondary}
        />
        <Text variant="bodyMedium" style={styles.insightText}>
          {i18n.t('analytics.insight2')}
        </Text>
      </View>
      <View style={styles.insightItem}>
        <MaterialCommunityIcons
          name="account-star"
          size={24}
          color={theme.colors.tertiary}
        />
        <Text variant="bodyMedium" style={styles.insightText}>
          {i18n.t('analytics.insight3')}
        </Text>
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          {i18n.t('analytics.title')}
        </Text>
        <IconButton
          icon="calendar-range"
          size={24}
          onPress={() => setShowDatePicker(true)}
        />
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <SegmentedButtons
          value={timeRange}
          onValueChange={(value) => setTimeRange(value as TimeRange)}
          buttons={[
            {
              value: 'week',
              label: i18n.t('analytics.thisWeek'),
            },
            {
              value: 'month',
              label: i18n.t('analytics.thisMonth'),
            },
            {
              value: 'year',
              label: i18n.t('analytics.thisYear'),
            },
          ]}
        />
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {renderMetrics()}
        {renderCharts()}
        {renderInsights()}
      </ScrollView>

      {/* Date Range Picker Modal */}
      {showDatePicker && (
        <DateRangePicker
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
          onConfirm={handleDateRangeChange}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '600',
  },
  timeRangeContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: '47%',
    margin: '1.5%',
  },
  chartCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontWeight: '600',
  },
  insightsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  insightsTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightText: {
    marginLeft: 12,
    flex: 1,
    opacity: 0.8,
  },
});

export default AnalyticsDashboard;