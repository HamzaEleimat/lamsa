import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';

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
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  cardWrapper: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  card: {
    height: 120,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 4,
  },
  value: {
    fontWeight: '700',
    textAlign: 'center',
  },
  subValue: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
});

export default QuickStatsGrid;