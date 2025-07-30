import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing, layout } from '../../constants/spacing';

interface StatCard {
  label: string;
  value: string;
  subValue?: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

interface QuickStatsGridProps {
  stats: StatCard[];
}

const QuickStatsGrid: React.FC<QuickStatsGridProps> = ({ stats }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const renderStatCard = (stat: StatCard, index: number) => {
    const CardWrapper = stat.onPress ? TouchableOpacity : View;
    
    return (
      <CardWrapper
        key={index}
        style={styles.cardWrapper}
        onPress={stat.onPress}
        activeOpacity={0.8}
      >
        <Card style={styles.card} elevation={1}>
          <Card.Content style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: stat.color + '20' }]}>
              <MaterialCommunityIcons
                name={stat.icon as any}
                size={24}
                color={stat.color}
              />
            </View>
            <Text variant="bodySmall" style={styles.label}>
              {stat.label}
            </Text>
            <Text variant="titleLarge" style={styles.value}>
              {stat.value}
            </Text>
            {stat.subValue && (
              <Text variant="bodySmall" style={[styles.subValue, { color: stat.color }]}>
                {stat.subValue}
              </Text>
            )}
          </Card.Content>
        </Card>
      </CardWrapper>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {stats.slice(0, 4).map((stat, index) => renderStatCard(stat, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm + 2,
  },
  cardWrapper: {
    width: '50%',
    paddingHorizontal: spacing.sm - 2,
    marginBottom: spacing.sm + spacing.xs,
  },
  card: {
    height: 120,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm + spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    fontWeight: '700',
    textAlign: 'center',
  },
  subValue: {
    fontSize: 11,
    marginTop: spacing.xs / 2,
    fontWeight: '600',
  },
});

export default QuickStatsGrid;