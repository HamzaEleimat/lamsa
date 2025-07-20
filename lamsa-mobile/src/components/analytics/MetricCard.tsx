import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
  };
  onPress?: () => void;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = colors.primary,
  trend,
  onPress,
  style,
  size = 'medium',
}: MetricCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;
  
  const sizeStyles = {
    small: {
      iconSize: 20,
      iconContainer: 32,
      valueSize: 20,
      titleSize: 12,
      padding: 12,
    },
    medium: {
      iconSize: 24,
      iconContainer: 40,
      valueSize: 24,
      titleSize: 14,
      padding: 16,
    },
    large: {
      iconSize: 28,
      iconContainer: 48,
      valueSize: 28,
      titleSize: 16,
      padding: 20,
    },
  };
  
  const currentSize = sizeStyles[size];
  
  const content = (
    <Card style={[styles.card, style]}>
      <Card.Content style={[styles.content, { padding: currentSize.padding }]}>
        <View style={styles.header}>
          <View style={[
            styles.iconContainer,
            {
              width: currentSize.iconContainer,
              height: currentSize.iconContainer,
              backgroundColor: iconColor + '20',
            }
          ]}>
            <Ionicons name={icon as any} size={currentSize.iconSize} color={iconColor} />
          </View>
          {trend && (
            <View style={styles.trendContainer}>
              <Ionicons
                name={isPositiveTrend ? 'trending-up' : 'trending-down'}
                size={16}
                color={isPositiveTrend ? colors.success : colors.error}
              />
              <Text style={[
                styles.trendValue,
                { color: isPositiveTrend ? colors.success : colors.error }
              ]}>
                {Math.abs(trend.value)}%
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.value, { fontSize: currentSize.valueSize }]}>{value}</Text>
        <Text style={[styles.title, { fontSize: currentSize.titleSize }]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        
        {trend && trend.label && (
          <Text style={styles.trendLabel}>{trend.label}</Text>
        )}
      </Card.Content>
    </Card>
  );
  
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  trendLabel: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 4,
  },
});