import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, Card, ActivityIndicator, SegmentedButtons, ProgressBar, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { ProviderAnalyticsService, PerformanceMetrics } from '../../services/analytics/ProviderAnalyticsService';
import { LineChart, BarChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

export default function PerformanceAnalyticsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('quarter');
  
  const analyticsService = ProviderAnalyticsService.getInstance();
  
  useEffect(() => {
    loadPerformanceData();
  }, [selectedPeriod]);
  
  const loadPerformanceData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const data = await analyticsService.getPerformanceMetrics(user.id, selectedPeriod);
      setPerformanceData(data);
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderRatingOverview = () => {
    if (!performanceData) return null;
    
    return (
      <Card style={styles.ratingCard}>
        <Card.Content>
          <View style={styles.ratingHeader}>
            <View>
              <Text style={styles.ratingTitle}>{t('overallRating')}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingValue}>{performanceData.overallRating}</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name="star"
                      size={20}
                      color={star <= Math.floor(performanceData.overallRating) ? colors.warning : colors.lightGray}
                    />
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="trophy" size={24} color={colors.warning} />
              <Text style={styles.ratingBadgeText}>{t('excellent')}</Text>
            </View>
          </View>
          
          <View style={styles.ratingDistribution}>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = performanceData.ratingDistribution[rating as keyof typeof performanceData.ratingDistribution];
              const total = Object.values(performanceData.ratingDistribution).reduce((sum, val) => sum + val, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <View key={rating} style={styles.ratingBar}>
                  <Text style={styles.ratingLabel}>{rating}</Text>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { width: `${percentage}%` }]} />
                  </View>
                  <Text style={styles.barCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderRatingTrend = () => {
    if (!performanceData?.ratingTrend) return null;
    
    const data = {
      labels: performanceData.ratingTrend.labels,
      datasets: [{
        data: performanceData.ratingTrend.data,
      }],
    };
    
    return (
      <Card style={styles.trendCard}>
        <Card.Title title={t('ratingTrend')} />
        <Card.Content>
          <LineChart
            data={data}
            width={screenWidth - 64}
            height={180}
            yAxisLabel=""
            yAxisSuffix=""
            yAxisInterval={1}
            fromZero={false}
            chartConfig={{
              backgroundColor: colors.white,
              backgroundGradientFrom: colors.white,
              backgroundGradientTo: colors.white,
              decimalPlaces: 1,
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
  
  const renderSentimentAnalysis = () => {
    if (!performanceData?.reviewSentiment) return null;
    
    const sentiments = [
      { label: t('positive'), value: performanceData.reviewSentiment.positive, color: colors.success },
      { label: t('neutral'), value: performanceData.reviewSentiment.neutral, color: colors.warning },
      { label: t('negative'), value: performanceData.reviewSentiment.negative, color: colors.error },
    ];
    
    return (
      <Card style={styles.sentimentCard}>
        <Card.Title title={t('reviewSentiment')} />
        <Card.Content>
          <View style={styles.sentimentContainer}>
            {sentiments.map((sentiment) => (
              <View key={sentiment.label} style={styles.sentimentItem}>
                <View style={[styles.sentimentCircle, { borderColor: sentiment.color }]}>
                  <Text style={[styles.sentimentValue, { color: sentiment.color }]}>
                    {sentiment.value}%
                  </Text>
                </View>
                <Text style={styles.sentimentLabel}>{sentiment.label}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.sentimentInsights}>
            <Text style={styles.sentimentInsightTitle}>{t('commonThemes')}</Text>
            <View style={styles.themeTags}>
              <Chip style={styles.themeTag}>{t('professionalService')}</Chip>
              <Chip style={styles.themeTag}>{t('cleanEnvironment')}</Chip>
              <Chip style={styles.themeTag}>{t('friendlyStaff')}</Chip>
              <Chip style={styles.themeTag}>{t('goodValue')}</Chip>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderCompetitorComparison = () => {
    if (!performanceData?.competitorComparison) return null;
    
    const metrics = [
      {
        label: t('yourScore'),
        value: performanceData.competitorComparison.yourScore,
        color: colors.primary,
      },
      {
        label: t('marketAverage'),
        value: performanceData.competitorComparison.marketAverage,
        color: colors.gray,
      },
      {
        label: t('topPerformer'),
        value: performanceData.competitorComparison.topPerformer,
        color: colors.warning,
      },
    ];
    
    return (
      <Card style={styles.competitorCard}>
        <Card.Title 
          title={t('competitorInsights')}
          subtitle={t('anonymizedMarketData')}
        />
        <Card.Content>
          <View style={styles.competitorMetrics}>
            {metrics.map((metric) => (
              <View key={metric.label} style={styles.competitorMetric}>
                <Text style={styles.competitorValue}>{metric.value}</Text>
                <ProgressBar
                  progress={metric.value / 100}
                  color={metric.color}
                  style={styles.competitorBar}
                />
                <Text style={styles.competitorLabel}>{metric.label}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.competitorInsights}>
            <View style={styles.insightRow}>
              <Ionicons 
                name={performanceData.competitorComparison.yourScore > performanceData.competitorComparison.marketAverage ? 'checkmark-circle' : 'alert-circle'}
                size={20} 
                color={performanceData.competitorComparison.yourScore > performanceData.competitorComparison.marketAverage ? colors.success : colors.warning}
              />
              <Text style={styles.insightText}>
                {performanceData.competitorComparison.yourScore > performanceData.competitorComparison.marketAverage
                  ? t('aboveMarketAverage', { percent: (performanceData.competitorComparison.yourScore - performanceData.competitorComparison.marketAverage).toFixed(0) })
                  : t('belowMarketAverage', { percent: (performanceData.competitorComparison.marketAverage - performanceData.competitorComparison.yourScore).toFixed(0) })
                }
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderPerformanceMetrics = () => {
    if (!performanceData) return null;
    
    const metrics = [
      {
        label: t('responseTime'),
        value: `${performanceData.responseTime} ${t('min')}`,
        icon: 'time',
        color: colors.info,
      },
      {
        label: t('completionRate'),
        value: `${performanceData.completionRate}%`,
        icon: 'checkmark-done',
        color: colors.success,
      },
      {
        label: t('serviceQuality'),
        value: `${performanceData.serviceQualityScore}/100`,
        icon: 'star',
        color: colors.warning,
      },
      {
        label: t('complaints'),
        value: performanceData.customerComplaints.toString(),
        icon: 'alert-circle',
        color: colors.error,
      },
    ];
    
    return (
      <View style={styles.metricsGrid}>
        {metrics.map((metric) => (
          <Card key={metric.label} style={styles.metricCard}>
            <Card.Content>
              <View style={[styles.metricIcon, { backgroundColor: metric.color + '20' }]}>
                <Ionicons name={metric.icon as any} size={24} color={metric.color} />
              </View>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  };
  
  const renderGrowthRecommendations = () => {
    if (!performanceData?.growthRecommendations) return null;
    
    const priorityColors = {
      high: colors.error,
      medium: colors.warning,
      low: colors.info,
    };
    
    return (
      <Card style={styles.recommendationsCard}>
        <Card.Title 
          title={t('growthRecommendations')}
          subtitle={t('personalizedForYourBusiness')}
        />
        <Card.Content>
          {performanceData.growthRecommendations.map((recommendation, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recommendationItem}
              onPress={() => console.log('View recommendation details')}
            >
              <View style={styles.recommendationHeader}>
                <Chip
                  style={[
                    styles.priorityChip,
                    { backgroundColor: priorityColors[recommendation.priority] + '20' }
                  ]}
                  textStyle={{ color: priorityColors[recommendation.priority] }}
                >
                  {t(recommendation.priority)}
                </Chip>
                <Ionicons name="arrow-forward" size={20} color={colors.gray} />
              </View>
              
              <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
              <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
              
              <View style={styles.impactContainer}>
                <Ionicons name="trending-up" size={16} color={colors.success} />
                <Text style={styles.impactText}>{recommendation.potentialImpact}</Text>
              </View>
            </TouchableOpacity>
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
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('performanceAnalytics')}</Text>
        <TouchableOpacity onPress={() => console.log('Settings')}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <SegmentedButtons
        value={selectedPeriod}
        onValueChange={(value) => setSelectedPeriod(value as any)}
        buttons={[
          { value: 'month', label: t('month') },
          { value: 'quarter', label: t('quarter') },
          { value: 'year', label: t('year') },
        ]}
        style={styles.periodSelector}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderRatingOverview()}
        {renderRatingTrend()}
        {renderPerformanceMetrics()}
        {renderSentimentAnalysis()}
        {renderCompetitorComparison()}
        {renderGrowthRecommendations()}
        
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
  ratingCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  ratingTitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingBadge: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.lightWarning,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
    marginTop: 4,
  },
  ratingDistribution: {
    gap: 8,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingLabel: {
    width: 16,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: colors.warning,
  },
  barCount: {
    width: 30,
    fontSize: 12,
    color: colors.gray,
    textAlign: 'right',
  },
  trendCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  metricCard: {
    width: (screenWidth - 48) / 2,
    margin: 8,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.gray,
  },
  sentimentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sentimentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  sentimentItem: {
    alignItems: 'center',
  },
  sentimentCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sentimentValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sentimentLabel: {
    fontSize: 14,
    color: colors.gray,
  },
  sentimentInsights: {
    marginTop: 16,
  },
  sentimentInsightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  themeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeTag: {
    backgroundColor: colors.lightPrimary,
  },
  competitorCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  competitorMetrics: {
    gap: 16,
    marginBottom: 24,
  },
  competitorMetric: {
    gap: 8,
  },
  competitorValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  competitorBar: {
    height: 8,
    borderRadius: 4,
  },
  competitorLabel: {
    fontSize: 14,
    color: colors.gray,
  },
  competitorInsights: {
    padding: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  recommendationsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  recommendationItem: {
    padding: 16,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityChip: {
    height: 28,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  recommendationDescription: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
    marginBottom: 12,
  },
  impactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  impactText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  bottomPadding: {
    height: 50,
  },
});