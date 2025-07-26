import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { NotificationType, NotificationPriority } from '../../services/notifications/types';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import SwipeableRow from '../common/SwipeableRow';

interface NotificationCenterProps {
  onNotificationPress?: (notification: any) => void;
}

export default function NotificationCenter({ onNotificationPress }: NotificationCenterProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? ar : enUS;
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refreshNotifications,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: any) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Call custom handler
    if (onNotificationPress) {
      onNotificationPress(notification);
    } else {
      // Default navigation based on type
      handleDefaultNavigation(notification);
    }
  };

  const handleDefaultNavigation = (notification: any) => {
    // Navigate based on notification type
    switch (notification.type) {
      case NotificationType.NEW_BOOKING:
      case NotificationType.BOOKING_CANCELLED:
      case NotificationType.BOOKING_MODIFIED:
        // Navigate to booking details
        console.log('Navigate to booking:', notification.data?.bookingId);
        break;
      case NotificationType.NEW_REVIEW:
        // Navigate to reviews
        console.log('Navigate to reviews');
        break;
      case NotificationType.PAYMENT_RECEIVED:
      case NotificationType.PAYMENT_FAILED:
        // Navigate to payments
        console.log('Navigate to payments');
        break;
      default:
        // No specific navigation
        break;
    }
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      t('markAllAsRead'),
      t('markAllAsReadConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('confirm'), onPress: markAllAsRead },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      t('clearAllNotifications'),
      t('clearAllNotificationsConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('confirm'), onPress: clearAll, style: 'destructive' },
      ]
    );
  };

  const formatNotificationDate = (dateString: string) => {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale });
    } else if (isYesterday(date)) {
      return t('yesterday');
    } else {
      return format(date, 'dd MMM', { locale });
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.NEW_BOOKING:
        return { name: 'calendar-sharp', color: colors.success };
      case NotificationType.BOOKING_CANCELLED:
        return { name: 'calendar-clear', color: colors.error };
      case NotificationType.BOOKING_MODIFIED:
        return { name: 'calendar', color: colors.warning };
      case NotificationType.NEW_REVIEW:
        return { name: 'star', color: colors.warning };
      case NotificationType.PAYMENT_RECEIVED:
        return { name: 'cash', color: colors.success };
      case NotificationType.PAYMENT_FAILED:
        return { name: 'cash', color: colors.error };
      case NotificationType.DAILY_SCHEDULE:
        return { name: 'today', color: colors.primary };
      case NotificationType.ANNOUNCEMENT:
        return { name: 'megaphone', color: colors.info };
      default:
        return { name: 'notifications', color: colors.gray };
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.CRITICAL:
        return { color: colors.error, label: t('critical') };
      case NotificationPriority.HIGH:
        return { color: colors.warning, label: t('high') };
      default:
        return null;
    }
  };

  const renderNotification = ({ item }: { item: any }) => {
    const icon = getNotificationIcon(item.type);
    const priorityBadge = getPriorityBadge(item.priority);
    const isRTL = i18n.language === 'ar';
    const title = isRTL ? item.titleAr || item.title : item.title;
    const body = isRTL ? item.bodyAr || item.body : item.body;

    return (
      <SwipeableRow
        onDelete={() => deleteNotification(item.id)}
        onArchive={() => markAsRead(item.id)}
      >
        <TouchableOpacity
          style={[
            styles.notificationItem,
            !item.read && styles.unreadNotification,
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.notificationIcon}>
            <Ionicons name={icon.name as any} size={24} color={icon.color} />
          </View>

          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text
                style={[
                  styles.notificationTitle,
                  !item.read && styles.unreadText,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {priorityBadge && (
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: priorityBadge.color + '20' },
                  ]}
                >
                  <Text
                    style={[styles.priorityText, { color: priorityBadge.color }]}
                  >
                    {priorityBadge.label}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.notificationBody} numberOfLines={2}>
              {body}
            </Text>

            <View style={styles.notificationFooter}>
              <Text style={styles.notificationTime}>
                {formatNotificationDate(item.receivedAt)}
              </Text>

              {item.actions && item.actions.length > 0 && (
                <View style={styles.notificationActions}>
                  {item.actions.map((action: any) => (
                    <TouchableOpacity
                      key={action.id}
                      style={[
                        styles.actionButton,
                        action.style === 'primary' && styles.primaryAction,
                        action.style === 'destructive' && styles.destructiveAction,
                      ]}
                      onPress={() => console.log('Action:', action.action)}
                    >
                      <Text
                        style={[
                          styles.actionText,
                          action.style === 'primary' && styles.primaryActionText,
                          action.style === 'destructive' && styles.destructiveActionText,
                        ]}
                      >
                        {isRTL ? action.titleAr || action.title : action.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  };

  const renderHeader = () => {
    if (notifications.length === 0) return null;

    return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('notifications.title')} {unreadCount > 0 && `(${unreadCount})`}
        </Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead}>
              <Ionicons name="checkmark-done" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={24} color={colors.gray} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={colors.gray} />
      <Text style={styles.emptyTitle}>{t('noNotifications')}</Text>
      <Text style={styles.emptyText}>{t('noNotificationsDescription')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyListContent,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  clearButton: {
    marginLeft: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.white,
  },
  unreadNotification: {
    backgroundColor: colors.lightPrimary,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: colors.gray,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  destructiveAction: {
    borderColor: colors.error,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  primaryActionText: {
    color: colors.white,
  },
  destructiveActionText: {
    color: colors.error,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
});