import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  useTheme,
  IconButton,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Calendar, DateData } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n from '../../i18n';
import { getSupabase } from '../../lib/supabase';
import LoadingOverlay from '../../components/shared/LoadingOverlay';

const { width } = Dimensions.get('window');

type CustomerStackParamList = {
  DateTimeSelection: {
    serviceId: string;
    providerId: string;
    serviceName: string;
    providerName: string;
    price: number;
    duration: number;
    specialRequests?: string;
  };
  BookingConfirmation: {
    bookingData: any;
  };
};

type DateTimeSelectionScreenNavigationProp = NativeStackNavigationProp<
  CustomerStackParamList,
  'DateTimeSelection'
>;

type DateTimeSelectionScreenRouteProp = RouteProp<
  CustomerStackParamList,
  'DateTimeSelection'
>;

interface Props {
  navigation: DateTimeSelectionScreenNavigationProp;
  route: DateTimeSelectionScreenRouteProp;
}

interface TimeSlot {
  time: string;
  available: boolean;
  booked?: boolean;
}

interface ProviderAvailability {
  date: string;
  slots: TimeSlot[];
}

const DateTimeSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const isRTL = i18n.locale === 'ar';
  const {
    serviceId,
    providerId,
    serviceName,
    providerName,
    price,
    duration,
    specialRequests,
  } = route.params;

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2);
  const maxDateString = maxDate.toISOString().split('T')[0];

  useEffect(() => {
    fetchProviderAvailability();
  }, [providerId]);

  useEffect(() => {
    if (selectedDate) {
      const dayAvailability = availability.find(a => a.date === selectedDate);
      setTimeSlots(dayAvailability?.slots || []);
    }
  }, [selectedDate, availability]);

  const fetchProviderAvailability = async () => {
    setLoading(true);
    try {
      // Mock availability data - replace with actual API call
      const mockAvailability = generateMockAvailability();
      setAvailability(mockAvailability);
      
      // Mark available dates on calendar
      const marked: any = {};
      mockAvailability.forEach(day => {
        if (day.slots.some(slot => slot.available)) {
          marked[day.date] = {
            marked: true,
            dotColor: theme.colors.primary,
          };
        }
      });
      setMarkedDates(marked);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAvailability = (): ProviderAvailability[] => {
    const availability: ProviderAvailability[] = [];
    const startDate = new Date();
    
    for (let i = 0; i < 60; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
      
      const slots: TimeSlot[] = [];
      if (!isWeekend && Math.random() > 0.2) { // 80% chance of availability on weekdays
        for (let hour = 9; hour < 18; hour++) {
          slots.push({
            time: `${hour.toString().padStart(2, '0')}:00`,
            available: Math.random() > 0.3,
            booked: Math.random() > 0.7,
          });
          slots.push({
            time: `${hour.toString().padStart(2, '0')}:30`,
            available: Math.random() > 0.3,
            booked: Math.random() > 0.7,
          });
        }
      }
      
      availability.push({ date: dateString, slots });
    }
    
    return availability;
  };

  const handleDateSelect = (date: DateData) => {
    setSelectedDate(date.dateString);
    setSelectedTime('');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      const bookingData = {
        serviceId,
        providerId,
        serviceName,
        providerName,
        price,
        duration,
        specialRequests,
        date: selectedDate,
        time: selectedTime,
      };
      
      navigation.navigate('BookingConfirmation', { bookingData });
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderTimeSlot = (slot: TimeSlot) => {
    const isSelected = selectedTime === slot.time;
    const isDisabled = !slot.available || slot.booked;

    return (
      <TouchableOpacity
        key={slot.time}
        onPress={() => !isDisabled && handleTimeSelect(slot.time)}
        disabled={isDisabled}
        style={[
          styles.timeSlot,
          {
            backgroundColor: isSelected
              ? theme.colors.primary
              : isDisabled
              ? theme.colors.surfaceDisabled
              : theme.colors.surface,
            borderColor: isSelected
              ? theme.colors.primary
              : theme.colors.outline,
          },
        ]}
      >
        <Text
          variant="bodyMedium"
          style={[
            styles.timeSlotText,
            {
              color: isSelected
                ? theme.colors.onPrimary
                : isDisabled
                ? theme.colors.onSurfaceDisabled
                : theme.colors.onSurface,
            },
          ]}
        >
          {formatTime(slot.time)}
        </Text>
        {slot.booked && (
          <Text
            variant="labelSmall"
            style={[
              styles.bookedLabel,
              { color: theme.colors.onSurfaceDisabled },
            ]}
          >
            {i18n.t('booking.booked')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL ? "arrow-right" : "arrow-left"}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          {i18n.t('booking.selectDateTime')}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Service Summary */}
        <Surface style={styles.summaryCard} elevation={1}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryInfo}>
              <Text variant="bodyMedium" style={styles.summaryLabel}>
                {serviceName}
              </Text>
              <Text variant="bodySmall" style={styles.summarySubLabel}>
                {providerName}
              </Text>
            </View>
            <View style={styles.summaryDetails}>
              <Chip icon="clock-outline" style={styles.chip}>
                {duration} {i18n.t('common.min')}
              </Chip>
              <Text variant="titleMedium" style={[styles.price, { color: theme.colors.primary }]}>
                {price} {i18n.t('common.currency')}
              </Text>
            </View>
          </View>
        </Surface>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {i18n.t('booking.selectDate')}
          </Text>
          <Surface style={styles.calendarContainer} elevation={1}>
            <Calendar
              current={selectedDate || today}
              minDate={today}
              maxDate={maxDateString}
              onDayPress={handleDateSelect}
              markedDates={{
                ...markedDates,
                [selectedDate]: {
                  selected: true,
                  selectedColor: theme.colors.primary,
                  marked: markedDates[selectedDate]?.marked,
                  dotColor: 'white',
                },
              }}
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.onSurfaceVariant,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.onPrimary,
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.onSurface,
                textDisabledColor: theme.colors.onSurfaceDisabled,
                dotColor: theme.colors.primary,
                selectedDotColor: theme.colors.onPrimary,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.onSurface,
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              style={styles.calendar}
            />
          </Surface>
        </View>

        {/* Time Slots */}
        {selectedDate && (
          <View style={styles.timeSlotsSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {i18n.t('booking.selectTime')}
            </Text>
            {timeSlots.length > 0 ? (
              <View style={styles.timeSlotsGrid}>
                {timeSlots.map(renderTimeSlot)}
              </View>
            ) : (
              <Surface style={styles.noSlotsCard} elevation={1}>
                <MaterialCommunityIcons
                  name="calendar-remove"
                  size={48}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodyLarge" style={styles.noSlotsText}>
                  {i18n.t('booking.noSlotsAvailable')}
                </Text>
              </Surface>
            )}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
            <Text variant="bodySmall">{i18n.t('booking.available')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.surfaceDisabled }]} />
            <Text variant="bodySmall">{i18n.t('booking.unavailable')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      {selectedDate && selectedTime && (
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleConfirm}
            style={styles.confirmButton}
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
          >
            {i18n.t('booking.confirmDateTime')}
          </Button>
        </View>
      )}

      <LoadingOverlay visible={loading} message={i18n.t('booking.loadingAvailability')} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontWeight: '500',
  },
  summarySubLabel: {
    opacity: 0.7,
    marginTop: 2,
  },
  summaryDetails: {
    alignItems: 'flex-end',
    gap: 8,
  },
  chip: {
    backgroundColor: 'transparent',
  },
  price: {
    fontWeight: 'bold',
  },
  calendarSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  calendarContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: 12,
  },
  timeSlotsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    width: (width - 32 - 36) / 4, // 4 columns with gaps
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bookedLabel: {
    marginTop: 2,
  },
  noSlotsCard: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  noSlotsText: {
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  confirmButton: {
    borderRadius: 28,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default DateTimeSelectionScreen;