import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays, startOfWeek, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AvailabilitySettings,
  DaySchedule,
  PrayerTimes,
  TimeOff,
  DAYS_OF_WEEK,
} from '../../types/availability.types';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';

export default function AvailabilityDashboardScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isArabic = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<AvailabilitySettings | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [todayPrayerTimes, setTodayPrayerTimes] = useState<PrayerTimes | null>(null);
  const [upcomingTimeOff, setUpcomingTimeOff] = useState<TimeOff[]>([]);
  const [quickSettings, setQuickSettings] = useState({
    acceptingBookings: true,
    instantBooking: false,
    prayerBreaks: true,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const providerId = await AsyncStorage.getItem('providerId');
      const token = await AsyncStorage.getItem('authToken');

      if (!providerId || !token) {
        throw new Error('Provider ID or token not found');
      }

      // Fetch all data in parallel
      const [settingsRes, scheduleRes, prayerRes] = await Promise.all([
        fetch(`${API_URL}/api/providers/${providerId}/availability/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/providers/${providerId}/availability/weekly-schedule`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/providers/${providerId}/availability/prayer-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.data);
        setQuickSettings({
          acceptingBookings: true, // This would come from provider active status
          instantBooking: settingsData.data.allow_instant_booking,
          prayerBreaks: settingsData.data.enable_prayer_breaks,
        });
      }

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        setWeeklySchedule(scheduleData.data.weeklySchedule || []);
      }

      if (prayerRes.ok) {
        const prayerData = await prayerRes.json();
        setTodayPrayerTimes(prayerData.data.todayPrayerTimes);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert(t('error'), t('failedToLoadData'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const toggleQuickSetting = async (setting: keyof typeof quickSettings) => {
    const newValue = !quickSettings[setting];
    setQuickSettings(prev => ({ ...prev, [setting]: newValue }));

    try {
      const providerId = await AsyncStorage.getItem('providerId');
      const token = await AsyncStorage.getItem('authToken');

      let endpoint = '';
      let body = {};

      switch (setting) {
        case 'instantBooking':
          endpoint = `/api/providers/${providerId}/availability/settings`;
          body = { allow_instant_booking: newValue };
          break;
        case 'prayerBreaks':
          endpoint = `/api/providers/${providerId}/availability/prayer-settings`;
          body = { enable_prayer_breaks: newValue };
          break;
        case 'acceptingBookings':
          // This would update provider active status
          endpoint = `/api/providers/${providerId}`;
          body = { active: newValue };
          break;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to update setting');
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert the change
      setQuickSettings(prev => ({ ...prev, [setting]: !newValue }));
      Alert.alert(t('error'), t('failedToUpdateSetting'));
    }
  };

  const getTodaySchedule = (): DaySchedule | null => {
    const today = new Date().getDay();
    return weeklySchedule.find(day => day.dayOfWeek === today) || null;
  };

  const renderTodayOverview = () => {
    const todaySchedule = getTodaySchedule();
    
    if (!todaySchedule || todaySchedule.shifts.length === 0) {
      return (
        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>{t('todaySchedule')}</Text>
          <Text style={styles.noScheduleText}>{t('noScheduleToday')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.todayCard}>
        <Text style={styles.todayTitle}>{t('todaySchedule')}</Text>
        
        {todaySchedule.shifts.map((shift, index) => (
          <View key={index} style={styles.shiftInfo}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.shiftText}>
              {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
              {shift.shift_type === 'women_only' && ` (${t('womenOnly')})`}
            </Text>
          </View>
        ))}

        {todaySchedule.breaks.length > 0 && (
          <View style={styles.breaksContainer}>
            <Text style={styles.breaksTitle}>{t('breaks')}:</Text>
            {todaySchedule.breaks.map((breakItem, index) => (
              <Text key={index} style={styles.breakText}>
                • {breakItem.break_name || t(breakItem.break_type)} 
                {breakItem.start_time && ` (${breakItem.start_time.substring(0, 5)} - ${breakItem.end_time?.substring(0, 5)})`}
              </Text>
            ))}
          </View>
        )}

        {todaySchedule.timeOff.length > 0 && (
          <View style={styles.timeOffAlert}>
            <Ionicons name="alert-circle" size={20} color={colors.warning} />
            <Text style={styles.timeOffText}>{t('timeOffScheduled')}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderQuickSettings = () => (
    <View style={styles.quickSettingsCard}>
      <Text style={styles.sectionTitle}>{t('quickSettings')}</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <Text style={styles.settingLabel}>{t('acceptingBookings')}</Text>
        </View>
        <Switch
          value={quickSettings.acceptingBookings}
          onValueChange={() => toggleQuickSetting('acceptingBookings')}
          trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
          thumbColor={quickSettings.acceptingBookings ? colors.primary : colors.gray}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="flash-outline" size={24} color={colors.warning} />
          <Text style={styles.settingLabel}>{t('instantBooking')}</Text>
        </View>
        <Switch
          value={quickSettings.instantBooking}
          onValueChange={() => toggleQuickSetting('instantBooking')}
          trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
          thumbColor={quickSettings.instantBooking ? colors.primary : colors.gray}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="moon-outline" size={24} color={colors.secondary} />
          <Text style={styles.settingLabel}>{t('prayerBreaks')}</Text>
        </View>
        <Switch
          value={quickSettings.prayerBreaks}
          onValueChange={() => toggleQuickSetting('prayerBreaks')}
          trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
          thumbColor={quickSettings.prayerBreaks ? colors.primary : colors.gray}
        />
      </View>
    </View>
  );

  const renderPrayerTimes = () => {
    if (!todayPrayerTimes || !quickSettings.prayerBreaks) {
      return null;
    }

    return (
      <View style={styles.prayerTimesCard}>
        <View style={styles.prayerHeader}>
          <Text style={styles.sectionTitle}>{t('todayPrayerTimes')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PrayerSettings')}>
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.prayerTimesGrid}>
          {['dhuhr', 'asr', 'maghrib'].map(prayer => (
            <View key={prayer} style={styles.prayerTimeItem}>
              <Text style={styles.prayerName}>{t(prayer)}</Text>
              <Text style={styles.prayerTime}>
                {todayPrayerTimes[prayer as keyof PrayerTimes]?.substring(0, 5)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderWeekOverview = () => (
    <View style={styles.weekOverviewCard}>
      <View style={styles.weekHeader}>
        <Text style={styles.sectionTitle}>{t('weekOverview')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ScheduleEditor')}>
          <Text style={styles.editLink}>{t('edit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.weekDays}>
          {weeklySchedule.map((day, index) => {
            const dayName = isArabic ? DAYS_OF_WEEK[day.dayOfWeek].label_ar : DAYS_OF_WEEK[day.dayOfWeek].label_en;
            const hasSchedule = day.shifts.length > 0;
            const isCurrentDay = isToday(new Date(day.date));

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCard,
                  isCurrentDay && styles.currentDayCard,
                  !hasSchedule && styles.offDayCard,
                ]}
                onPress={() => navigation.navigate('DaySchedule', { date: day.date })}
              >
                <Text style={[styles.dayName, isCurrentDay && styles.currentDayText]}>
                  {dayName}
                </Text>
                <Text style={[styles.dayDate, isCurrentDay && styles.currentDayText]}>
                  {format(new Date(day.date), 'd', { locale: isArabic ? ar : undefined })}
                </Text>
                {hasSchedule ? (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={isCurrentDay ? colors.white : colors.success} 
                  />
                ) : (
                  <Ionicons 
                    name="close-circle" 
                    size={20} 
                    color={isCurrentDay ? colors.white : colors.gray} 
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsCard}>
      <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
      
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ScheduleEditor')}
        >
          <Ionicons name="calendar" size={28} color={colors.primary} />
          <Text style={styles.actionText}>{t('editSchedule')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('TimeOffManager')}
        >
          <Ionicons name="airplane" size={28} color={colors.warning} />
          <Text style={styles.actionText}>{t('manageTimeOff')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('RamadanSchedule')}
        >
          <Ionicons name="moon" size={28} color={colors.secondary} />
          <Text style={styles.actionText}>{t('ramadanSchedule')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AvailabilitySettings')}
        >
          <Ionicons name="settings" size={28} color={colors.gray} />
          <Text style={styles.actionText}>{t('settings')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {renderTodayOverview()}
      {renderQuickSettings()}
      {renderPrayerTimes()}
      {renderWeekOverview()}
      {renderQuickActions()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayCard: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  todayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  noScheduleText: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    paddingVertical: 20,
  },
  shiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  shiftText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
  },
  breaksContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breaksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  breakText: {
    fontSize: 14,
    color: colors.gray,
    marginLeft: 16,
    marginVertical: 2,
  },
  timeOffAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  timeOffText: {
    fontSize: 14,
    color: colors.warning,
    marginLeft: 8,
  },
  quickSettingsCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  prayerTimesCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  prayerTimesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  prayerTimeItem: {
    alignItems: 'center',
  },
  prayerName: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },
  prayerTime: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  weekOverviewCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
    gap: 8,
  },
  dayCard: {
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  currentDayCard: {
    backgroundColor: colors.primary,
  },
  offDayCard: {
    opacity: 0.6,
  },
  dayName: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  currentDayText: {
    color: colors.white,
  },
  quickActionsCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: colors.lightGray,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
});