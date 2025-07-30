import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../constants/spacing';

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  icon: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface SmartAlertsProps {
  alerts: Alert[];
  onDismiss?: (alertId: string) => void;
}

const SmartAlerts: React.FC<SmartAlertsProps> = ({ alerts, onDismiss }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'info':
        return theme.colors.info || theme.colors.primary;
      case 'warning':
        return theme.colors.warning || theme.colors.secondary;
      case 'success':
        return theme.colors.success || theme.colors.tertiary;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getAlertBackground = (type: Alert['type']) => {
    const color = getAlertColor(type);
    return color + '15'; // 15% opacity
  };

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.title}>
          {t('dashboard.smartAlerts')}
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          {alerts.length} {t('dashboard.activeAlerts')}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {alerts.map((alert) => {
          const alertColor = getAlertColor(alert.type);
          const alertBackground = getAlertBackground(alert.type);

          return (
            <Card
              key={alert.id}
              style={[
                styles.alertCard,
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: alertColor,
                }
              ]}
              elevation={1}
            >
              <View style={[styles.alertHeader, { backgroundColor: alertBackground }]}>
                <View style={[styles.iconContainer, { backgroundColor: alertColor + '20' }]}>
                  <MaterialCommunityIcons
                    name={alert.icon as any}
                    size={20}
                    color={alertColor}
                  />
                </View>
                {onDismiss && (
                  <IconButton
                    icon="close"
                    size={16}
                    iconColor={theme.colors.onSurfaceVariant}
                    onPress={() => onDismiss(alert.id)}
                    style={styles.dismissButton}
                  />
                )}
              </View>
              
              <Card.Content style={styles.alertContent}>
                <Text 
                  variant="bodyMedium" 
                  style={[styles.alertTitle, { color: alertColor }]}
                  numberOfLines={1}
                >
                  {alert.title}
                </Text>
                <Text 
                  variant="bodySmall" 
                  style={styles.alertMessage}
                  numberOfLines={2}
                >
                  {alert.message}
                </Text>
                
                {alert.action && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: alertColor + '15' }]}
                    onPress={alert.action.onPress}
                    activeOpacity={0.8}
                  >
                    <Text 
                      variant="labelSmall" 
                      style={[styles.actionText, { color: alertColor }]}
                    >
                      {alert.action.label}
                    </Text>
                  </TouchableOpacity>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>
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
  alertCard: {
    width: 280,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButton: {
    margin: 0,
  },
  alertContent: {
    paddingTop: spacing.sm,
  },
  alertTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  alertMessage: {
    opacity: 0.8,
    lineHeight: 18,
    marginBottom: spacing.sm + spacing.xs,
  },
  actionButton: {
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.sm - 2,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontWeight: '500',
  },
});

export default SmartAlerts;