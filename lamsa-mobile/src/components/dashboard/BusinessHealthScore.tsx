import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing, layout } from '../../constants/spacing';

interface BusinessHealthScoreProps {
  score: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  factors: {
    occupancyRate: number;
    revenueVsTarget: number;
    customerSatisfaction: number;
    staffUtilization: number;
  };
  tip?: string;
}

const BusinessHealthScore: React.FC<BusinessHealthScoreProps> = ({
  score,
  trend,
  factors,
  tip,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'trending-neutral';
    }
  };

  const scoreColor = getScoreColor(score);

  return (
    <Card style={styles.container} elevation={2}>
      <Card.Content>
        <View style={styles.header}>
          <View>
            <Text variant="titleMedium" style={styles.title}>
              {t('dashboard.businessHealth')}
            </Text>
            <View style={styles.scoreContainer}>
              <Text style={[styles.scoreText, { color: scoreColor }]}>
                {score}%
              </Text>
              <MaterialCommunityIcons
                name={getTrendIcon()}
                size={24}
                color={scoreColor}
                style={styles.trendIcon}
              />
            </View>
          </View>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreCircleText, { color: scoreColor }]}>
              {score}
            </Text>
          </View>
        </View>

        <View style={styles.factorsContainer}>
          <View style={styles.factor}>
            <View style={styles.factorHeader}>
              <MaterialCommunityIcons
                name="calendar-check"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.factorLabel}>
                {t('dashboard.occupancyRate')}
              </Text>
            </View>
            <ProgressBar
              progress={factors.occupancyRate / 100}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text variant="bodySmall" style={styles.factorValue}>
              {factors.occupancyRate}%
            </Text>
          </View>

          <View style={styles.factor}>
            <View style={styles.factorHeader}>
              <MaterialCommunityIcons
                name="cash"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.factorLabel}>
                {t('dashboard.revenueTarget')}
              </Text>
            </View>
            <ProgressBar
              progress={factors.revenueVsTarget / 100}
              color={theme.colors.success}
              style={styles.progressBar}
            />
            <Text variant="bodySmall" style={styles.factorValue}>
              {factors.revenueVsTarget}%
            </Text>
          </View>

          <View style={styles.factor}>
            <View style={styles.factorHeader}>
              <MaterialCommunityIcons
                name="star"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.factorLabel}>
                {t('dashboard.satisfaction')}
              </Text>
            </View>
            <ProgressBar
              progress={factors.customerSatisfaction / 100}
              color={theme.colors.warning}
              style={styles.progressBar}
            />
            <Text variant="bodySmall" style={styles.factorValue}>
              {factors.customerSatisfaction}%
            </Text>
          </View>

          <View style={styles.factor}>
            <View style={styles.factorHeader}>
              <MaterialCommunityIcons
                name="account-group"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.factorLabel}>
                {t('dashboard.staffUtilization')}
              </Text>
            </View>
            <ProgressBar
              progress={factors.staffUtilization / 100}
              color={theme.colors.info}
              style={styles.progressBar}
            />
            <Text variant="bodySmall" style={styles.factorValue}>
              {factors.staffUtilization}%
            </Text>
          </View>
        </View>

        {tip && (
          <View style={[styles.tipContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text variant="bodySmall" style={styles.tipText}>
              {tip}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    ...layout.cardMargin,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '700',
  },
  trendIcon: {
    marginLeft: 8,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircleText: {
    fontSize: 24,
    fontWeight: '700',
  },
  factorsContainer: {
    gap: 12,
  },
  factor: {
    gap: 4,
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  factorLabel: {
    flex: 1,
    opacity: 0.7,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  factorValue: {
    textAlign: 'right',
    opacity: 0.7,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + spacing.xs,
    borderRadius: spacing.sm,
    marginTop: spacing.md,
  },
  tipText: {
    flex: 1,
  },
});

export default BusinessHealthScore;