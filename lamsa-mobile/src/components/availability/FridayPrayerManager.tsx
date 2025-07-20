import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  I18nManager,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import {
  format,
  addMinutes,
  subMinutes,
  differenceInMinutes,
  getDay,
  startOfWeek,
  addDays,
  parseISO,
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';
import TouchTimeSelector from './TouchTimeSelector';

interface FridayPrayerSettings {
  enabled: boolean;
  startTime: string; // HH:mm format
  duration: number; // in minutes (typically 60-90 minutes)
  automaticScheduling: boolean;
  bufferBefore: number; // minutes before prayer
  bufferAfter: number; // minutes after prayer
  allowPartialBookings: boolean; // Allow bookings that end before prayer
  rescheduleConflicts: boolean; // Auto-reschedule conflicting appointments
  notifyCustomers: boolean; // Send notifications about Friday schedule
  alternativeOffering: {
    enabled: boolean;
    location: string; // e.g., "home service", "alternative location"
    location_ar: string;
  };
  seasonalAdjustments: {
    enabled: boolean;
    winterStartTime: string;
    summerStartTime: string;
  };
}

interface FridayPrayerManagerProps {
  visible: boolean;
  onClose: () => void;
  onSettingsUpdate: (settings: FridayPrayerSettings) => void;
  currentSettings?: FridayPrayerSettings;
  selectedDate?: Date;
}

interface ConflictingAppointment {
  id: string;
  startTime: Date;
  endTime: Date;
  customerName: string;
  serviceName: string;
  canReschedule: boolean;
  suggestedNewTime?: Date;
}

export default function FridayPrayerManager({
  visible,
  onClose,
  onSettingsUpdate,
  currentSettings,
  selectedDate = new Date(),
}: FridayPrayerManagerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;

  const [settings, setSettings] = useState<FridayPrayerSettings>(
    currentSettings || {
      enabled: true,
      startTime: '12:00',
      duration: 90,
      automaticScheduling: true,
      bufferBefore: 30,
      bufferAfter: 15,
      allowPartialBookings: true,
      rescheduleConflicts: true,
      notifyCustomers: true,
      alternativeOffering: {
        enabled: false,
        location: 'Home service available',
        location_ar: 'خدمة منزلية متاحة',
      },
      seasonalAdjustments: {
        enabled: true,
        winterStartTime: '12:00',
        summerStartTime: '12:30',
      },
    }
  );

  const [loading, setLoading] = useState(false);
  const [timeSelectorVisible, setTimeSelectorVisible] = useState(false);
  const [timeSelectorType, setTimeSelectorType] = useState<'start' | 'winter' | 'summer'>('start');
  const [conflictingAppointments, setConflictingAppointments] = useState<ConflictingAppointment[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);

  useEffect(() => {
    if (visible) {
      checkFridayConflicts();
    }
  }, [visible, settings]);

  const checkFridayConflicts = async () => {
    try {
      setLoading(true);
      
      // Get next Friday
      const today = new Date();
      const nextFriday = getNextFriday(today);
      
      // Calculate prayer time window
      const prayerStart = parseISO(`${format(nextFriday, 'yyyy-MM-dd')}T${settings.startTime}:00`);
      const prayerWithBuffer = {
        start: subMinutes(prayerStart, settings.bufferBefore),
        end: addMinutes(prayerStart, settings.duration + settings.bufferAfter),
      };

      // Check for conflicts with existing appointments
      const conflicts = await fetchConflictingAppointments(nextFriday, prayerWithBuffer);
      setConflictingAppointments(conflicts);
      
    } catch (error) {
      console.error('Error checking Friday conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextFriday = (date: Date): Date => {
    const friday = 5; // Friday is day 5 (0 = Sunday)
    const currentDay = getDay(date);
    const daysUntilFriday = (friday - currentDay + 7) % 7;
    return addDays(date, daysUntilFriday === 0 ? 7 : daysUntilFriday);
  };

  const fetchConflictingAppointments = async (
    friday: Date,
    prayerWindow: { start: Date; end: Date }
  ): Promise<ConflictingAppointment[]> => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/appointments?date=${format(friday, 'yyyy-MM-dd')}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const appointments = data.appointments || [];

      // Filter appointments that conflict with prayer time
      return appointments
        .filter((apt: any) => {
          const aptStart = parseISO(apt.startTime);
          const aptEnd = parseISO(apt.endTime);
          
          // Check if appointment overlaps with prayer window
          return (
            (aptStart >= prayerWindow.start && aptStart < prayerWindow.end) ||
            (aptEnd > prayerWindow.start && aptEnd <= prayerWindow.end) ||
            (aptStart < prayerWindow.start && aptEnd > prayerWindow.end)
          );
        })
        .map((apt: any) => ({
          id: apt.id,
          startTime: parseISO(apt.startTime),
          endTime: parseISO(apt.endTime),
          customerName: apt.customer?.name || 'Unknown',
          serviceName: apt.service?.name || 'Unknown Service',
          canReschedule: apt.status === 'confirmed' && !apt.isLocked,
          suggestedNewTime: addMinutes(parseISO(`${format(friday, 'yyyy-MM-dd')}T${settings.startTime}:00`), 
            settings.duration + settings.bufferAfter + 15),
        }));
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/friday-prayer-settings`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        }
      );

      if (response.ok) {
        onSettingsUpdate(settings);
        Alert.alert(t('success'), t('fridaySettingsSaved'));
        
        if (settings.enabled && conflictingAppointments.length > 0) {
          setShowConflicts(true);
        } else {
          onClose();
        }
      } else {
        Alert.alert(t('error'), t('failedToSaveSettings'));
      }
    } catch (error) {
      console.error('Error saving Friday settings:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleAppointment = async (appointment: ConflictingAppointment) => {
    if (!appointment.canReschedule) {
      Alert.alert(t('cannotReschedule'), t('appointmentLocked'));
      return;
    }

    Alert.alert(
      t('rescheduleAppointment'),
      t('rescheduleConfirmation', {
        customer: appointment.customerName,
        time: format(appointment.suggestedNewTime!, 'HH:mm'),
      }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('reschedule'),
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              
              const response = await fetch(
                `${API_URL}/api/appointments/${appointment.id}/reschedule`,
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    newStartTime: appointment.suggestedNewTime,
                    reason: 'Friday prayer accommodation',
                    notifyCustomer: settings.notifyCustomers,
                  }),
                }
              );

              if (response.ok) {
                Alert.alert(t('success'), t('appointmentRescheduled'));
                checkFridayConflicts();
              } else {
                Alert.alert(t('error'), t('failedToReschedule'));
              }
            } catch (error) {
              console.error('Error rescheduling appointment:', error);
              Alert.alert(t('error'), t('somethingWentWrong'));
            }
          },
        },
      ]
    );
  };

  const getCurrentPrayerTime = (): string => {
    if (!settings.seasonalAdjustments.enabled) {
      return settings.startTime;
    }

    const currentMonth = new Date().getMonth();
    const isSummer = currentMonth >= 3 && currentMonth <= 9; // April to October
    
    return isSummer ? settings.seasonalAdjustments.summerStartTime : settings.seasonalAdjustments.winterStartTime;
  };

  const getPrayerEndTime = (): string => {
    const startTime = parseISO(`2000-01-01T${getCurrentPrayerTime()}:00`);
    const endTime = addMinutes(startTime, settings.duration);
    return format(endTime, 'HH:mm');
  };

  const handleTimeSelect = (time: Date) => {
    const timeStr = format(time, 'HH:mm');
    
    setSettings(prev => {
      switch (timeSelectorType) {
        case 'start':
          return { ...prev, startTime: timeStr };
        case 'winter':
          return {
            ...prev,
            seasonalAdjustments: {
              ...prev.seasonalAdjustments,
              winterStartTime: timeStr,
            },
          };
        case 'summer':
          return {
            ...prev,
            seasonalAdjustments: {
              ...prev.seasonalAdjustments,
              summerStartTime: timeStr,
            },
          };
        default:
          return prev;
      }
    });
    
    setTimeSelectorVisible(false);
  };

  const renderConflictsModal = () => (
    <Modal
      visible={showConflicts}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowConflicts(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowConflicts(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('fridayConflicts')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.conflictsHeader}>
            <Ionicons name="warning" size={24} color={colors.warning} />
            <Text style={styles.conflictsTitle}>
              {conflictingAppointments.length} {t('conflictingAppointments')}
            </Text>
          </View>

          <Text style={styles.conflictsDescription}>
            {t('fridayConflictsDescription', {
              time: getCurrentPrayerTime(),
              duration: settings.duration,
            })}
          </Text>

          {conflictingAppointments.map(appointment => (
            <View key={appointment.id} style={styles.conflictItem}>
              <View style={styles.conflictHeader}>
                <Text style={styles.customerName}>{appointment.customerName}</Text>
                <Text style={styles.appointmentTime}>
                  {format(appointment.startTime, 'HH:mm')} - {format(appointment.endTime, 'HH:mm')}
                </Text>
              </View>
              
              <Text style={styles.serviceName}>{appointment.serviceName}</Text>
              
              {appointment.canReschedule ? (
                <TouchableOpacity
                  style={styles.rescheduleButton}
                  onPress={() => handleRescheduleAppointment(appointment)}
                >
                  <Ionicons name="time" size={16} color={colors.white} />
                  <Text style={styles.rescheduleText}>
                    {t('reschedule')} → {format(appointment.suggestedNewTime!, 'HH:mm')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={16} color={colors.error} />
                  <Text style={styles.lockedText}>{t('cannotReschedule')}</Text>
                </View>
              )}
            </View>
          ))}

          {settings.alternativeOffering.enabled && (
            <View style={styles.alternativeSection}>
              <Text style={styles.alternativeTitle}>{t('alternativeOffering')}</Text>
              <Text style={styles.alternativeDescription}>
                {i18n.language === 'ar' 
                  ? settings.alternativeOffering.location_ar 
                  : settings.alternativeOffering.location}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              setShowConflicts(false);
              onClose();
            }}
          >
            <Text style={styles.continueButtonText}>{t('continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('fridayPrayerManager')}</Text>
          <TouchableOpacity onPress={handleSaveSettings} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.saveText}>{t('save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Enable/Disable Friday Prayer Management */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="moon" size={24} color={colors.secondary} />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>{t('fridayPrayerScheduling')}</Text>
                  <Text style={styles.toggleDescription}>{t('automaticJumuahManagement')}</Text>
                </View>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
                trackColor={{ false: colors.lightGray, true: colors.lightSecondary }}
                thumbColor={settings.enabled ? colors.secondary : colors.gray}
              />
            </View>
          </View>

          {settings.enabled && (
            <>
              {/* Prayer Time Settings */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('prayerTimeSettings')}</Text>
                
                <TouchableOpacity
                  style={styles.timeSelector}
                  onPress={() => {
                    setTimeSelectorType('start');
                    setTimeSelectorVisible(true);
                  }}
                >
                  <Text style={styles.timeSelectorLabel}>{t('prayerStartTime')}</Text>
                  <View style={styles.timeSelectorValue}>
                    <Text style={styles.timeText}>{getCurrentPrayerTime()}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.gray} />
                  </View>
                </TouchableOpacity>

                <View style={styles.durationSelector}>
                  <Text style={styles.durationLabel}>{t('prayerDuration')}</Text>
                  <View style={styles.durationButtons}>
                    {[60, 75, 90, 120].map(duration => (
                      <TouchableOpacity
                        key={duration}
                        style={[
                          styles.durationButton,
                          settings.duration === duration && styles.selectedDuration,
                        ]}
                        onPress={() => setSettings(prev => ({ ...prev, duration }))}
                      >
                        <Text style={[
                          styles.durationButtonText,
                          settings.duration === duration && styles.selectedDurationText,
                        ]}>
                          {duration}min
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.timeInfo}>
                  <Text style={styles.timeInfoText}>
                    {t('prayerWindow')}: {getCurrentPrayerTime()} - {getPrayerEndTime()}
                  </Text>
                </View>
              </View>

              {/* Seasonal Adjustments */}
              <View style={styles.section}>
                <View style={styles.toggleRow}>
                  <Text style={styles.optionTitle}>{t('seasonalAdjustments')}</Text>
                  <Switch
                    value={settings.seasonalAdjustments.enabled}
                    onValueChange={(enabled) => 
                      setSettings(prev => ({
                        ...prev,
                        seasonalAdjustments: { ...prev.seasonalAdjustments, enabled },
                      }))
                    }
                    trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                    thumbColor={settings.seasonalAdjustments.enabled ? colors.primary : colors.gray}
                  />
                </View>

                {settings.seasonalAdjustments.enabled && (
                  <View style={styles.seasonalTimes}>
                    <TouchableOpacity
                      style={styles.seasonalTimeSelector}
                      onPress={() => {
                        setTimeSelectorType('winter');
                        setTimeSelectorVisible(true);
                      }}
                    >
                      <Text style={styles.seasonalLabel}>{t('winterTime')}</Text>
                      <Text style={styles.seasonalTime}>
                        {settings.seasonalAdjustments.winterStartTime}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.seasonalTimeSelector}
                      onPress={() => {
                        setTimeSelectorType('summer');
                        setTimeSelectorVisible(true);
                      }}
                    >
                      <Text style={styles.seasonalLabel}>{t('summerTime')}</Text>
                      <Text style={styles.seasonalTime}>
                        {settings.seasonalAdjustments.summerStartTime}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Buffer Settings */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('bufferSettings')}</Text>
                
                <View style={styles.bufferRow}>
                  <View style={styles.bufferItem}>
                    <Text style={styles.bufferLabel}>{t('beforePrayer')}</Text>
                    <View style={styles.bufferSelector}>
                      {[15, 30, 45, 60].map(minutes => (
                        <TouchableOpacity
                          key={minutes}
                          style={[
                            styles.bufferButton,
                            settings.bufferBefore === minutes && styles.selectedBuffer,
                          ]}
                          onPress={() => setSettings(prev => ({ ...prev, bufferBefore: minutes }))}
                        >
                          <Text style={[
                            styles.bufferButtonText,
                            settings.bufferBefore === minutes && styles.selectedBufferText,
                          ]}>
                            {minutes}min
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.bufferItem}>
                    <Text style={styles.bufferLabel}>{t('afterPrayer')}</Text>
                    <View style={styles.bufferSelector}>
                      {[10, 15, 30, 45].map(minutes => (
                        <TouchableOpacity
                          key={minutes}
                          style={[
                            styles.bufferButton,
                            settings.bufferAfter === minutes && styles.selectedBuffer,
                          ]}
                          onPress={() => setSettings(prev => ({ ...prev, bufferAfter: minutes }))}
                        >
                          <Text style={[
                            styles.bufferButtonText,
                            settings.bufferAfter === minutes && styles.selectedBufferText,
                          ]}>
                            {minutes}min
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Options */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('options')}</Text>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionTitle}>{t('allowPartialBookings')}</Text>
                  <Switch
                    value={settings.allowPartialBookings}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, allowPartialBookings: value }))}
                    trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                    thumbColor={settings.allowPartialBookings ? colors.primary : colors.gray}
                  />
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionTitle}>{t('autoRescheduleConflicts')}</Text>
                  <Switch
                    value={settings.rescheduleConflicts}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, rescheduleConflicts: value }))}
                    trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                    thumbColor={settings.rescheduleConflicts ? colors.primary : colors.gray}
                  />
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionTitle}>{t('notifyCustomers')}</Text>
                  <Switch
                    value={settings.notifyCustomers}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, notifyCustomers: value }))}
                    trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                    thumbColor={settings.notifyCustomers ? colors.primary : colors.gray}
                  />
                </View>
              </View>

              {/* Alternative Offering */}
              <View style={styles.section}>
                <View style={styles.toggleRow}>
                  <Text style={styles.optionTitle}>{t('alternativeOffering')}</Text>
                  <Switch
                    value={settings.alternativeOffering.enabled}
                    onValueChange={(enabled) => 
                      setSettings(prev => ({
                        ...prev,
                        alternativeOffering: { ...prev.alternativeOffering, enabled },
                      }))
                    }
                    trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                    thumbColor={settings.alternativeOffering.enabled ? colors.primary : colors.gray}
                  />
                </View>
                
                {settings.alternativeOffering.enabled && (
                  <Text style={styles.alternativeDescription}>
                    {t('alternativeOfferingDescription')}
                  </Text>
                )}
              </View>

              {/* Conflicts Summary */}
              {conflictingAppointments.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.conflictsSummary}>
                    <Ionicons name="warning" size={20} color={colors.warning} />
                    <Text style={styles.conflictsSummaryText}>
                      {conflictingAppointments.length} {t('upcomingConflicts')}
                    </Text>
                    <TouchableOpacity onPress={() => setShowConflicts(true)}>
                      <Text style={styles.viewConflictsText}>{t('view')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <TouchTimeSelector
          visible={timeSelectorVisible}
          onClose={() => setTimeSelectorVisible(false)}
          onTimeSelect={handleTimeSelect}
          title={t('selectPrayerTime')}
          allowPrayerTimes={true}
        />

        {renderConflictsModal()}
      </View>
    </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  saveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  toggleDescription: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeSelectorLabel: {
    fontSize: 16,
    color: colors.text,
  },
  timeSelectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  durationSelector: {
    marginTop: 16,
  },
  durationLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  selectedDuration: {
    backgroundColor: colors.primary,
  },
  durationButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  selectedDurationText: {
    color: colors.white,
  },
  timeInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: colors.lightSecondary,
    borderRadius: 8,
  },
  timeInfoText: {
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'center',
  },
  seasonalTimes: {
    marginTop: 12,
    gap: 8,
  },
  seasonalTimeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  seasonalLabel: {
    fontSize: 14,
    color: colors.text,
  },
  seasonalTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bufferRow: {
    gap: 16,
  },
  bufferItem: {
    marginBottom: 16,
  },
  bufferLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  bufferSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  bufferButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  selectedBuffer: {
    backgroundColor: colors.primary,
  },
  bufferButtonText: {
    fontSize: 12,
    color: colors.primary,
  },
  selectedBufferText: {
    color: colors.white,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionTitle: {
    fontSize: 16,
    color: colors.text,
  },
  alternativeDescription: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 8,
  },
  conflictsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lightWarning,
    padding: 12,
    borderRadius: 8,
  },
  conflictsSummaryText: {
    fontSize: 14,
    color: colors.warning,
    flex: 1,
  },
  viewConflictsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.warning,
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
  conflictsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  conflictsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  conflictsDescription: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 20,
    lineHeight: 20,
  },
  conflictItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  appointmentTime: {
    fontSize: 14,
    color: colors.gray,
  },
  serviceName: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 12,
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rescheduleText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '500',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lightError,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  lockedText: {
    fontSize: 12,
    color: colors.error,
  },
  alternativeSection: {
    backgroundColor: colors.lightPrimary,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  alternativeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});