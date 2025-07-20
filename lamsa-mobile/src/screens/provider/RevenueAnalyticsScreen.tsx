import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, Card, ActivityIndicator, SegmentedButtons, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { ProviderAnalyticsService, RevenueAnalytics } from '../../services/analytics/ProviderAnalyticsService';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const { width: screenWidth } = Dimensions.get('window');

export default function RevenueAnalyticsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const locale = i18n.language === 'ar' ? ar : enUS;
  
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'custom'>('month');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const analyticsService = ProviderAnalyticsService.getInstance();
  
  useEffect(() => {
    loadRevenueData();
  }, [selectedPeriod, startDate, endDate]);
  
  const loadRevenueData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      let start = startDate;
      let end = endDate;
      
      if (selectedPeriod !== 'custom') {
        const range = analyticsService.getDateRange(selectedPeriod as any);
        start = range.start;
        end = range.end;
      }
      
      const data = await analyticsService.getRevenueAnalytics(user.id, start, end);
      setRevenueData(data);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderRevenueOverview = () => {
    if (!revenueData) return null;
    
    const isPositive = revenueData.periodComparison >= 0;
    
    return (
      <Card style={styles.overviewCard}>
        <Card.Content>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>{t('totalRevenue')}</Text>
            <View style={styles.comparisonBadge}>
              <Ionicons
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={16}
                color={isPositive ? colors.success : colors.error}
              />
              <Text style={[
                styles.comparisonText,
                { color: isPositive ? colors.success : colors.error }
              ]}>
                {Math.abs(revenueData.periodComparison).toFixed(1)}%
              </Text>
            </View>
          </View>
          <Text style={styles.revenueAmount}>
            {revenueData.totalRevenue.toFixed(2)} {t('jod')}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{revenueData.averageBookingValue.toFixed(2)}</Text>
              <Text style={styles.statLabel}>{t('avgBookingValue')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{revenueData.projectedRevenue.toFixed(0)}</Text>
              <Text style={styles.statLabel}>{t('projectedRevenue')}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderRevenueChart = () => {
    if (!revenueData?.revenueChart) return null;
    
    const data = {
      labels: revenueData.revenueChart.labels,
      datasets: [{
        data: revenueData.revenueChart.data,
      }],
    };
    
    return (
      <Card style={styles.chartCard}>
        <Card.Title title={t('revenueTrend')} />
        <Card.Content>
          <LineChart
            data={data}
            width={screenWidth - 64}
            height={220}
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
  
  const renderServiceRevenue = () => {
    if (!revenueData?.revenueByService) return null;
    
    return (
      <Card style={styles.serviceCard}>
        <Card.Title title={t('revenueByService')} />
        <Card.Content>
          {revenueData.revenueByService.map((service, index) => (
            <View key={index} style={styles.serviceItem}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.serviceName}</Text>
                <Text style={styles.serviceRevenue}>
                  {service.revenue.toFixed(2)} {t('jod')}
                </Text>
              </View>
              <View style={styles.serviceBarContainer}>
                <View
                  style={[
                    styles.serviceBar,
                    { width: `${service.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.servicePercentage}>{service.percentage}%</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };
  
  const renderPaymentMethods = () => {
    if (!revenueData?.revenueByPaymentMethod) return null;
    
    const data = revenueData.revenueByPaymentMethod.map((method, index) => ({
      name: method.method,
      population: method.amount,
      color: [colors.primary, colors.secondary, colors.info][index],
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));
    
    return (
      <Card style={styles.paymentCard}>
        <Card.Title title={t('paymentMethods')} />
        <Card.Content>
          <PieChart
            data={data}
            width={screenWidth - 64}
            height={200}
            chartConfig={{
              color: (opacity = 1) => colors.primary,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
          <View style={styles.paymentDetails}>
            {revenueData.revenueByPaymentMethod.map((method, index) => (
              <View key={index} style={styles.paymentItem}>
                <View style={[
                  styles.paymentDot,
                  { backgroundColor: [colors.primary, colors.secondary, colors.info][index] }
                ]} />
                <Text style={styles.paymentMethod}>{method.method}</Text>
                <Text style={styles.paymentAmount}>
                  {method.amount.toFixed(2)} {t('jod')} ({method.count})
                </Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderTopRevenueDay = () => {
    if (!revenueData?.topRevenueDay) return null;
    
    return (
      <Card style={styles.insightCard}>
        <Card.Content>
          <View style={styles.insightHeader}>
            <Ionicons name="trophy" size={24} color={colors.warning} />
            <Text style={styles.insightTitle}>{t('topRevenueDay')}</Text>
          </View>
          <Text style={styles.insightValue}>{revenueData.topRevenueDay.date}</Text>
          <Text style={styles.insightAmount}>
            {revenueData.topRevenueDay.amount.toFixed(2)} {t('jod')}
          </Text>
        </Card.Content>
      </Card>
    );
  };
  
  const renderExportButton = () => (
    <Card style={styles.exportCard}>
      <Card.Content>
        <Text style={styles.exportTitle}>{t('exportRevenueReport')}</Text>
        <Text style={styles.exportDescription}>{t('exportRevenueDescription')}</Text>
        <View style={styles.exportButtons}>
          <Button
            mode="outlined"
            icon="file-pdf-box"
            onPress={() => console.log('Export PDF')}
            style={styles.exportButton}
          >
            PDF
          </Button>
          <Button
            mode="outlined"
            icon="file-excel"
            onPress={() => console.log('Export Excel')}
            style={styles.exportButton}
          >
            Excel
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('revenueAnalytics')}</Text>
        <TouchableOpacity onPress={() => console.log('Filter')}>
          <Ionicons name="filter" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <SegmentedButtons
        value={selectedPeriod}
        onValueChange={(value) => setSelectedPeriod(value as any)}
        buttons={[
          { value: 'week', label: t('week') },
          { value: 'month', label: t('month') },
          { value: 'quarter', label: t('quarter') },
          { value: 'custom', label: t('custom') },
        ]}
        style={styles.periodSelector}
      />
      
      {selectedPeriod === 'custom' && (
        <View style={styles.datePickerRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.dateText}>
              {format(startDate, 'dd MMM yyyy', { locale })}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.dateToText}>{t('to')}</Text>
          
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.dateText}>
              {format(endDate, 'dd MMM yyyy', { locale })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderRevenueOverview()}
        {renderRevenueChart()}
        {renderServiceRevenue()}
        {renderPaymentMethods()}
        {renderTopRevenueDay()}
        {renderExportButton()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}
      
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  periodSelector: {
    margin: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dateText: {
    fontSize: 14,
    color: colors.text,
  },
  dateToText: {
    fontSize: 14,
    color: colors.gray,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  overviewCard: {
    margin: 16,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 16,
    color: colors.gray,
  },
  comparisonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
  },
  comparisonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  serviceCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  serviceRevenue: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  serviceBarContainer: {
    flex: 2,
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  serviceBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  servicePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    width: 40,
    textAlign: 'right',
  },
  paymentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  paymentDetails: {
    marginTop: 16,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  paymentMethod: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  paymentAmount: {
    fontSize: 14,
    color: colors.gray,
  },
  insightCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  insightAmount: {
    fontSize: 16,
    color: colors.gray,
  },
  exportCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exportDescription: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 16,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
  },
  bottomPadding: {
    height: 50,
  },
});