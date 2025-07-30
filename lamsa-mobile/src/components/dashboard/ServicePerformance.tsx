import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing, layout } from '../../constants/spacing';

interface ServiceData {
  id: string;
  name: string;
  nameAr: string;
  bookings: number;
  revenue: number;
  rating: number;
  trend: 'up' | 'down' | 'stable';
  categoryIcon: string;
}

interface ServicePerformanceProps {
  services: ServiceData[];
  totalBookings: number;
  onServicePress?: (service: ServiceData) => void;
  onViewAllPress?: () => void;
}

const ServicePerformance: React.FC<ServicePerformanceProps> = ({
  services,
  totalBookings,
  onServicePress,
  onViewAllPress,
}) => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const getTopServices = () => {
    return services
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);
  };

  const getTrendIcon = (trend: ServiceData['trend']) => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'trending-neutral';
    }
  };

  const getTrendColor = (trend: ServiceData['trend']) => {
    switch (trend) {
      case 'up':
        return theme.colors.success || theme.colors.tertiary;
      case 'down':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const topServices = getTopServices();

  if (!services || services.length === 0) {
    return null;
  }

  return (
    <Card style={styles.container} elevation={2}>
      <Card.Content>
        <View style={styles.header}>
          <View>
            <Text variant="titleMedium" style={styles.title}>
              {t('dashboard.servicePerformance')}
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              {t('dashboard.topPerformingServices')}
            </Text>
          </View>
          {onViewAllPress && (
            <TouchableOpacity onPress={onViewAllPress}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                {t('common.viewAll')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.servicesList}>
          {topServices.map((service, index) => {
            const percentage = totalBookings > 0 
              ? (service.bookings / totalBookings) * 100 
              : 0;

            return (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceItem}
                onPress={() => onServicePress?.(service)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceInfo}>
                    <View style={[
                      styles.iconContainer,
                      { backgroundColor: theme.colors.primaryContainer }
                    ]}>
                      <MaterialCommunityIcons
                        name={service.categoryIcon as any}
                        size={20}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.serviceDetails}>
                      <Text 
                        variant="bodyMedium" 
                        style={styles.serviceName}
                        numberOfLines={1}
                      >
                        {i18n.language === 'ar' ? service.nameAr : service.name}
                      </Text>
                      <View style={styles.serviceStats}>
                        <Text variant="bodySmall" style={styles.statText}>
                          {service.bookings} {t('common.bookings')}
                        </Text>
                        <Text variant="bodySmall" style={styles.statDivider}>
                          •
                        </Text>
                        <Text variant="bodySmall" style={styles.statText}>
                          {service.revenue} {t('common.jod')}
                        </Text>
                        <Text variant="bodySmall" style={styles.statDivider}>
                          •
                        </Text>
                        <MaterialCommunityIcons
                          name="star"
                          size={12}
                          color={theme.colors.warning || theme.colors.secondary}
                        />
                        <Text variant="bodySmall" style={styles.statText}>
                          {service.rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.trendContainer}>
                    <MaterialCommunityIcons
                      name={getTrendIcon(service.trend) as any}
                      size={20}
                      color={getTrendColor(service.trend)}
                    />
                  </View>
                </View>
                <View style={styles.progressContainer}>
                  <ProgressBar
                    progress={percentage / 100}
                    color={theme.colors.primary}
                    style={styles.progressBar}
                  />
                  <Text variant="bodySmall" style={styles.percentageText}>
                    {percentage.toFixed(0)}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <MaterialCommunityIcons
              name="chart-donut"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.footerText}>
              {t('dashboard.totalServices', { count: services.length })}
            </Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerItem}>
            <MaterialCommunityIcons
              name="star-circle"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.footerText}>
              {t('dashboard.avgServiceRating', { 
                rating: (services.reduce((acc, s) => acc + s.rating, 0) / services.length).toFixed(1) 
              })}
            </Text>
          </View>
        </View>
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
  },
  subtitle: {
    opacity: 0.7,
    marginTop: spacing.xs / 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  servicesList: {
    gap: spacing.sm + spacing.xs,
  },
  serviceItem: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  serviceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    opacity: 0.7,
    fontSize: 12,
  },
  statDivider: {
    opacity: 0.3,
    fontSize: 12,
  },
  trendContainer: {
    marginLeft: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  percentageText: {
    minWidth: 35,
    textAlign: 'right',
    opacity: 0.7,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    opacity: 0.7,
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
});

export default ServicePerformance;