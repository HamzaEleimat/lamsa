import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useNavigation } from '@react-navigation/native';
import {
  format,
  differenceInMinutes,
  parseISO,
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';
import TouchTimeSelector from '../../components/availability/TouchTimeSelector';

interface RamadanSchedule {
  enabled: boolean;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  workingHours: {
    morning: {
      enabled: boolean;
      startTime: string; // HH:mm format
      endTime: string;
    };
    evening: {
      enabled: boolean;
      startTime: string; // HH:mm format (after iftar)
      endTime: string;
    };
  };
  breaks: {
    suhoorBreak: {
      enabled: boolean;
      duration: number; // minutes
    };
    iftarBreak: {
      enabled: boolean;
      startTime: string; // Dynamic based on sunset
      duration: number; // minutes
    };
    tarawihBreak: {
      enabled: boolean;
      startTime: string;
      duration: number;
    };
  };
  serviceAdjustments: {
    reducedServiceDuration: boolean;
    percentage: number; // e.g., 80% of normal duration
    avoidIntenseServices: boolean;
    priorityForRegulars: boolean;
  };
  customerPreferences: {
    allowBookingsDuringIftar: boolean;
    sendRamadanGreetings: boolean;
    offerSpecialPackages: boolean;
  };
  staffConsiderations: {
    flexibleBreaks: boolean;
    energyManagement: boolean;
    rotatingSchedules: boolean;
  };
}

interface PrayerTime {
  name: string;
  time: string;
  isDynamic: boolean; // True for times that change daily (like maghrib)
}

export default function RamadanScheduleScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const locale = i18n.language === 'ar' ? ar : enUS;

  const [schedule, setSchedule] = useState<RamadanSchedule>({
    enabled: false,
    startDate: '',
    endDate: '',
    workingHours: {
      morning: {
        enabled: true,
        startTime: '10:00',
        endTime: '15:00',
      },
      evening: {
        enabled: true,
        startTime: '20:00',
        endTime: '23:00',
      },
    },
    breaks: {
      suhoorBreak: {
        enabled: false,
        duration: 30,
      },
      iftarBreak: {
        enabled: true,
        startTime: '18:30', // Dynamic
        duration: 60,
      },
      tarawihBreak: {
        enabled: true,
        startTime: '21:00',
        duration: 45,
      },
    },
    serviceAdjustments: {
      reducedServiceDuration: true,
      percentage: 80,
      avoidIntenseServices: true,
      priorityForRegulars: true,
    },
    customerPreferences: {
      allowBookingsDuringIftar: false,
      sendRamadanGreetings: true,
      offerSpecialPackages: true,
    },
    staffConsiderations: {
      flexibleBreaks: true,
      energyManagement: true,
      rotatingSchedules: false,
    },
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeSelectorVisible, setTimeSelectorVisible] = useState(false);
  const [timeSelectorType, setTimeSelectorType] = useState<string>('');
  const [ramadanDates, setRamadanDates] = useState({ start: '', end: '' });
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);

  useEffect(() => {
    loadRamadanSchedule();
    loadRamadanDates();
    loadPrayerTimes();
  }, []);

  const loadRamadanSchedule = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/ramadan-schedule`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.schedule) {
          setSchedule(data.schedule);
        }
      }
    } catch (error) {
      console.error('Error loading Ramadan schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRamadanDates = async () => {
    // In production, this would fetch from an Islamic calendar API
    // For now, using approximate dates for Ramadan 2024
    setRamadanDates({
      start: '2024-03-11',
      end: '2024-04-09',
    });
  };

  const loadPrayerTimes = async () => {
    // In production, this would fetch daily prayer times based on location
    const times: PrayerTime[] = [
      { name: 'Fajr', time: '04:30', isDynamic: true },
      { name: 'Sunrise', time: '05:50', isDynamic: true },
      { name: 'Dhuhr', time: '12:30', isDynamic: false },
      { name: 'Asr', time: '15:45', isDynamic: true },
      { name: 'Maghrib', time: '18:30', isDynamic: true },
      { name: 'Isha', time: '20:00', isDynamic: true },
    ];
    setPrayerTimes(times);
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/ramadan-schedule`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(schedule),
        }
      );

      if (response.ok) {
        Alert.alert(t('success'), t('ramadanScheduleSaved'));
        navigation.goBack();
      } else {
        Alert.alert(t('error'), t('failedToSaveSchedule'));
      }
    } catch (error) {
      console.error('Error saving Ramadan schedule:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  };

  const handleTimeSelect = (time: Date) => {
    const timeStr = format(time, 'HH:mm');
    
    setSchedule(prev => {
      const [section, period, field] = timeSelectorType.split('.');
      
      if (section === 'workingHours') {
        return {
          ...prev,
          workingHours: {
            ...prev.workingHours,
            [period]: {
              ...prev.workingHours[period as keyof typeof prev.workingHours],
              [field]: timeStr,
            },
          },
        };
      } else if (section === 'breaks') {
        return {
          ...prev,
          breaks: {
            ...prev.breaks,
            [period]: {
              ...prev.breaks[period as keyof typeof prev.breaks],
              startTime: timeStr,
            },
          },
        };
      }
      
      return prev;
    });
    
    setTimeSelectorVisible(false);
  };

  const calculateWorkingHours = () => {
    const morningMinutes = schedule.workingHours.morning.enabled
      ? differenceInMinutes(
          parseISO(`2000-01-01T${schedule.workingHours.morning.endTime}:00`),
          parseISO(`2000-01-01T${schedule.workingHours.morning.startTime}:00`)
        )
      : 0;

    const eveningMinutes = schedule.workingHours.evening.enabled
      ? differenceInMinutes(
          parseISO(`2000-01-01T${schedule.workingHours.evening.endTime}:00`),
          parseISO(`2000-01-01T${schedule.workingHours.evening.startTime}:00`)
        )
      : 0;

    const totalMinutes = morningMinutes + eveningMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}min`;
  };

  const renderWorkingHoursSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('workingHours')}</Text>
      
      {/* Morning Session */}
      <View style={styles.sessionContainer}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Ionicons name="sunny" size={20} color={colors.warning} />
            <Text style={styles.sessionTitle}>{t('morningSession')}</Text>
          </View>
          <Switch
            value={schedule.workingHours.morning.enabled}
            onValueChange={(enabled) =>
              setSchedule(prev => ({
                ...prev,
                workingHours: {
                  ...prev.workingHours,
                  morning: { ...prev.workingHours.morning, enabled },
                },
              }))
            }
            trackColor={{ false: colors.lightGray, true: colors.lightWarning }}
            thumbColor={schedule.workingHours.morning.enabled ? colors.warning : colors.gray}
          />
        </View>

        {schedule.workingHours.morning.enabled && (
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                setTimeSelectorType('workingHours.morning.startTime');
                setTimeSelectorVisible(true);
              }}
            >
              <Text style={styles.timeLabel}>{t('start')}</Text>
              <Text style={styles.timeValue}>{schedule.workingHours.morning.startTime}</Text>
            </TouchableOpacity>

            <Text style={styles.timeSeparator}>-</Text>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                setTimeSelectorType('workingHours.morning.endTime');
                setTimeSelectorVisible(true);
              }}
            >
              <Text style={styles.timeLabel}>{t('end')}</Text>
              <Text style={styles.timeValue}>{schedule.workingHours.morning.endTime}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Evening Session */}
      <View style={styles.sessionContainer}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Ionicons name="moon" size={20} color={colors.secondary} />
            <Text style={styles.sessionTitle}>{t('eveningSession')}</Text>
            <Text style={styles.sessionSubtitle}>{t('afterIftar')}</Text>
          </View>
          <Switch
            value={schedule.workingHours.evening.enabled}
            onValueChange={(enabled) =>
              setSchedule(prev => ({
                ...prev,
                workingHours: {
                  ...prev.workingHours,
                  evening: { ...prev.workingHours.evening, enabled },
                },
              }))
            }
            trackColor={{ false: colors.lightGray, true: colors.lightSecondary }}
            thumbColor={schedule.workingHours.evening.enabled ? colors.secondary : colors.gray}
          />
        </View>

        {schedule.workingHours.evening.enabled && (
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                setTimeSelectorType('workingHours.evening.startTime');
                setTimeSelectorVisible(true);
              }}
            >
              <Text style={styles.timeLabel}>{t('start')}</Text>
              <Text style={styles.timeValue}>{schedule.workingHours.evening.startTime}</Text>
            </TouchableOpacity>

            <Text style={styles.timeSeparator}>-</Text>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                setTimeSelectorType('workingHours.evening.endTime');
                setTimeSelectorVisible(true);
              }}
            >
              <Text style={styles.timeLabel}>{t('end')}</Text>
              <Text style={styles.timeValue}>{schedule.workingHours.evening.endTime}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.totalHours}>
        <Text style={styles.totalHoursLabel}>{t('totalWorkingHours')}</Text>
        <Text style={styles.totalHoursValue}>{calculateWorkingHours()}</Text>
      </View>
    </View>
  );

  const renderBreaksSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('ramadanBreaks')}</Text>

      {/* Iftar Break */}
      <View style={styles.breakItem}>
        <View style={styles.breakHeader}>
          <View style={styles.breakInfo}>
            <Ionicons name="restaurant" size={20} color={colors.primary} />
            <View>
              <Text style={styles.breakTitle}>{t('iftarBreak')}</Text>
              <Text style={styles.breakSubtitle}>
                {t('maghribTime')}: ~{prayerTimes.find(p => p.name === 'Maghrib')?.time}
              </Text>
            </View>
          </View>
          <Switch
            value={schedule.breaks.iftarBreak.enabled}
            onValueChange={(enabled) =>
              setSchedule(prev => ({
                ...prev,
                breaks: {
                  ...prev.breaks,
                  iftarBreak: { ...prev.breaks.iftarBreak, enabled },
                },
              }))
            }
            trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
            thumbColor={schedule.breaks.iftarBreak.enabled ? colors.primary : colors.gray}
          />
        </View>

        {schedule.breaks.iftarBreak.enabled && (
          <View style={styles.breakDuration}>
            <Text style={styles.durationLabel}>{t('duration')}</Text>
            <View style={styles.durationButtons}>
              {[30, 45, 60, 90].map(duration => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.durationButton,
                    schedule.breaks.iftarBreak.duration === duration && styles.selectedDuration,
                  ]}
                  onPress={() =>
                    setSchedule(prev => ({
                      ...prev,
                      breaks: {
                        ...prev.breaks,
                        iftarBreak: { ...prev.breaks.iftarBreak, duration },
                      },
                    }))
                  }
                >
                  <Text style={[
                    styles.durationText,
                    schedule.breaks.iftarBreak.duration === duration && styles.selectedDurationText,
                  ]}>
                    {duration}min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Tarawih Break */}
      <View style={styles.breakItem}>
        <View style={styles.breakHeader}>
          <View style={styles.breakInfo}>
            <Ionicons name="moon" size={20} color={colors.secondary} />
            <View>
              <Text style={styles.breakTitle}>{t('tarawihBreak')}</Text>
              <Text style={styles.breakSubtitle}>{t('nightPrayer')}</Text>
            </View>
          </View>
          <Switch
            value={schedule.breaks.tarawihBreak.enabled}
            onValueChange={(enabled) =>
              setSchedule(prev => ({
                ...prev,
                breaks: {
                  ...prev.breaks,
                  tarawihBreak: { ...prev.breaks.tarawihBreak, enabled },
                },
              }))
            }
            trackColor={{ false: colors.lightGray, true: colors.lightSecondary }}
            thumbColor={schedule.breaks.tarawihBreak.enabled ? colors.secondary : colors.gray}
          />
        </View>

        {schedule.breaks.tarawihBreak.enabled && (
          <>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={() => {
                setTimeSelectorType('breaks.tarawihBreak.startTime');
                setTimeSelectorVisible(true);
              }}
            >
              <Text style={styles.timeSelectorLabel}>{t('startTime')}</Text>
              <View style={styles.timeSelectorValue}>
                <Text style={styles.timeText}>{schedule.breaks.tarawihBreak.startTime}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.gray} />
              </View>
            </TouchableOpacity>

            <View style={styles.breakDuration}>
              <Text style={styles.durationLabel}>{t('duration')}</Text>
              <View style={styles.durationButtons}>
                {[30, 45, 60, 75].map(duration => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton,
                      schedule.breaks.tarawihBreak.duration === duration && styles.selectedDuration,
                    ]}
                    onPress={() =>
                      setSchedule(prev => ({
                        ...prev,
                        breaks: {
                          ...prev.breaks,
                          tarawihBreak: { ...prev.breaks.tarawihBreak, duration },
                        },
                      }))
                    }
                  >
                    <Text style={[
                      styles.durationText,
                      schedule.breaks.tarawihBreak.duration === duration && styles.selectedDurationText,
                    ]}>
                      {duration}min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderServiceAdjustments = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('serviceAdjustments')}</Text>

      <View style={styles.adjustmentItem}>
        <View style={styles.adjustmentHeader}>
          <Text style={styles.adjustmentTitle}>{t('reducedServiceDuration')}</Text>
          <Switch
            value={schedule.serviceAdjustments.reducedServiceDuration}
            onValueChange={(value) =>
              setSchedule(prev => ({
                ...prev,
                serviceAdjustments: {
                  ...prev.serviceAdjustments,
                  reducedServiceDuration: value,
                },
              }))
            }
            trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
            thumbColor={schedule.serviceAdjustments.reducedServiceDuration ? colors.primary : colors.gray}
          />
        </View>

        {schedule.serviceAdjustments.reducedServiceDuration && (
          <View style={styles.percentageSelector}>
            <Text style={styles.percentageLabel}>{t('serviceDurationPercentage')}</Text>
            <View style={styles.percentageButtons}>
              {[70, 80, 90, 100].map(percentage => (
                <TouchableOpacity
                  key={percentage}
                  style={[
                    styles.percentageButton,
                    schedule.serviceAdjustments.percentage === percentage && styles.selectedPercentage,
                  ]}
                  onPress={() =>
                    setSchedule(prev => ({
                      ...prev,
                      serviceAdjustments: {
                        ...prev.serviceAdjustments,
                        percentage,
                      },
                    }))
                  }
                >
                  <Text style={[
                    styles.percentageText,
                    schedule.serviceAdjustments.percentage === percentage && styles.selectedPercentageText,
                  ]}>
                    {percentage}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.adjustmentDescription}>
              {t('reducedDurationExample', { percentage: schedule.serviceAdjustments.percentage })}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionTitle}>{t('avoidIntenseServices')}</Text>
        <Switch
          value={schedule.serviceAdjustments.avoidIntenseServices}
          onValueChange={(value) =>
            setSchedule(prev => ({
              ...prev,
              serviceAdjustments: {
                ...prev.serviceAdjustments,
                avoidIntenseServices: value,
              },
            }))
          }
          trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
          thumbColor={schedule.serviceAdjustments.avoidIntenseServices ? colors.primary : colors.gray}
        />
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionTitle}>{t('priorityForRegulars')}</Text>
        <Switch
          value={schedule.serviceAdjustments.priorityForRegulars}
          onValueChange={(value) =>
            setSchedule(prev => ({
              ...prev,
              serviceAdjustments: {
                ...prev.serviceAdjustments,
                priorityForRegulars: value,
              },
            }))
          }
          trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
          thumbColor={schedule.serviceAdjustments.priorityForRegulars ? colors.primary : colors.gray}
        />
      </View>
    </View>
  );

  const renderCustomerPreferences = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('customerPreferences')}</Text>

      <View style={styles.optionRow}>
        <Text style={styles.optionTitle}>{t('allowBookingsDuringIftar')}</Text>
        <Switch
          value={schedule.customerPreferences.allowBookingsDuringIftar}
          onValueChange={(value) =>
            setSchedule(prev => ({
              ...prev,
              customerPreferences: {
                ...prev.customerPreferences,
                allowBookingsDuringIftar: value,
              },
            }))
          }
          trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
          thumbColor={schedule.customerPreferences.allowBookingsDuringIftar ? colors.primary : colors.gray}
        />
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionTitle}>{t('sendRamadanGreetings')}</Text>
        <Switch
          value={schedule.customerPreferences.sendRamadanGreetings}
          onValueChange={(value) =>
            setSchedule(prev => ({
              ...prev,
              customerPreferences: {
                ...prev.customerPreferences,
                sendRamadanGreetings: value,
              },
            }))
          }
          trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
          thumbColor={schedule.customerPreferences.sendRamadanGreetings ? colors.primary : colors.gray}
        />
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionTitle}>{t('offerSpecialPackages')}</Text>
        <Switch
          value={schedule.customerPreferences.offerSpecialPackages}
          onValueChange={(value) =>
            setSchedule(prev => ({
              ...prev,
              customerPreferences: {
                ...prev.customerPreferences,
                offerSpecialPackages: value,
              },
            }))
          }
          trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
          thumbColor={schedule.customerPreferences.offerSpecialPackages ? colors.primary : colors.gray}
        />
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ramadanSchedule')}</Text>
        <TouchableOpacity onPress={handleSaveSchedule} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.saveText}>{t('save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Ramadan Dates Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Ionicons name="calendar" size={24} color={colors.secondary} />
            <Text style={styles.infoTitle}>{t('ramadan2024')}</Text>
          </View>
          <Text style={styles.infoText}>
            {t('ramadanDates', {
              start: format(parseISO(ramadanDates.start), 'dd MMM yyyy', { locale }),
              end: format(parseISO(ramadanDates.end), 'dd MMM yyyy', { locale }),
            })}
          </Text>
        </View>

        {/* Enable/Disable Ramadan Schedule */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="moon" size={24} color={colors.secondary} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>{t('enableRamadanSchedule')}</Text>
                <Text style={styles.toggleDescription}>{t('adaptScheduleForFasting')}</Text>
              </View>
            </View>
            <Switch
              value={schedule.enabled}
              onValueChange={(enabled) => setSchedule(prev => ({ ...prev, enabled }))}
              trackColor={{ false: colors.lightGray, true: colors.lightSecondary }}
              thumbColor={schedule.enabled ? colors.secondary : colors.gray}
            />
          </View>
        </View>

        {schedule.enabled && (
          <>
            {renderWorkingHoursSection()}
            {renderBreaksSection()}
            {renderServiceAdjustments()}
            {renderCustomerPreferences()}

            {/* Staff Considerations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('staffConsiderations')}</Text>

              <View style={styles.optionRow}>
                <Text style={styles.optionTitle}>{t('flexibleBreaks')}</Text>
                <Switch
                  value={schedule.staffConsiderations.flexibleBreaks}
                  onValueChange={(value) =>
                    setSchedule(prev => ({
                      ...prev,
                      staffConsiderations: {
                        ...prev.staffConsiderations,
                        flexibleBreaks: value,
                      },
                    }))
                  }
                  trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                  thumbColor={schedule.staffConsiderations.flexibleBreaks ? colors.primary : colors.gray}
                />
              </View>

              <View style={styles.optionRow}>
                <Text style={styles.optionTitle}>{t('energyManagement')}</Text>
                <Switch
                  value={schedule.staffConsiderations.energyManagement}
                  onValueChange={(value) =>
                    setSchedule(prev => ({
                      ...prev,
                      staffConsiderations: {
                        ...prev.staffConsiderations,
                        energyManagement: value,
                      },
                    }))
                  }
                  trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                  thumbColor={schedule.staffConsiderations.energyManagement ? colors.primary : colors.gray}
                />
              </View>
            </View>

            {/* Ramadan Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>{t('ramadanTips')}</Text>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.tipText}>{t('ramadanTip1')}</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.tipText}>{t('ramadanTip2')}</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.tipText}>{t('ramadanTip3')}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <TouchTimeSelector
        visible={timeSelectorVisible}
        onClose={() => setTimeSelectorVisible(false)}
        onTimeSelect={handleTimeSelect}
        title={t('selectTime')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  infoSection: {
    backgroundColor: colors.lightSecondary,
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
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
  sessionContainer: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  sessionSubtitle: {
    fontSize: 12,
    color: colors.gray,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  timeSeparator: {
    fontSize: 18,
    color: colors.gray,
  },
  totalHours: {
    backgroundColor: colors.lightPrimary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  totalHoursLabel: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
  },
  totalHoursValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  breakItem: {
    marginBottom: 20,
  },
  breakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  breakSubtitle: {
    fontSize: 12,
    color: colors.gray,
  },
  breakDuration: {
    marginTop: 12,
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
    paddingVertical: 8,
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
  durationText: {
    fontSize: 14,
    color: colors.primary,
  },
  selectedDurationText: {
    color: colors.white,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  timeSelectorLabel: {
    fontSize: 14,
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
  adjustmentItem: {
    marginBottom: 16,
  },
  adjustmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adjustmentTitle: {
    fontSize: 16,
    color: colors.text,
  },
  percentageSelector: {
    marginTop: 12,
  },
  percentageLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  percentageButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  percentageButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  selectedPercentage: {
    backgroundColor: colors.primary,
  },
  percentageText: {
    fontSize: 14,
    color: colors.primary,
  },
  selectedPercentageText: {
    color: colors.white,
  },
  adjustmentDescription: {
    fontSize: 12,
    color: colors.gray,
    fontStyle: 'italic',
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
  tipsSection: {
    backgroundColor: colors.lightSuccess,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
});