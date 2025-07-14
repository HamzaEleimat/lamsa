import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  Platform,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useNavigation } from '@react-navigation/native';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';
import TouchTimeSelector from '../../components/availability/TouchTimeSelector';

interface ExceptionDate {
  id: string;
  date: string; // YYYY-MM-DD format
  type: 'holiday' | 'vacation' | 'sick' | 'modified_hours' | 'special_event';
  title: string;
  title_ar: string;
  description?: string;
  description_ar?: string;
  isFullDay: boolean;
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  isRecurring: boolean;
  recurringType?: 'weekly' | 'monthly' | 'yearly';
  allowBookings: boolean;
  specialPricing?: number;
  color: string;
  isSystemHoliday: boolean;
  createdAt: string;
}

interface JordanHoliday {
  date: string;
  name: string;
  name_ar: string;
  type: 'national' | 'islamic' | 'christian';
  isFixed: boolean; // true for fixed dates, false for calculated dates
}

export default function ExceptionDatesScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [exceptionDates, setExceptionDates] = useState<ExceptionDate[]>([]);
  const [jordanHolidays, setJordanHolidays] = useState<JordanHoliday[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingException, setEditingException] = useState<ExceptionDate | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    type: 'vacation' as ExceptionDate['type'],
    isFullDay: true,
    startTime: '09:00',
    endTime: '18:00',
    isRecurring: false,
    recurringType: 'yearly' as ExceptionDate['recurringType'],
    allowBookings: false,
    specialPricing: 0,
  });

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    try {
      await Promise.all([
        loadExceptionDates(),
        loadJordanHolidays(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadExceptionDates = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/exception-dates?start=${startDate}&end=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setExceptionDates(data.exceptions || []);
      }
    } catch (error) {
      console.error('Error loading exception dates:', error);
    }
  };

  const loadJordanHolidays = async () => {
    // Jordan holidays for 2024 (in production, this would be fetched from API)
    const holidays: JordanHoliday[] = [
      {
        date: '2024-01-01',
        name: 'New Year\'s Day',
        name_ar: 'رأس السنة الميلادية',
        type: 'national',
        isFixed: true,
      },
      {
        date: '2024-01-06',
        name: 'Epiphany',
        name_ar: 'عيد الغطاس',
        type: 'christian',
        isFixed: true,
      },
      {
        date: '2024-04-10',
        name: 'Eid al-Fitr',
        name_ar: 'عيد الفطر',
        type: 'islamic',
        isFixed: false,
      },
      {
        date: '2024-05-01',
        name: 'Labour Day',
        name_ar: 'عيد العمال',
        type: 'national',
        isFixed: true,
      },
      {
        date: '2024-05-25',
        name: 'Independence Day',
        name_ar: 'عيد الاستقلال',
        type: 'national',
        isFixed: true,
      },
      {
        date: '2024-06-17',
        name: 'Eid al-Adha',
        name_ar: 'عيد الأضحى',
        type: 'islamic',
        isFixed: false,
      },
      {
        date: '2024-07-08',
        name: 'Islamic New Year',
        name_ar: 'رأس السنة الهجرية',
        type: 'islamic',
        isFixed: false,
      },
      {
        date: '2024-09-16',
        name: 'Prophet Muhammad\'s Birthday',
        name_ar: 'عيد المولد النبوي',
        type: 'islamic',
        isFixed: false,
      },
      {
        date: '2024-12-25',
        name: 'Christmas Day',
        name_ar: 'عيد الميلاد المجيد',
        type: 'christian',
        isFixed: true,
      },
    ];

    setJordanHolidays(holidays);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const navigateMonth = (direction: 'previous' | 'next') => {
    const newMonth = direction === 'next'
      ? addDays(currentMonth, 32)
      : addDays(currentMonth, -32);
    setCurrentMonth(startOfMonth(newMonth));
  };

  const getExceptionForDate = (date: Date): ExceptionDate | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return exceptionDates.find(ex => ex.date === dateStr) || null;
  };

  const getHolidayForDate = (date: Date): JordanHoliday | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return jordanHolidays.find(holiday => holiday.date === dateStr) || null;
  };

  const getDateTypeColor = (date: Date): string => {
    const exception = getExceptionForDate(date);
    const holiday = getHolidayForDate(date);

    if (exception) {
      switch (exception.type) {
        case 'vacation':
          return colors.primary;
        case 'sick':
          return colors.error;
        case 'modified_hours':
          return colors.warning;
        case 'special_event':
          return colors.secondary;
        default:
          return colors.gray;
      }
    }

    if (holiday) {
      switch (holiday.type) {
        case 'national':
          return colors.success;
        case 'islamic':
          return colors.secondary;
        case 'christian':
          return colors.primary;
        default:
          return colors.gray;
      }
    }

    return 'transparent';
  };

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
    const exception = getExceptionForDate(date);
    
    if (exception) {
      setEditingException(exception);
      setFormData({
        title: exception.title,
        title_ar: exception.title_ar,
        description: exception.description || '',
        description_ar: exception.description_ar || '',
        type: exception.type,
        isFullDay: exception.isFullDay,
        startTime: exception.startTime || '09:00',
        endTime: exception.endTime || '18:00',
        isRecurring: exception.isRecurring,
        recurringType: exception.recurringType || 'yearly',
        allowBookings: exception.allowBookings,
        specialPricing: exception.specialPricing || 0,
      });
    } else {
      setEditingException(null);
      setFormData({
        title: '',
        title_ar: '',
        description: '',
        description_ar: '',
        type: 'vacation',
        isFullDay: true,
        startTime: '09:00',
        endTime: '18:00',
        isRecurring: false,
        recurringType: 'yearly',
        allowBookings: false,
        specialPricing: 0,
      });
    }
    
    setModalVisible(true);
  };

  const handleSaveException = async () => {
    if (!selectedDate) return;

    // Validation
    if (!formData.title || !formData.title_ar) {
      Alert.alert(t('error'), t('titleRequired'));
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const exceptionData = {
        ...formData,
        date: format(selectedDate, 'yyyy-MM-dd'),
        color: getDateTypeColor(selectedDate),
        isSystemHoliday: false,
      };

      const url = editingException
        ? `${API_URL}/api/providers/${providerId}/exception-dates/${editingException.id}`
        : `${API_URL}/api/providers/${providerId}/exception-dates`;

      const method = editingException ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exceptionData),
      });

      if (response.ok) {
        Alert.alert(
          t('success'),
          editingException ? t('exceptionUpdated') : t('exceptionCreated')
        );
        setModalVisible(false);
        loadExceptionDates();
      } else {
        Alert.alert(t('error'), t('failedToSaveException'));
      }
    } catch (error) {
      console.error('Error saving exception:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    }
  };

  const handleDeleteException = async () => {
    if (!editingException) return;

    Alert.alert(
      t('confirmDelete'),
      t('deleteExceptionConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const providerId = await AsyncStorage.getItem('providerId');

              const response = await fetch(
                `${API_URL}/api/providers/${providerId}/exception-dates/${editingException.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert(t('success'), t('exceptionDeleted'));
                setModalVisible(false);
                loadExceptionDates();
              } else {
                Alert.alert(t('error'), t('failedToDeleteException'));
              }
            } catch (error) {
              console.error('Error deleting exception:', error);
              Alert.alert(t('error'), t('somethingWentWrong'));
            }
          },
        },
      ]
    );
  };

  const importHolidaysAsExceptions = async () => {
    Alert.alert(
      t('importHolidays'),
      t('importHolidaysConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('import'),
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const providerId = await AsyncStorage.getItem('providerId');

              const holidayExceptions = jordanHolidays.map(holiday => ({
                date: holiday.date,
                title: holiday.name,
                title_ar: holiday.name_ar,
                type: 'holiday',
                isFullDay: true,
                isRecurring: holiday.isFixed,
                recurringType: 'yearly',
                allowBookings: false,
                color: getDateTypeColor(parseISO(holiday.date)),
                isSystemHoliday: true,
              }));

              const response = await fetch(
                `${API_URL}/api/providers/${providerId}/exception-dates/bulk`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ exceptions: holidayExceptions }),
                }
              );

              if (response.ok) {
                Alert.alert(t('success'), t('holidaysImported'));
                loadExceptionDates();
              } else {
                Alert.alert(t('error'), t('failedToImportHolidays'));
              }
            } catch (error) {
              console.error('Error importing holidays:', error);
              Alert.alert(t('error'), t('somethingWentWrong'));
            }
          },
        },
      ]
    );
  };

  const renderCalendar = () => {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    const startPadding = startOfMonth(currentMonth).getDay();
    const paddingDays = Array(startPadding).fill(null);

    return (
      <View style={styles.calendar}>
        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.dayHeader}>
              {t(day.toLowerCase())}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {paddingDays.map((_, index) => (
            <View key={`padding-${index}`} style={styles.calendarDay} />
          ))}
          
          {daysInMonth.map(date => {
            const exception = getExceptionForDate(date);
            const holiday = getHolidayForDate(date);
            const hasEvent = exception || holiday;
            const dateColor = getDateTypeColor(date);

            return (
              <TouchableOpacity
                key={date.getTime()}
                style={[
                  styles.calendarDay,
                  isToday(date) && styles.todayCell,
                  !isSameMonth(date, currentMonth) && styles.otherMonthCell,
                ]}
                onPress={() => handleDatePress(date)}
              >
                <View style={[
                  styles.dateContainer,
                  hasEvent && { backgroundColor: dateColor },
                ]}>
                  <Text style={[
                    styles.dateText,
                    isToday(date) && styles.todayText,
                    hasEvent && styles.eventDateText,
                  ]}>
                    {format(date, 'd')}
                  </Text>
                </View>
                
                {hasEvent && (
                  <View style={styles.eventIndicator}>
                    <Text style={styles.eventText} numberOfLines={1}>
                      {exception ? 
                        (i18n.language === 'ar' ? exception.title_ar : exception.title) :
                        (i18n.language === 'ar' ? holiday!.name_ar : holiday!.name)
                      }
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderExceptionModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>
            {editingException ? t('editException') : t('addException')}
          </Text>
          
          {editingException && (
            <TouchableOpacity onPress={handleDeleteException}>
              <Ionicons name="trash" size={24} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Selected Date */}
          <View style={styles.selectedDateContainer}>
            <Text style={styles.selectedDateText}>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy', { locale })}
            </Text>
          </View>

          {/* Exception Type */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>{t('exceptionType')}</Text>
            <View style={styles.typeButtons}>
              {[
                { key: 'vacation', label: t('vacation'), icon: 'airplane' },
                { key: 'sick', label: t('sickLeave'), icon: 'medical' },
                { key: 'holiday', label: t('holiday'), icon: 'gift' },
                { key: 'modified_hours', label: t('modifiedHours'), icon: 'time' },
                { key: 'special_event', label: t('specialEvent'), icon: 'star' },
              ].map(type => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeButton,
                    formData.type === type.key && styles.selectedTypeButton,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type: type.key as any }))}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={formData.type === type.key ? colors.white : colors.primary}
                  />
                  <Text style={[
                    styles.typeButtonText,
                    formData.type === type.key && styles.selectedTypeButtonText,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Title */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>{t('title')}</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder={t('enterTitleEnglish')}
              placeholderTextColor={colors.gray}
            />
            <TextInput
              style={[styles.textInput, isRTL && styles.rtlText]}
              value={formData.title_ar}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title_ar: text }))}
              placeholder={t('enterTitleArabic')}
              placeholderTextColor={colors.gray}
            />
          </View>

          {/* Full Day Toggle */}
          <View style={styles.formSection}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('fullDay')}</Text>
              <Switch
                value={formData.isFullDay}
                onValueChange={(value) => setFormData(prev => ({ ...prev, isFullDay: value }))}
                trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                thumbColor={formData.isFullDay ? colors.primary : colors.gray}
              />
            </View>
          </View>

          {/* Time Range (if not full day) */}
          {!formData.isFullDay && (
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>{t('timeRange')}</Text>
              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setTimePickerVisible(true)}
                >
                  <Text style={styles.timeButtonText}>
                    {formData.startTime} - {formData.endTime}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Allow Bookings */}
          <View style={styles.formSection}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('allowBookings')}</Text>
              <Switch
                value={formData.allowBookings}
                onValueChange={(value) => setFormData(prev => ({ ...prev, allowBookings: value }))}
                trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                thumbColor={formData.allowBookings ? colors.primary : colors.gray}
              />
            </View>
          </View>

          {/* Recurring */}
          <View style={styles.formSection}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('recurring')}</Text>
              <Switch
                value={formData.isRecurring}
                onValueChange={(value) => setFormData(prev => ({ ...prev, isRecurring: value }))}
                trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                thumbColor={formData.isRecurring ? colors.primary : colors.gray}
              />
            </View>
          </View>
        </ScrollView>

        {/* Modal Footer */}
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveException}
          >
            <Text style={styles.saveButtonText}>
              {editingException ? t('update') : t('save')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Picker */}
      <TouchTimeSelector
        visible={timePickerVisible}
        onClose={() => setTimePickerVisible(false)}
        onTimeSelect={(time) => {
          const timeStr = format(time, 'HH:mm');
          setFormData(prev => ({ ...prev, startTime: timeStr }));
        }}
        title={t('selectTime')}
      />
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <TouchableOpacity onPress={() => navigateMonth('previous')}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {format(currentMonth, 'MMMM yyyy', { locale })}
          </Text>
          
          <TouchableOpacity onPress={() => navigateMonth('next')}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={importHolidaysAsExceptions}>
          <Ionicons name="download" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderCalendar()}

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>{t('legend')}</Text>
          <View style={styles.legendItems}>
            {[
              { type: 'vacation', color: colors.primary, label: t('vacation') },
              { type: 'sick', color: colors.error, label: t('sickLeave') },
              { type: 'holiday', color: colors.success, label: t('nationalHoliday') },
              { type: 'islamic', color: colors.secondary, label: t('islamicHoliday') },
              { type: 'modified', color: colors.warning, label: t('modifiedHours') },
            ].map(item => (
              <View key={item.type} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Exception Modal */}
      {renderExceptionModal()}
    </View>
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
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  calendar: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray,
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%', // 7 days per week
    aspectRatio: 1,
    padding: 4,
  },
  todayCell: {
    backgroundColor: colors.lightPrimary,
    borderRadius: 8,
  },
  otherMonthCell: {
    opacity: 0.3,
  },
  dateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    minHeight: 32,
  },
  dateText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  todayText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  eventDateText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
  },
  eventText: {
    fontSize: 8,
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  legend: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  selectedDateContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  formSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedTypeButton: {
    backgroundColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.primary,
  },
  selectedTypeButtonText: {
    color: colors.white,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  rtlText: {
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  modalFooter: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});