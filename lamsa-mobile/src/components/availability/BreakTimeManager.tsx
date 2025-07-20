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
  TextInput,
  I18nManager,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import {
  format,
  addMinutes,
  differenceInMinutes,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../constants/colors';
import { API_URL } from '../../config';
import TouchTimeSelector from './TouchTimeSelector';

interface BreakTime {
  id: string;
  type: 'prayer' | 'meal' | 'rest' | 'personal';
  name: string;
  name_ar: string;
  startTime: string; // HH:mm format
  endTime: string;
  duration: number; // in minutes
  isAutomatic: boolean;
  isRecurring: boolean;
  recurringDays: number[]; // 0-6 (Sunday-Saturday)
  prayerType?: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah';
  isEnabled: boolean;
  allowBookings: boolean;
  bufferBefore: number; // minutes before break
  bufferAfter: number; // minutes after break
  location?: {
    latitude: number;
    longitude: number;
  };
  ramadanAdjustments?: {
    enabled: boolean;
    modifiedDuration: number;
  };
}

interface BreakTimeManagerProps {
  visible: boolean;
  onClose: () => void;
  onBreakTimesUpdate: (breakTimes: BreakTime[]) => void;
  currentBreakTimes: BreakTime[];
  selectedDate?: Date;
}

interface PrayerTime {
  name: string;
  name_ar: string;
  time: string;
  type: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
}

export default function BreakTimeManager({
  visible,
  onClose,
  onBreakTimesUpdate,
  currentBreakTimes,
  selectedDate = new Date(),
}: BreakTimeManagerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;

  const [breakTimes, setBreakTimes] = useState<BreakTime[]>(currentBreakTimes);
  const [loading, setLoading] = useState(false);
  const [editingBreak, setEditingBreak] = useState<BreakTime | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [timeSelectorVisible, setTimeSelectorVisible] = useState(false);
  const [timeSelectorType, setTimeSelectorType] = useState<'start' | 'end'>('start');
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [locationPermission, setLocationPermission] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    type: 'rest' as BreakTime['type'],
    startTime: '12:00',
    endTime: '12:30',
    duration: 30,
    isAutomatic: false,
    isRecurring: true,
    recurringDays: [1, 2, 3, 4, 5, 6] as number[], // Mon-Sat
    isEnabled: true,
    allowBookings: false,
    bufferBefore: 5,
    bufferAfter: 5,
    prayerType: undefined as BreakTime['prayerType'],
  });

  useEffect(() => {
    if (visible) {
      loadPrayerTimes();
      requestLocationPermission();
    }
  }, [visible]);

  const loadPrayerTimes = async () => {
    try {
      // In production, this would calculate prayer times based on location and date
      // For now, using approximate Jordan prayer times
      const jordanPrayerTimes: PrayerTime[] = [
        {
          name: 'Fajr',
          name_ar: 'الفجر',
          time: '05:30',
          type: 'fajr',
        },
        {
          name: 'Dhuhr',
          name_ar: 'الظهر',
          time: '12:30',
          type: 'dhuhr',
        },
        {
          name: 'Asr',
          name_ar: 'العصر',
          time: '15:30',
          type: 'asr',
        },
        {
          name: 'Maghrib',
          name_ar: 'المغرب',
          time: '18:00',
          type: 'maghrib',
        },
        {
          name: 'Isha',
          name_ar: 'العشاء',
          time: '19:30',
          type: 'isha',
        },
      ];

      setPrayerTimes(jordanPrayerTimes);
    } catch (error) {
      console.error('Error loading prayer times:', error);
    }
  };

  const requestLocationPermission = async () => {
    // In production, request location permission for accurate prayer times
    setLocationPermission(true);
  };

  const calculatePrayerTimeBreak = (prayerType: PrayerTime['type']): Partial<BreakTime> => {
    const prayer = prayerTimes.find(p => p.type === prayerType);
    if (!prayer) return {};

    const startTime = parseISO(`2000-01-01T${prayer.time}:00`);
    const endTime = addMinutes(startTime, 15); // 15 minutes default prayer duration

    return {
      type: 'prayer',
      name: prayer.name,
      name_ar: prayer.name_ar,
      startTime: format(startTime, 'HH:mm'),
      endTime: format(endTime, 'HH:mm'),
      duration: 15,
      isAutomatic: true,
      prayerType: prayer.type,
      bufferBefore: 5,
      bufferAfter: 5,
      allowBookings: false,
    };
  };

  const handleAddPrayerBreak = (prayerType: PrayerTime['type']) => {
    const prayerBreak = calculatePrayerTimeBreak(prayerType);
    const prayer = prayerTimes.find(p => p.type === prayerType);
    
    if (!prayer) return;

    setFormData({
      ...formData,
      ...prayerBreak,
      type: 'prayer',
      isAutomatic: true,
      isRecurring: true,
      recurringDays: [1, 2, 3, 4, 5, 6], // All working days
    });
    setEditingBreak(null);
    setModalVisible(true);
  };

  const handleEditBreak = (breakTime: BreakTime) => {
    setEditingBreak(breakTime);
    setFormData({
      name: breakTime.name,
      name_ar: breakTime.name_ar,
      type: breakTime.type,
      startTime: breakTime.startTime,
      endTime: breakTime.endTime,
      duration: breakTime.duration,
      isAutomatic: breakTime.isAutomatic,
      isRecurring: breakTime.isRecurring,
      recurringDays: breakTime.recurringDays,
      isEnabled: breakTime.isEnabled,
      allowBookings: breakTime.allowBookings,
      bufferBefore: breakTime.bufferBefore,
      bufferAfter: breakTime.bufferAfter,
      prayerType: breakTime.prayerType,
    });
    setModalVisible(true);
  };

  const handleSaveBreak = async () => {
    if (!formData.name || !formData.name_ar) {
      Alert.alert(t('error'), t('pleaseEnterBreakName'));
      return;
    }

    const newBreak: BreakTime = {
      id: editingBreak?.id || Date.now().toString(),
      ...formData,
      location: locationPermission ? {
        latitude: 31.9539, // Amman coordinates
        longitude: 35.9106,
      } : undefined,
      ramadanAdjustments: {
        enabled: formData.type === 'prayer',
        modifiedDuration: formData.type === 'prayer' ? formData.duration + 10 : formData.duration,
      },
    };

    let updatedBreakTimes;
    if (editingBreak) {
      updatedBreakTimes = breakTimes.map(bt => 
        bt.id === editingBreak.id ? newBreak : bt
      );
    } else {
      updatedBreakTimes = [...breakTimes, newBreak];
    }

    try {
      setLoading(true);
      await saveBreakTimes(updatedBreakTimes);
      setBreakTimes(updatedBreakTimes);
      onBreakTimesUpdate(updatedBreakTimes);
      setModalVisible(false);
    } catch (error) {
      Alert.alert(t('error'), t('failedToSaveBreak'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBreak = async (breakId: string) => {
    Alert.alert(
      t('confirmDelete'),
      t('deleteBreakConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const updatedBreakTimes = breakTimes.filter(bt => bt.id !== breakId);
            setBreakTimes(updatedBreakTimes);
            onBreakTimesUpdate(updatedBreakTimes);
            await saveBreakTimes(updatedBreakTimes);
          },
        },
      ]
    );
  };

  const saveBreakTimes = async (breakTimesToSave: BreakTime[]) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');

      const response = await fetch(
        `${API_URL}/api/providers/${providerId}/break-times`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ breakTimes: breakTimesToSave }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save break times');
      }
    } catch (error) {
      console.error('Error saving break times:', error);
      throw error;
    }
  };

  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = parseISO(`2000-01-01T${startTime}:00`);
    const end = parseISO(`2000-01-01T${endTime}:00`);
    return differenceInMinutes(end, start);
  };

  const handleTimeChange = (time: Date, type: 'start' | 'end') => {
    const timeStr = format(time, 'HH:mm');
    
    if (type === 'start') {
      const newDuration = calculateDuration(timeStr, formData.endTime);
      setFormData(prev => ({
        ...prev,
        startTime: timeStr,
        duration: newDuration > 0 ? newDuration : 15,
      }));
    } else {
      const newDuration = calculateDuration(formData.startTime, timeStr);
      setFormData(prev => ({
        ...prev,
        endTime: timeStr,
        duration: newDuration > 0 ? newDuration : 15,
      }));
    }
  };

  const toggleDayRecurrence = (dayIndex: number) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(dayIndex)
        ? prev.recurringDays.filter(d => d !== dayIndex)
        : [...prev.recurringDays, dayIndex].sort(),
    }));
  };

  const getBreakTypeIcon = (type: BreakTime['type']) => {
    switch (type) {
      case 'prayer':
        return 'moon';
      case 'meal':
        return 'restaurant';
      case 'rest':
        return 'bed';
      case 'personal':
        return 'person';
      default:
        return 'time';
    }
  };

  const getBreakTypeColor = (type: BreakTime['type']) => {
    switch (type) {
      case 'prayer':
        return colors.secondary;
      case 'meal':
        return colors.warning;
      case 'rest':
        return colors.success;
      case 'personal':
        return colors.primary;
      default:
        return colors.gray;
    }
  };

  const renderBreakItem = (breakTime: BreakTime) => (
    <View key={breakTime.id} style={styles.breakItem}>
      <View style={styles.breakHeader}>
        <View style={styles.breakInfo}>
          <View style={[
            styles.breakTypeIcon,
            { backgroundColor: getBreakTypeColor(breakTime.type) }
          ]}>
            <Ionicons
              name={getBreakTypeIcon(breakTime.type) as any}
              size={20}
              color={colors.white}
            />
          </View>
          <View style={styles.breakDetails}>
            <Text style={styles.breakName}>
              {i18n.language === 'ar' ? breakTime.name_ar : breakTime.name}
            </Text>
            <Text style={styles.breakTime}>
              {breakTime.startTime} - {breakTime.endTime} ({breakTime.duration}min)
            </Text>
          </View>
        </View>
        
        <View style={styles.breakActions}>
          <Switch
            value={breakTime.isEnabled}
            onValueChange={(enabled) => {
              const updatedBreakTimes = breakTimes.map(bt =>
                bt.id === breakTime.id ? { ...bt, isEnabled: enabled } : bt
              );
              setBreakTimes(updatedBreakTimes);
              onBreakTimesUpdate(updatedBreakTimes);
            }}
            trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
            thumbColor={breakTime.isEnabled ? colors.primary : colors.gray}
          />
          
          <TouchableOpacity
            onPress={() => handleEditBreak(breakTime)}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleDeleteBreak(breakTime.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {breakTime.isAutomatic && (
        <View style={styles.automaticBadge}>
          <Ionicons name="refresh" size={12} color={colors.secondary} />
          <Text style={styles.automaticText}>{t('automatic')}</Text>
        </View>
      )}

      <View style={styles.breakFeatures}>
        {breakTime.bufferBefore > 0 && (
          <Text style={styles.featureText}>
            {t('bufferBefore')}: {breakTime.bufferBefore}min
          </Text>
        )}
        {breakTime.bufferAfter > 0 && (
          <Text style={styles.featureText}>
            {t('bufferAfter')}: {breakTime.bufferAfter}min
          </Text>
        )}
        {breakTime.allowBookings && (
          <Text style={styles.featureText}>{t('allowBookings')}</Text>
        )}
      </View>
    </View>
  );

  const renderBreakForm = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editingBreak ? t('editBreak') : t('addBreak')}
          </Text>
          <TouchableOpacity onPress={handleSaveBreak} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.saveText}>{t('save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Break Type */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('breakType')}</Text>
            <View style={styles.typeSelector}>
              {[
                { key: 'prayer', label: t('prayer'), icon: 'moon' },
                { key: 'meal', label: t('meal'), icon: 'restaurant' },
                { key: 'rest', label: t('rest'), icon: 'bed' },
                { key: 'personal', label: t('personal'), icon: 'person' },
              ].map(type => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeButton,
                    formData.type === type.key && styles.selectedType,
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
                    formData.type === type.key && styles.selectedTypeText,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Name */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('breakName')}</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder={t('enterNameEnglish')}
              placeholderTextColor={colors.gray}
            />
            <TextInput
              style={[styles.textInput, isRTL && styles.rtlText]}
              value={formData.name_ar}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name_ar: text }))}
              placeholder={t('enterNameArabic')}
              placeholderTextColor={colors.gray}
            />
          </View>

          {/* Time Range */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('timeRange')}</Text>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => {
                  setTimeSelectorType('start');
                  setTimeSelectorVisible(true);
                }}
              >
                <Text style={styles.timeButtonText}>{formData.startTime}</Text>
                <Text style={styles.timeLabel}>{t('start')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => {
                  setTimeSelectorType('end');
                  setTimeSelectorVisible(true);
                }}
              >
                <Text style={styles.timeButtonText}>{formData.endTime}</Text>
                <Text style={styles.timeLabel}>{t('end')}</Text>
              </TouchableOpacity>
              
              <View style={styles.durationDisplay}>
                <Text style={styles.durationText}>{formData.duration}min</Text>
              </View>
            </View>
          </View>

          {/* Recurring Days */}
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
            
            {formData.isRecurring && (
              <View style={styles.daysSelector}>
                {[
                  { index: 0, label: t('sun') },
                  { index: 1, label: t('mon') },
                  { index: 2, label: t('tue') },
                  { index: 3, label: t('wed') },
                  { index: 4, label: t('thu') },
                  { index: 5, label: t('fri') },
                  { index: 6, label: t('sat') },
                ].map(day => (
                  <TouchableOpacity
                    key={day.index}
                    style={[
                      styles.dayButton,
                      formData.recurringDays.includes(day.index) && styles.selectedDay,
                    ]}
                    onPress={() => toggleDayRecurrence(day.index)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      formData.recurringDays.includes(day.index) && styles.selectedDayText,
                    ]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Buffer Times */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('bufferTimes')}</Text>
            <View style={styles.bufferRow}>
              <View style={styles.bufferInput}>
                <Text style={styles.bufferLabel}>{t('before')}</Text>
                <TextInput
                  style={styles.numberInput}
                  value={formData.bufferBefore.toString()}
                  onChangeText={(text) => setFormData(prev => ({ 
                    ...prev, 
                    bufferBefore: parseInt(text) || 0 
                  }))}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <Text style={styles.bufferUnit}>min</Text>
              </View>
              
              <View style={styles.bufferInput}>
                <Text style={styles.bufferLabel}>{t('after')}</Text>
                <TextInput
                  style={styles.numberInput}
                  value={formData.bufferAfter.toString()}
                  onChangeText={(text) => setFormData(prev => ({ 
                    ...prev, 
                    bufferAfter: parseInt(text) || 0 
                  }))}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <Text style={styles.bufferUnit}>min</Text>
              </View>
            </View>
          </View>

          {/* Options */}
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
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('automatic')}</Text>
              <Switch
                value={formData.isAutomatic}
                onValueChange={(value) => setFormData(prev => ({ ...prev, isAutomatic: value }))}
                trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                thumbColor={formData.isAutomatic ? colors.primary : colors.gray}
              />
            </View>
          </View>
        </ScrollView>
      </View>

      <TouchTimeSelector
        visible={timeSelectorVisible}
        onClose={() => setTimeSelectorVisible(false)}
        onTimeSelect={(time) => {
          handleTimeChange(time, timeSelectorType);
          setTimeSelectorVisible(false);
        }}
        title={timeSelectorType === 'start' ? t('selectStartTime') : t('selectEndTime')}
        allowPrayerTimes={formData.type === 'prayer'}
      />
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
          <Text style={styles.headerTitle}>{t('breakTimeManager')}</Text>
          <TouchableOpacity
            onPress={() => {
              setEditingBreak(null);
              setFormData({
                name: '',
                name_ar: '',
                type: 'rest',
                startTime: '12:00',
                endTime: '12:30',
                duration: 30,
                isAutomatic: false,
                isRecurring: true,
                recurringDays: [1, 2, 3, 4, 5, 6],
                isEnabled: true,
                allowBookings: false,
                bufferBefore: 5,
                bufferAfter: 5,
                prayerType: undefined,
              });
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Prayer Time Quick Add */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('prayerTimes')}</Text>
            <View style={styles.prayerGrid}>
              {prayerTimes.map((prayer, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.prayerButton}
                  onPress={() => handleAddPrayerBreak(prayer.type)}
                >
                  <Ionicons name="moon" size={20} color={colors.secondary} />
                  <Text style={styles.prayerName}>
                    {i18n.language === 'ar' ? prayer.name_ar : prayer.name}
                  </Text>
                  <Text style={styles.prayerTime}>{prayer.time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Current Break Times */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('currentBreaks')}</Text>
            {breakTimes.length > 0 ? (
              <View style={styles.breaksList}>
                {breakTimes.map(renderBreakItem)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color={colors.gray} />
                <Text style={styles.emptyText}>{t('noBreaksConfigured')}</Text>
                <Text style={styles.emptySubtext}>{t('addBreakToGetStarted')}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {renderBreakForm()}
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  prayerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  prayerButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  prayerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  prayerTime: {
    fontSize: 16,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  breaksList: {
    gap: 12,
  },
  breakItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  breakDetails: {
    flex: 1,
  },
  breakName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  breakTime: {
    fontSize: 14,
    color: colors.gray,
  },
  breakActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  automaticBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.lightSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  automaticText: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  breakFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureText: {
    fontSize: 12,
    color: colors.gray,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
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
  saveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  typeSelector: {
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
  selectedType: {
    backgroundColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.primary,
  },
  selectedTypeText: {
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
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
  },
  durationDisplay: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.lightPrimary,
    borderRadius: 8,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text,
  },
  daysSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: colors.white,
  },
  bufferRow: {
    flexDirection: 'row',
    gap: 16,
  },
  bufferInput: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  bufferLabel: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '500',
  },
  numberInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    textAlign: 'center',
    minWidth: 60,
  },
  bufferUnit: {
    fontSize: 12,
    color: colors.gray,
  },
});