import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Avatar, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';

interface ClientInsight {
  id: string;
  type: 'new_client' | 'returning_client' | 'vip_client' | 'at_risk' | 'birthday';
  title: string;
  subtitle: string;
  clients: {
    id: string;
    name: string;
    avatar?: string;
    lastVisit?: string;
    totalSpent?: number;
    visitCount?: number;
  }[];
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ClientInsightsProps {
  insights: ClientInsight[];
  onClientPress?: (clientId: string) => void;
}

const ClientInsights: React.FC<ClientInsightsProps> = ({ insights, onClientPress }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const getInsightIcon = (type: ClientInsight['type']) => {
    switch (type) {
      case 'new_client':
        return 'account-plus';
      case 'returning_client':
        return 'account-check';
      case 'vip_client':
        return 'star-circle';
      case 'at_risk':
        return 'alert-circle';
      case 'birthday':
        return 'cake-variant';
      default:
        return 'account';
    }
  };

  const getInsightColor = (type: ClientInsight['type']) => {
    switch (type) {
      case 'new_client':
        return theme.colors.success || theme.colors.tertiary;
      case 'returning_client':
        return theme.colors.primary;
      case 'vip_client':
        return theme.colors.warning || theme.colors.secondary;
      case 'at_risk':
        return theme.colors.error;
      case 'birthday':
        return theme.colors.info || theme.colors.primary;
      default:
        return theme.colors.primary;
    }
  };

  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.title}>
          {t('dashboard.clientInsights')}
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          {t('dashboard.actionableClientData')}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {insights.map((insight) => {
          const insightColor = getInsightColor(insight.type);
          const insightIcon = getInsightIcon(insight.type);

          return (
            <Card
              key={insight.id}
              style={[
                styles.insightCard,
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: insightColor,
                }
              ]}
              elevation={1}
            >
              <Card.Content>
                <View style={styles.insightHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: insightColor + '20' }]}>
                    <MaterialCommunityIcons
                      name={insightIcon as any}
                      size={24}
                      color={insightColor}
                    />
                  </View>
                  <View style={styles.insightTitleContainer}>
                    <Text 
                      variant="bodyMedium" 
                      style={[styles.insightTitle, { color: insightColor }]}
                    >
                      {insight.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.insightSubtitle}>
                      {insight.subtitle}
                    </Text>
                  </View>
                </View>

                <View style={styles.clientsList}>
                  {insight.clients.slice(0, 3).map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={styles.clientItem}
                      onPress={() => onClientPress?.(client.id)}
                      activeOpacity={0.7}
                    >
                      <Avatar.Text
                        size={32}
                        label={client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        style={[styles.avatar, { backgroundColor: insightColor + '30' }]}
                        labelStyle={{ color: insightColor, fontSize: 12 }}
                      />
                      <View style={styles.clientInfo}>
                        <Text 
                          variant="bodySmall" 
                          style={styles.clientName}
                          numberOfLines={1}
                        >
                          {client.name}
                        </Text>
                        {client.lastVisit && (
                          <Text variant="bodySmall" style={styles.clientDetail}>
                            {t('dashboard.lastVisit')}: {client.lastVisit}
                          </Text>
                        )}
                        {client.visitCount !== undefined && (
                          <Text variant="bodySmall" style={styles.clientDetail}>
                            {client.visitCount} {t('dashboard.visits')}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  {insight.clients.length > 3 && (
                    <Text variant="bodySmall" style={styles.moreClients}>
                      +{insight.clients.length - 3} {t('dashboard.moreClients')}
                    </Text>
                  )}
                </View>

                {insight.action && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: insightColor + '15' }]}
                    onPress={insight.action.onPress}
                    activeOpacity={0.8}
                  >
                    <Text 
                      variant="labelSmall" 
                      style={[styles.actionText, { color: insightColor }]}
                    >
                      {insight.action.label}
                    </Text>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={14}
                      color={insightColor}
                    />
                  </TouchableOpacity>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons
            name="account-group"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodySmall" style={styles.summaryText}>
            {t('dashboard.totalClients', { count: 156 })}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons
            name="account-heart"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodySmall" style={styles.summaryText}>
            {t('dashboard.loyalClients', { count: 89 })}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons
            name="trending-up"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodySmall" style={styles.summaryText}>
            {t('dashboard.retentionRate', { rate: '72%' })}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontWeight: '600',
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  insightCard: {
    width: 300,
    borderWidth: 1,
    borderRadius: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightTitleContainer: {
    flex: 1,
  },
  insightTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  insightSubtitle: {
    opacity: 0.7,
    fontSize: 12,
  },
  clientsList: {
    gap: 8,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  avatar: {
    marginRight: 10,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontWeight: '500',
    marginBottom: 2,
  },
  clientDetail: {
    opacity: 0.6,
    fontSize: 11,
  },
  moreClients: {
    opacity: 0.6,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  actionText: {
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    opacity: 0.7,
  },
  summaryDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 8,
  },
});

export default ClientInsights;