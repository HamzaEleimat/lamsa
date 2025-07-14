import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Text, Card, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationAnalyticsService } from '../../services/notifications/NotificationAnalytics';
import { NotificationChannel, NotificationType } from '../../services/notifications/types';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

export default function NotificationAnalyticsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [channelPerformance, setChannelPerformance] = useState<any[]>([]);
  const [typePerformance, setTypePerformance] = useState<any[]>([]);
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  
  const analyticsService = NotificationAnalyticsService.getInstance();
  
  useEffect(() => {
    loadAnalytics();
  }, [period]);
  
  const loadAnalytics = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const [userAnalytics, channels, types, costs] = await Promise.all([
        analyticsService.getUserAnalytics(user.id, period),
        analyticsService.getChannelPerformance(period),
        analyticsService.getTypePerformance(period),
        analyticsService.getCostAnalysis(period),
      ]);
      
      setAnalytics(userAnalytics);
      setChannelPerformance(channels);
      setTypePerformance(types);
      setCostAnalysis(costs);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderOverviewCards = () => {
    if (!analytics) return null;
    
    const { stats } = analytics;
    const deliveryRate = stats.sent > 0 ? (stats.delivered / stats.sent * 100).toFixed(1) : '0';
    const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(1) : '0';
    const interactionRate = stats.opened > 0 ? (stats.interacted / stats.opened * 100).toFixed(1) : '0';
    
    const cards = [
      {
        title: t('notificationsSent'),
        value: stats.sent.toString(),
        icon: 'send',
        color: colors.primary,
      },
      {
        title: t('deliveryRate'),
        value: `${deliveryRate}%`,
        icon: 'checkmark-done-circle',
        color: colors.success,
      },
      {
        title: t('openRate'),
        value: `${openRate}%`,
        icon: 'eye',
        color: colors.info,
      },
      {
        title: t('interactionRate'),
        value: `${interactionRate}%`,
        icon: 'hand-left',
        color: colors.warning,
      },
    ];
    
    return (
      <View style={styles.cardsContainer}>
        {cards.map((card, index) => (
          <Card key={index} style={styles.overviewCard}>
            <Card.Content style={styles.cardContent}>
              <Ionicons name={card.icon as any} size={24} color={card.color} />
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardTitle}>{card.title}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  };
  
  const renderChannelChart = () => {
    if (!channelPerformance || channelPerformance.length === 0) return null;
    
    // Filter channels with data
    const activeChannels = channelPerformance.filter(ch => ch.sentCount > 0);
    if (activeChannels.length === 0) return null;
    
    const data = {
      labels: activeChannels.map(ch => t(ch.channel.toLowerCase())),
      datasets: [
        {
          data: activeChannels.map(ch => ch.sentCount),
        },
      ],
    };
    
    return (
      <Card style={styles.chartCard}>
        <Card.Title title={t('channelUsage')} />
        <Card.Content>
          <BarChart
            data={data}
            width={screenWidth - 60}
            height={200}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: colors.white,
              backgroundGradientFrom: colors.white,
              backgroundGradientTo: colors.white,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
          
          <View style={styles.channelStats}>
            {activeChannels.map((channel, index) => (
              <View key={index} style={styles.channelStat}>
                <Text style={styles.channelName}>{t(channel.channel.toLowerCase())}</Text>
                <Text style={styles.channelDelivery}>
                  {t('delivered')}: {channel.deliveryRate.toFixed(1)}%
                </Text>
                {channel.totalCost > 0 && (
                  <Text style={styles.channelCost}>
                    {t('cost')}: {channel.totalCost.toFixed(2)} JOD
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderTypePerformance = () => {
    if (!typePerformance || typePerformance.length === 0) return null;
    
    // Filter types with data
    const activeTypes = typePerformance.filter(type => type.sentCount > 0);
    if (activeTypes.length === 0) return null;
    
    return (
      <Card style={styles.chartCard}>
        <Card.Title title={t('notificationTypePerformance')} />
        <Card.Content>
          <View style={styles.typesList}>
            {activeTypes.map((type, index) => (
              <View key={index} style={styles.typeItem}>
                <View style={styles.typeHeader}>
                  <Text style={styles.typeName}>{t(type.type.toLowerCase())}</Text>
                  <Text style={styles.typeCount}>{type.sentCount}</Text>
                </View>
                <View style={styles.typeMetrics}>
                  <View style={styles.metric}>
                    <Ionicons name="eye-outline" size={16} color={colors.gray} />
                    <Text style={styles.metricValue}>{type.openRate.toFixed(0)}%</Text>
                  </View>
                  <View style={styles.metric}>
                    <Ionicons name="hand-left-outline" size={16} color={colors.gray} />
                    <Text style={styles.metricValue}>{type.interactionRate.toFixed(0)}%</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${type.openRate}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderCostAnalysis = () => {
    if (!costAnalysis) return null;
    
    return (
      <Card style={styles.chartCard}>
        <Card.Title
          title={t('costAnalysis')}
          right={(props) => (
            <View style={styles.costBadge}>
              <Text style={styles.costBadgeText}>
                {costAnalysis.totalCost.toFixed(2)} JOD
              </Text>
            </View>
          )}
        />
        <Card.Content>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>{t('projectedMonthlyCost')}</Text>
            <Text style={styles.costValue}>
              {costAnalysis.projectedMonthlyCost.toFixed(2)} JOD
            </Text>
          </View>
          
          <View style={styles.costBreakdown}>
            {Object.entries(costAnalysis.byChannel).map(([channel, cost]: [string, any]) => {
              if (cost === 0) return null;
              return (
                <View key={channel} style={styles.costChannelItem}>
                  <Text style={styles.costChannelName}>
                    {t(channel.toLowerCase())}
                  </Text>
                  <Text style={styles.costChannelValue}>
                    {cost.toFixed(2)} JOD
                  </Text>
                </View>
              );
            })}
          </View>
          
          {costAnalysis.costTrend && (
            <View style={styles.trendIndicator}>
              <Ionicons
                name={
                  costAnalysis.costTrend === 'increasing'
                    ? 'trending-up'
                    : costAnalysis.costTrend === 'decreasing'
                    ? 'trending-down'
                    : 'remove'
                }
                size={20}
                color={
                  costAnalysis.costTrend === 'increasing'
                    ? colors.error
                    : costAnalysis.costTrend === 'decreasing'
                    ? colors.success
                    : colors.gray
                }
              />
              <Text style={styles.trendText}>{t(costAnalysis.costTrend)}</Text>
            </View>
          )}
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
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notificationAnalytics')}</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <SegmentedButtons
        value={period}
        onValueChange={(value) => setPeriod(value as any)}
        buttons={[
          { value: 'day', label: t('day') },
          { value: 'week', label: t('week') },
          { value: 'month', label: t('month') },
        ]}
        style={styles.periodSelector}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderOverviewCards()}
        {renderChannelChart()}
        {renderTypePerformance()}
        {renderCostAnalysis()}
        
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
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.white,
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
  cardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 8,
  },
  cardTitle: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  channelStats: {
    marginTop: 16,
  },
  channelStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  channelName: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  channelDelivery: {
    fontSize: 12,
    color: colors.gray,
    marginHorizontal: 8,
  },
  channelCost: {
    fontSize: 12,
    color: colors.warning,
  },
  typesList: {
    marginTop: 8,
  },
  typeItem: {
    marginBottom: 16,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeName: {
    fontSize: 14,
    color: colors.text,
  },
  typeCount: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray,
  },
  typeMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 12,
    color: colors.gray,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.lightGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  costBadge: {
    backgroundColor: colors.lightPrimary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 16,
  },
  costBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  costLabel: {
    fontSize: 14,
    color: colors.text,
  },
  costValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  costBreakdown: {
    marginTop: 12,
  },
  costChannelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  costChannelName: {
    fontSize: 12,
    color: colors.gray,
  },
  costChannelValue: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trendText: {
    fontSize: 12,
    color: colors.gray,
    textTransform: 'capitalize',
  },
  bottomPadding: {
    height: 50,
  },
});