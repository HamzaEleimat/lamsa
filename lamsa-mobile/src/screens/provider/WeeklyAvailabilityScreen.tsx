import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
  Platform,
  I18nManager,
  PanGestureHandler,
  State,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useNavigation } from '@react-navigation/native';
import {
  format,
  startOfWeek,
  addDays,
  addMinutes,
  isToday,
  isSameDay,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../constants/colors';
import { availabilityService, WeeklyAvailability } from '../../services/availabilityService';
import { useAuth } from '../../contexts/AuthContext';
import TouchTimeSelector from '../../components/availability/TouchTimeSelector';
import FridayPrayerManager from '../../components/availability/FridayPrayerManager';
import ScheduleTemplatesModal from '../../components/availability/ScheduleTemplatesModal';
import BreakTimeManager from '../../components/availability/BreakTimeManager';

const { width, height } = Dimensions.get('window');

interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  type: 'available' | 'booked' | 'break' | 'prayer' | 'unavailable';
  title?: string;
  serviceId?: string;
  customerId?: string;
}

interface DaySchedule {
  date: Date;
  isWorkingDay: boolean;
  startTime?: Date;
  endTime?: Date;
  breaks: TimeSlot[];
  bookings: TimeSlot[];
  availability: TimeSlot[];
}

export default function WeeklyAvailabilityScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;
  const scrollViewRef = useRef<ScrollView>(null);

  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 6 })); // Saturday start
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [timeSelectorVisible, setTimeSelectorVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFridayPrayer, setShowFridayPrayer] = useState(false);
  const [showBreakManager, setShowBreakManager] = useState(false);

  // Time grid configuration
  const timeSlotHeight = 60; // Height of each time slot
  const hourSlots = 24; // 24 hours
  const slotsPerHour = 4; // 15-minute intervals
  const totalSlots = hourSlots * slotsPerHour;

  useEffect(() => {
    loadWeeklySchedule();
  }, [currentWeek]);

  const loadWeeklySchedule = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      // Get weekly availability from Supabase
      const weeklyAvailability = await availabilityService.getWeeklyAvailability(user.id);
      
      // Get exception dates for the current week
      const startDate = format(currentWeek, 'yyyy-MM-dd');
      const endDate = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
      const exceptionDates = await availabilityService.getExceptionDates(user.id, startDate, endDate);

      // Build week schedule
      const schedule: DaySchedule[] = [];
      const weekDays = getWeekDays();

      for (const day of weekDays) {
        const dayOfWeek = day.getDay();
        const availability = weeklyAvailability.find(a => a.day_of_week === dayOfWeek);
        const exception = exceptionDates.find(e => e.date === format(day, 'yyyy-MM-dd'));

        if (exception) {
          // Use exception date settings
          schedule.push({
            date: day,
            isWorkingDay: exception.is_working_day,
            startTime: exception.start_time ? parseISO(`${format(day, 'yyyy-MM-dd')}T${exception.start_time}`) : undefined,
            endTime: exception.end_time ? parseISO(`${format(day, 'yyyy-MM-dd')}T${exception.end_time}`) : undefined,
            breaks: [],
            bookings: [],
            availability: []
          });
        } else if (availability) {
          // Use regular weekly schedule
          schedule.push({
            date: day,
            isWorkingDay: availability.is_working_day,
            startTime: availability.start_time ? parseISO(`${format(day, 'yyyy-MM-dd')}T${availability.start_time}`) : undefined,
            endTime: availability.end_time ? parseISO(`${format(day, 'yyyy-MM-dd')}T${availability.end_time}`) : undefined,
            breaks: availability.break_start && availability.break_end ? [{
              id: `break-${day.getTime()}`,
              startTime: parseISO(`${format(day, 'yyyy-MM-dd')}T${availability.break_start}`),
              endTime: parseISO(`${format(day, 'yyyy-MM-dd')}T${availability.break_end}`),
              type: 'break' as const,
              title: t('break')
            }] : [],
            bookings: [],
            availability: []
          });
        } else {
          // No schedule defined
          schedule.push({
            date: day,
            isWorkingDay: false,
            breaks: [],
            bookings: [],
            availability: []
          });
        }
      }

      setWeekSchedule(schedule);
    } catch (error) {
      console.error('Error loading weekly schedule:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWeeklySchedule();
    setRefreshing(false);
  };

  const navigateWeek = (direction: 'previous' | 'next') => {
    const newWeek = addDays(currentWeek, direction === 'next' ? 7 : -7);
    setCurrentWeek(newWeek);
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeek, i));
    }
    return days;
  };

  const getTimeSlots = () => {
    const slots = [];
    const startTime = startOfDay(new Date());
    
    for (let i = 0; i < totalSlots; i++) {
      const time = addMinutes(startTime, i * 15);
      slots.push(time);
    }
    
    return slots;
  };

  const getSlotTypeColor = (type: TimeSlot['type']) => {
    switch (type) {
      case 'available':
        return colors.success;
      case 'booked':
        return colors.error;
      case 'break':
        return colors.warning;
      case 'prayer':
        return colors.secondary;
      case 'unavailable':
        return colors.lightGray;
      default:
        return colors.white;
    }
  };

  const formatTimeSlot = (time: Date) => {
    return format(time, 'HH:mm');
  };

  const handleTimeSlotPress = (day: Date, timeSlot: Date) => {
    setSelectedDay(day);
    setSelectedTimeSlot({
      id: `${day.getTime()}-${timeSlot.getTime()}`,
      startTime: timeSlot,
      endTime: addMinutes(timeSlot, 15),
      type: 'available',
    });
    setTimeSelectorVisible(true);
  };

  const renderTimeSlot = (day: Date, timeSlot: Date, daySchedule?: DaySchedule) => {
    const slotKey = `${day.getTime()}-${timeSlot.getTime()}`;
    
    // Find if this slot has any booking or break
    let slotType: TimeSlot['type'] = 'available';
    let slotData: TimeSlot | null = null;

    if (daySchedule) {
      // Check for bookings
      const booking = daySchedule.bookings.find(b => 
        timeSlot >= b.startTime && timeSlot < b.endTime
      );
      if (booking) {
        slotType = 'booked';
        slotData = booking;
      }

      // Check for breaks
      const breakSlot = daySchedule.breaks.find(b => 
        timeSlot >= b.startTime && timeSlot < b.endTime
      );
      if (breakSlot) {
        slotType = 'break';
        slotData = breakSlot;
      }

      // Check if day is working day
      if (!daySchedule.isWorkingDay) {
        slotType = 'unavailable';
      }

      // Check if time is outside working hours
      if (daySchedule.isWorkingDay && daySchedule.startTime && daySchedule.endTime) {
        if (timeSlot < daySchedule.startTime || timeSlot >= daySchedule.endTime) {
          slotType = 'unavailable';
        }
      }
    }

    return (
      <TouchableOpacity
        key={slotKey}
        style={[
          styles.timeSlot,
          {
            backgroundColor: getSlotTypeColor(slotType),
            borderTopWidth: timeSlot.getMinutes() === 0 ? 2 : 0.5,
            borderTopColor: timeSlot.getMinutes() === 0 ? colors.border : colors.lightGray,
          },
        ]}
        onPress={() => handleTimeSlotPress(day, timeSlot)}
        activeOpacity={0.8}
      >
        {slotData && (
          <Text style={styles.slotText} numberOfLines={1}>
            {slotData.title || formatTimeSlot(timeSlot)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderDayColumn = (day: Date, daySchedule?: DaySchedule) => {
    const timeSlots = getTimeSlots();
    const isCurrentDay = isToday(day);
    
    return (
      <View key={day.getTime()} style={styles.dayColumn}>
        {/* Day Header */}
        <View style={[styles.dayHeader, isCurrentDay && styles.currentDayHeader]}>
          <Text style={[styles.dayName, isCurrentDay && styles.currentDayText]}>
            {format(day, 'EEE', { locale })}
          </Text>
          <Text style={[styles.dayDate, isCurrentDay && styles.currentDayText]}>
            {format(day, 'd')}
          </Text>
        </View>

        {/* Time Slots */}
        <View style={styles.daySlots}>
          {timeSlots.map(timeSlot => renderTimeSlot(day, timeSlot, daySchedule))}
        </View>
      </View>
    );
  };

  const renderTimeLabels = () => {
    const timeSlots = getTimeSlots();
    
    return (
      <View style={styles.timeLabelsColumn}>
        <View style={styles.timeLabelsHeader} />
        <View style={styles.timeLabels}>
          {timeSlots.map((time, index) => {
            // Only show labels for full hours
            if (time.getMinutes() === 0) {
              return (
                <View key={index} style={styles.timeLabelContainer}>
                  <Text style={styles.timeLabel}>
                    {format(time, 'HH:mm')}
                  </Text>
                </View>
              );
            }
            return <View key={index} style={styles.timeSlot} />;
          })}
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    
    return (
      <ScrollView
        ref={scrollViewRef}
        style={styles.weekContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.weekGrid}>
            {/* Time Labels */}
            {renderTimeLabels()}
            
            {/* Day Columns */}
            {weekDays.map(day => {
              const daySchedule = weekSchedule.find(s => 
                isSameDay(s.date, day)
              );
              return renderDayColumn(day, daySchedule);
            })}
          </View>
        </ScrollView>
      </ScrollView>
    );
  };

  const renderDayView = () => {
    if (!selectedDay) return null;
    
    const daySchedule = weekSchedule.find(s => 
      isSameDay(s.date, selectedDay)
    );
    
    return (
      <ScrollView style={styles.dayContainer}>
        <View style={styles.dayViewGrid}>
          {renderTimeLabels()}
          {renderDayColumn(selectedDay, daySchedule)}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <TouchableOpacity onPress={() => navigateWeek('previous')}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <Text style={styles.weekTitle}>
            {format(currentWeek, 'MMM d', { locale })} - {format(addDays(currentWeek, 6), 'MMM d, yyyy', { locale })}
          </Text>
          
          <TouchableOpacity onPress={() => navigateWeek('next')}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          onPress={() => setViewMode(viewMode === 'week' ? 'day' : 'week')}
        >
          <Ionicons 
            name={viewMode === 'week' ? 'calendar' : 'grid'} 
            size={24} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeToggle}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'week' && styles.activeViewMode,
          ]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[
            styles.viewModeText,
            viewMode === 'week' && styles.activeViewModeText,
          ]}>
            {t('weekView')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'day' && styles.activeViewMode,
          ]}
          onPress={() => setViewMode('day')}
        >
          <Text style={[
            styles.viewModeText,
            viewMode === 'day' && styles.activeViewModeText,
          ]}>
            {t('dayView')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'week' ? renderWeekView() : renderDayView()}

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { type: 'available', label: t('available') },
          { type: 'booked', label: t('booked') },
          { type: 'break', label: t('break') },
          { type: 'prayer', label: t('prayer') },
          { type: 'unavailable', label: t('unavailable') },
        ].map(item => (
          <View key={item.type} style={styles.legendItem}>
            <View 
              style={[
                styles.legendColor, 
                { backgroundColor: getSlotTypeColor(item.type as TimeSlot['type']) }
              ]} 
            />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowBreakManager(true)}
        >
          <Ionicons name="cafe" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowFridayPrayer(true)}
        >
          <Ionicons name="moon" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowTemplates(true)}
        >
          <Ionicons name="copy" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.fab, styles.mainFab]}
          onPress={() => setTimeSelectorVisible(true)}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Time Selector Modal */}
      <TouchTimeSelector
        visible={timeSelectorVisible}
        onClose={() => setTimeSelectorVisible(false)}
        onTimeSelect={(time) => {
          // Handle time selection
          console.log('Selected time:', time);
        }}
        title={t('setAvailability')}
        allowPrayerTimes={true}
        showPresets={true}
      />

      {/* Schedule Templates Modal */}
      <ScheduleTemplatesModal
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onApplyTemplate={(template) => {
          console.log('Applied template:', template);
          setShowTemplates(false);
          loadWeeklySchedule(); // Reload schedule after applying template
        }}
      />

      {/* Friday Prayer Manager */}
      <FridayPrayerManager
        visible={showFridayPrayer}
        onClose={() => setShowFridayPrayer(false)}
        onSave={(prayerSettings) => {
          console.log('Friday prayer settings:', prayerSettings);
          setShowFridayPrayer(false);
          loadWeeklySchedule(); // Reload schedule after updating prayer settings
        }}
      />

      {/* Break Time Manager */}
      <BreakTimeManager
        visible={showBreakManager}
        onClose={() => setShowBreakManager(false)}
        selectedDate={selectedDay || new Date()}
        onBreakAdded={(breakTime) => {
          console.log('Break added:', breakTime);
          setShowBreakManager(false);
          loadWeeklySchedule(); // Reload schedule after adding break
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeViewMode: {
    borderBottomColor: colors.primary,
  },
  viewModeText: {
    fontSize: 16,
    color: colors.gray,
  },
  activeViewModeText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  weekContainer: {
    flex: 1,
  },
  weekGrid: {
    flexDirection: 'row',
    minWidth: width + 100, // Allow horizontal scrolling
  },
  timeLabelsColumn: {
    width: 60,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  timeLabelsHeader: {
    height: 80,
    backgroundColor: colors.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeLabels: {
    flex: 1,
  },
  timeLabelContainer: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
  },
  dayColumn: {
    flex: 1,
    minWidth: 80,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  dayHeader: {
    height: 80,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currentDayHeader: {
    backgroundColor: colors.lightPrimary,
  },
  dayName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  dayDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  currentDayText: {
    color: colors.primary,
  },
  daySlots: {
    flex: 1,
  },
  timeSlot: {
    height: 15, // 15 minutes = 15px height
    borderBottomWidth: 0.5,
    borderBottomColor: colors.lightGray,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  slotText: {
    fontSize: 10,
    color: colors.white,
    textAlign: 'center',
  },
  dayContainer: {
    flex: 1,
  },
  dayViewGrid: {
    flexDirection: 'row',
    minHeight: height - 200,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
    color: colors.text,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  mainFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});