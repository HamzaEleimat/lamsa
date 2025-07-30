import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';

interface TimeSlot {
  time: string;
  date?: string;
  isBooked: boolean;
  isBreak?: boolean;
  isPast?: boolean;
  isToday?: boolean;
  isCurrentWeek?: boolean;
  bookingCount?: number;
  revenue?: string;
  booking?: {
    id: string;
    customerName: string;
    serviceName: string;
    duration: number;
    status: 'confirmed' | 'pending' | 'in-progress';
  };
}

interface ScheduleTimelineProps {
  slots: TimeSlot[];
  period?: 'today' | 'week' | 'month';
  onSlotPress?: (slot: TimeSlot) => void;
  onAddPress?: () => void;
}

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({
  slots,
  period = 'today',
  onSlotPress,
  onAddPress,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const getSlotColor = (slot: TimeSlot) => {
    if (slot.isPast) return theme.colors.surfaceDisabled;
    if (slot.isBreak) return theme.colors.surfaceVariant;
    if (slot.isBooked) {
      switch (slot.booking?.status) {
        case 'in-progress':
          return theme.colors.primaryContainer;
        case 'pending':
          return theme.colors.warningContainer || theme.colors.secondaryContainer;
        default:
          return theme.colors.secondaryContainer;
      }
    }
    return theme.colors.surface;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'in-progress':
        return 'play-circle';
      case 'pending':
        return 'clock-outline';
      default:
        return 'check-circle';
    }
  };

  return (
    <Card style={styles.container} elevation={2}>
      <Card.Content>
        <View style={styles.header}>
          <View>
            <Text variant="titleMedium" style={styles.title}>
              {period === 'today' ? t('dashboard.todaySchedule') : 
               period === 'week' ? t('dashboard.weekSchedule') :
               t('dashboard.monthSchedule')}
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              {period === 'today' 
                ? `${slots.filter(s => s.isBooked).length} ${t('dashboard.of')} ${slots.length} ${t('dashboard.slotsBooked')}`
                : period === 'week'
                ? `${slots.reduce((acc, s) => acc + (s.bookingCount || 0), 0)} ${t('dashboard.bookingsThisWeek')}`
                : `${slots.reduce((acc, s) => acc + (s.bookingCount || 0), 0)} ${t('dashboard.bookingsThisMonth')}`}
            </Text>
          </View>
          {onAddPress && (
            <TouchableOpacity onPress={onAddPress}>
              <MaterialCommunityIcons
                name="plus-circle"
                size={28}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.timeline}
          contentContainerStyle={styles.timelineContent}
        >
          {slots.map((slot, index) => {
            const slotColor = getSlotColor(slot);
            const isActive = slot.booking?.status === 'in-progress';
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.slot,
                  period !== 'today' && styles.largeSlot,
                  { backgroundColor: slotColor },
                  isActive && styles.activeSlot,
                  slot.isPast && styles.pastSlot,
                ]}
                onPress={() => onSlotPress?.(slot)}
                disabled={slot.isPast || slot.isBreak}
                activeOpacity={0.8}
              >
                <Text 
                  variant="bodySmall" 
                  style={[
                    styles.time,
                    slot.isPast && styles.pastText,
                  ]}
                >
                  {slot.time}
                </Text>
                {slot.date && (
                  <Text 
                    variant="bodySmall" 
                    style={[styles.date, slot.isPast && styles.pastText]}
                  >
                    {slot.date}
                  </Text>
                )}
                
                {slot.isBreak ? (
                  <MaterialCommunityIcons
                    name="coffee"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.breakIcon}
                  />
                ) : slot.isBooked && slot.booking ? (
                  <>
                    <Text 
                      variant="bodySmall" 
                      style={styles.customerName}
                      numberOfLines={1}
                    >
                      {slot.booking.customerName}
                    </Text>
                    <Text 
                      variant="bodySmall" 
                      style={styles.serviceName}
                      numberOfLines={1}
                    >
                      {slot.booking.serviceName}
                    </Text>
                    {slot.booking.status && (
                      <MaterialCommunityIcons
                        name={getStatusIcon(slot.booking.status) as any}
                        size={12}
                        color={theme.colors.primary}
                        style={styles.statusIcon}
                      />
                    )}
                  </>
                ) : (
                  <Text variant="bodySmall" style={styles.availableText}>
                    {t('dashboard.available')}
                  </Text>
                )}
                
                {isActive && (
                  <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.secondaryContainer }]} />
            <Text variant="bodySmall" style={styles.legendText}>
              {t('dashboard.confirmed')}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.primaryContainer }]} />
            <Text variant="bodySmall" style={styles.legendText}>
              {t('dashboard.inProgress')}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.surface }]} />
            <Text variant="bodySmall" style={styles.legendText}>
              {t('dashboard.available')}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 2,
  },
  timeline: {
    marginHorizontal: -16,
  },
  timelineContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  slot: {
    width: 100,
    minHeight: 80,
    padding: 8,
    borderRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
  },
  largeSlot: {
    width: 120,
    minHeight: 100,
  },
  activeSlot: {
    borderWidth: 2,
  },
  pastSlot: {
    opacity: 0.6,
  },
  time: {
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    opacity: 0.7,
    marginBottom: 4,
  },
  pastText: {
    opacity: 0.5,
  },
  customerName: {
    fontWeight: '500',
    textAlign: 'center',
  },
  serviceName: {
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 2,
  },
  availableText: {
    opacity: 0.5,
    marginTop: 8,
  },
  breakIcon: {
    marginTop: 8,
  },
  statusIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    opacity: 0.7,
    fontSize: 11,
  },
});

export default ScheduleTimeline;