import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, Card, ActivityIndicator, SegmentedButtons, Avatar, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { ProviderAnalyticsService, CustomerAnalytics } from '../../services/analytics/ProviderAnalyticsService';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

export default function CustomerAnalyticsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<CustomerAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  
  const analyticsService = ProviderAnalyticsService.getInstance();
  
  useEffect(() => {
    loadCustomerData();
  }, [selectedPeriod]);
  
  const loadCustomerData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const data = await analyticsService.getCustomerAnalytics(user.id, selectedPeriod);
      setCustomerData(data);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderOverviewCards = () => {
    if (!customerData) return null;
    
    const cards = [
      {
        title: t('customerAnalytics.totalCustomers'),
        value: customerData.totalCustomers.toString(),
        icon: 'people',
        color: colors.primary,
      },
      {
        title: t('customerAnalytics.newCustomers'),
        value: customerData.newCustomers.toString(),
        subtitle: t('customerAnalytics.thisPeriod', { period: t(`common.${selectedPeriod}`) }),
        icon: 'person-add',
        color: colors.success,
      },
      {
        title: t('customerAnalytics.retentionRate'),
        value: `${customerData.retentionRate}%`,
        icon: 'heart',
        color: colors.error,
      },
      {
        title: t('customerAnalytics.avgCustomerSpend'),
        value: `${customerData.averageLifetimeValue} ${t('common.jod')}`,
        icon: 'cash',
        color: colors.warning,
      },
    ];
    
    return (
      <View style={styles.cardsContainer}>
        {cards.map((card, index) => (
          <Card key={index} style={styles.overviewCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: card.color + '20' }]}>
                  <Ionicons name={card.icon as any} size={20} color={card.color} />
                </View>
              </View>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardTitle}>{card.title}</Text>
              {card.subtitle && (
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              )}
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  };
  
  const renderCustomerGrowth = () => {
    if (!customerData?.customerGrowth) return null;
    
    const data = {
      labels: customerData.customerGrowth.labels,
      datasets: [{
        data: customerData.customerGrowth.data,
      }],
    };
    
    return (
      <Card style={styles.chartCard}>
        <Card.Title title={t('customerAnalytics.customerGrowth')} />
        <Card.Content>
          <LineChart
            data={data}
            width={screenWidth - 64}
            height={200}
            yAxisLabel=""
            yAxisSuffix=""
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
  
  const renderDemographics = () => {
    if (!customerData?.customersByAge) return null;
    
    return (
      <Card style={styles.demographicsCard}>
        <Card.Title title={t('customerAnalytics.customerDemographics')} />
        <Card.Content>
          <Text style={styles.subsectionTitle}>{t('customerAnalytics.ageGroups')}</Text>
          {customerData.customersByAge.map((age, index) => (
            <View key={index} style={styles.demographicItem}>
              <Text style={styles.demographicLabel}>{age.range}</Text>
              <View style={styles.demographicBarContainer}>
                <View
                  style={[
                    styles.demographicBar,
                    { width: `${(age.count / customerData.totalCustomers) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.demographicCount}>{age.count}</Text>
            </View>
          ))}
          
          <View style={styles.genderSection}>
            <Text style={styles.subsectionTitle}>{t('customerAnalytics.genderDistribution')}</Text>
            <View style={styles.genderContainer}>
              <View style={styles.genderItem}>
                <Ionicons name="female" size={32} color={colors.primary} />
                <Text style={styles.genderValue}>100%</Text>
                <Text style={styles.genderLabel}>{t('common.female')}</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderTopCustomers = () => {
    if (!customerData?.topCustomers) return null;
    
    return (
      <Card style={styles.topCustomersCard}>
        <Card.Title 
          title={t('customerAnalytics.topCustomers')}
          right={(props) => (
            <TouchableOpacity onPress={() => navigation.navigate('CustomersList' as any)}>
              <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
            </TouchableOpacity>
          )}
        />
        <Card.Content>
          {customerData.topCustomers.map((customer, index) => (
            <TouchableOpacity
              key={customer.id}
              style={styles.customerItem}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id } as any)}
            >
              <Avatar.Text
                size={40}
                label={customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                style={{ backgroundColor: colors.primary }}
              />
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <View style={styles.customerStats}>
                  <Text style={styles.customerStat}>
                    {customer.visitCount} {t('customerAnalytics.visits')}
                  </Text>
                  <Text style={styles.customerDot}>•</Text>
                  <Text style={styles.customerStat}>
                    {customer.totalSpent} {t('common.jod')}
                  </Text>
                </View>
              </View>
              <View style={styles.customerRank}>
                <Text style={styles.rankNumber}>#{index + 1}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Card.Content>
      </Card>
    );
  };
  
  const renderRetentionMetrics = () => {
    if (!customerData) return null;
    
    return (
      <Card style={styles.retentionCard}>
        <Card.Title title={t('customerAnalytics.retentionMetrics')} />
        <Card.Content>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t('customerAnalytics.customerRetention')}</Text>
              <Text style={styles.metricValue}>{customerData.retentionRate}%</Text>
              <ProgressBar
                progress={customerData.retentionRate / 100}
                color={colors.success}
                style={styles.progressBar}
              />
            </View>
          </View>
          
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t('customerAnalytics.churnRate')}</Text>
              <Text style={styles.metricValue}>{customerData.churnRate}%</Text>
              <ProgressBar
                progress={customerData.churnRate / 100}
                color={colors.error}
                style={styles.progressBar}
              />
            </View>
          </View>
          
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t('customerAnalytics.customerSatisfaction')}</Text>
              <View style={styles.satisfactionRow}>
                <Text style={styles.metricValue}>{customerData.customerSatisfaction}/5</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name="star"
                      size={16}
                      color={star <= customerData.customerSatisfaction ? colors.warning : colors.lightGray}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderInsights = () => (
    <Card style={styles.insightsCard}>
      <Card.Title title={t('customerAnalytics.insights')} />
      <Card.Content>
        <View style={styles.insightItem}>
          <Ionicons name="bulb" size={20} color={colors.warning} />
          <Text style={styles.insightText}>
            {t('insight1', { percent: '65' })}
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Ionicons name="trending-up" size={20} color={colors.success} />
          <Text style={styles.insightText}>
            {t('customerAnalytics.insight2', { day: t('days.thursday') })}
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Ionicons name="gift" size={20} color={colors.primary} />
          <Text style={styles.insightText}>
            {t('customerAnalytics.insight3')}
          </Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('customerAnalytics.title')}</Text>
        <TouchableOpacity onPress={() => console.log('Export')}>
          <Ionicons name="download-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <SegmentedButtons
        value={selectedPeriod}
        onValueChange={(value) => setSelectedPeriod(value as any)}
        buttons={[
          { value: 'week', label: t('common.week') },
          { value: 'month', label: t('common.month') },
          { value: 'quarter', label: t('common.quarter') },
          { value: 'year', label: t('common.year') },
        ]}
        style={styles.periodSelector}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderOverviewCards()}
        {renderCustomerGrowth()}
        {renderDemographics()}
        {renderTopCustomers()}
        {renderRetentionMetrics()}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
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
  scrollContent: {
    paddingBottom: 100,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  overviewCard: {
    width: (screenWidth - 48) / 2,
    margin: 8,
  },
  cardHeader: {
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  demographicsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  demographicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  demographicLabel: {
    width: 60,
    fontSize: 14,
    color: colors.text,
  },
  demographicBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  demographicBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  demographicCount: {
    width: 40,
    textAlign: 'right',
    fontSize: 14,
    color: colors.gray,
  },
  genderSection: {
    marginTop: 24,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  genderItem: {
    alignItems: 'center',
    padding: 16,
  },
  genderValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  genderLabel: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  topCustomersCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 16,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  customerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  customerStat: {
    fontSize: 12,
    color: colors.gray,
  },
  customerDot: {
    fontSize: 12,
    color: colors.gray,
    marginHorizontal: 8,
  },
  customerRank: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.lightPrimary,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  retentionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  metricRow: {
    marginBottom: 20,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  satisfactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
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
    color: colors.text,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 50,
  },
});